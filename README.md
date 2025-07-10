# Voice Transcription System

A **full-stack voice transcription web application** that allows users to record audio or upload video/audio files, perform speech-to-text conversion, identify multiple speakers (speaker diarization), and view live transcriptions in plain text format. It also provides meeting summaries such as total meeting duration and number of speakers. Users can download the final transcription as a text file.

---

## Features

✅ **Record or Upload Files** — Supports `.wav`, `.mp3`, `.mp4`, `.avi`, `.mov`.  
✅ **Speaker Diarization** — Identifies different speakers (Speaker 1, Speaker 2, etc.).  
✅ **Live Transcription View** — Displays plain text transcription with speaker labels.  
✅ **Meeting Summary** — Shows total meeting time (seconds) and number of speakers.  
✅ **Download Transcript** — Export the entire transcription as a `.txt` file.  
✅ **Fully Integrated with AssemblyAI** — Powerful speech-to-text via AssemblyAI's API.  
✅ **FFmpeg Support** — Automatically extracts audio from video files.

---

## Tech Stack

- **Frontend**: React.js, Axios, HTML/CSS
- **Backend**: Node.js, Express.js, Multer, Axios, Fluent-ffmpeg
- **Speech-to-Text**: [AssemblyAI API](https://www.assemblyai.com/)
- **Audio Processing**: FFmpeg (for extracting audio from video files)


---

## Installation & Setup Guide

### 1. Clone the repository

git clone https://github.com/yourusername/voice-transcription-system.git

cd voice-transcription-system


### 2. Create a .env file in the /server directory:

REACT_APP_API_KEY=your_assemblyai_api_key_here

### 3. Usage

#### Start backend:

node server.js

#### Start frontend:

npm start

#### Open your browser:

http://localhost:3000

### Important Notes

Must have FFmpeg installed and path set properly in backend.

Requires valid AssemblyAI API Key.

Temporary uploaded files are automatically cleaned up after transcription.

<img width="1919" height="1006" alt="image" src="https://github.com/user-attachments/assets/89c17610-9d22-4b87-a99f-51fa3b85a666" />
