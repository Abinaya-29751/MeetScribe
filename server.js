const express = require('express');
const multer = require('multer');
const fs = require('fs');
const axios = require('axios');
const cors = require('cors');
const path = require('path');
const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath('D:/ffmpeg-7.1.1-essentials_build/bin/ffmpeg.exe');

const app = express();
const PORT = 5000;
require('dotenv').config();
const API_KEY = process.env.REACT_APP_API_KEY;

app.use(cors());
const upload = multer({ dest: 'uploads/' });

app.post('/upload', upload.single('audio'), async (req, res) => {
  const filePath = req.file.path;
  const fileExt = path.extname(req.file.originalname).toLowerCase();

  const uploadToAssemblyAI = async (file) => {
    const uploadResponse = await axios.post(
      'https://api.assemblyai.com/v2/upload',
      fs.createReadStream(file),
      { headers: { authorization: API_KEY } }
    );
    return uploadResponse.data.upload_url;
  };

  const getTranscript = async (transcriptId) => {
    const { data } = await axios.get(`https://api.assemblyai.com/v2/transcript/${transcriptId}`, {
      headers: { authorization: API_KEY }
    });
    return data;
  };

  try {
    let audioFilePath = filePath;

    // Extract audio if video
    if (fileExt === '.mp4' || fileExt === '.avi' || fileExt === '.mov') {
      audioFilePath = `${filePath}-extracted.wav`;
      await new Promise((resolve, reject) => {
        ffmpeg(filePath)
          .noVideo()
          .audioCodec('pcm_s16le')
          .format('wav')
          .save(audioFilePath)
          .on('end', resolve)
          .on('error', reject);
      });
    }

    const uploadUrl = await uploadToAssemblyAI(audioFilePath);

    const transcriptResponse = await axios.post(
      'https://api.assemblyai.com/v2/transcript',
      {
        audio_url: uploadUrl,
        speaker_labels: true
      },
      { headers: { authorization: API_KEY } }
    );

    const transcriptId = transcriptResponse.data.id;

    const checkStatus = async () => {
      const data = await getTranscript(transcriptId);

      if (data.status === 'completed') {
        const utterances = data.utterances;

        // Format as plain text speaker-wise
        let transcriptText = '';
        const speakerSet = new Set();
        let startTime = Number.MAX_VALUE;
        let endTime = 0;

        utterances.forEach(utt => {
          speakerSet.add(utt.speaker);
          startTime = Math.min(startTime, utt.start);
          endTime = Math.max(endTime, utt.end);
          transcriptText += `${utt.speaker}: ${utt.text}\n\n`;
        });

        const durationSec = Math.round((endTime - startTime) / 1000);
        const numSpeakers = speakerSet.size;

        res.json({
          text: transcriptText.trim(),
          speakers: numSpeakers,
          duration: durationSec
        });

        // Clean up
        fs.unlinkSync(filePath);
        if (fileExt !== '.wav' && fs.existsSync(audioFilePath)) fs.unlinkSync(audioFilePath);

      } else if (data.status === 'error') {
        res.status(500).send(data.error);
      } else {
        setTimeout(checkStatus, 3000);
      }
    };

    checkStatus();

  } catch (error) {
    console.error('Error processing file:', error);
    res.status(500).send('Internal server error');
  }
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
