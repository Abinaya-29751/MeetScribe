import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import {
  Clock,
  File,
  FileText,
  Headphones,
  Mic,
  Square,
  Trash2,
  User,
  Users
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import './index.css';

// Types
interface TranscriptionSegment {
  id: string;
  text: string;
  timestamp: number;
  speaker?: string;
  confidence?: number;
}

interface MeetingSummary {
  keyPoints: string[];
  actionItems: string[];
  participants: string[];
  duration: number;
}

function App() {
  // State
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [segments, setSegments] = useState<TranscriptionSegment[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [summary, setSummary] = useState<MeetingSummary>({
    keyPoints: [],
    actionItems: [],
    participants: [],
    duration: 0
  });
  const [startTime, setStartTime] = useState<number>(0);
  const [diarizationResult, setDiarizationResult] = useState<{ text: string, speakers: number, duration: number } | null>(null);
  const [speakers, setSpeakers] = useState(0);
  const [duration, setDuration] = useState(0);


  // Refs
  const recognitionRef = useRef<any>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    if (!('webkitSpeechRecognition' in window)) {
      alert('Speech recognition not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    recognitionRef.current = new (window as any).webkitSpeechRecognition();
    const recognition = recognitionRef.current;

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      setTranscript(finalTranscript + interimTranscript);

      if (finalTranscript) {
        const newSegment: TranscriptionSegment = {
          id: Date.now().toString(),
          text: finalTranscript.trim(),
          timestamp: Date.now(),
          speaker: `Speaker ${Math.floor(segments.length / 3) + 1}`,
          confidence: event.results[event.results.length - 1][0].confidence
        };
        setSegments(prev => [...prev, newSegment]);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      if (isListening) {
        recognition.start(); // Restart automatically
  }
    };

    return () => {
      if (recognition) {
        recognition.stop();
      }
    };
  }, [segments.length]);

  // Process segments for keywords and summary
  useEffect(() => {
    if (segments.length > 0) {
      const fullText = segments.map(s => s.text).join(' ');
      
      // Extract keywords
      const words = fullText.toLowerCase().split(/\W+/);
      const commonWords = ['the', 'is', 'at', 'which', 'on', 'and', 'a', 'to', 'are', 'as', 'was', 'will', 'be'];
      const wordFreq: { [key: string]: number } = {};
      
      words.forEach(word => {
        if (word.length > 3 && !commonWords.includes(word)) {
          wordFreq[word] = (wordFreq[word] || 0) + 1;
        }
      });
      
      const extractedKeywords = Object.entries(wordFreq)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 8)
        .map(([word]) => word);
      
      setKeywords(extractedKeywords);

      // Generate summary
      const sentences = fullText.split(/[.!?]+/);
      const actionWords = ['todo', 'action', 'follow up', 'next steps', 'assign', 'deadline', 'by next week'];
      const actionItems = sentences
        .filter(sentence => actionWords.some(word => sentence.toLowerCase().includes(word)))
        .slice(0, 5);

      const keyPoints = sentences
        .filter(sentence => sentence.length > 20)
        .slice(0, 3);

      const participants = Array.from(
  new Set(
    segments
      .map(s => s.speaker)
      .filter((speaker): speaker is string => typeof speaker === 'string')
  )
);

      setSummary({
        keyPoints,
        actionItems,
        participants,
        duration: Date.now() - startTime
      });
    }
  }, [segments, startTime]);

  // Speech Recognition Functions
  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      setStartTime(Date.now());
      recognitionRef.current.start();
      setIsListening(true);
    }
  };

  const stopListening = () => {
  if (recognitionRef.current && isListening) {
    setIsListening(false); // set false FIRST — immediately for onend check
    recognitionRef.current.stop(); // now stop safely
  }
};


const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('audio', file);

  try {
    const response = await fetch('http://localhost:5000/upload', {
      method: 'POST',
      body: formData
    });

    const data = await response.json();
    console.log('Speaker Diarization Result:', data);

    // Set extracted results
    setDiarizationResult({
      text: data.text,
      speakers: data.speakers,
      duration: data.duration
    });

    // Update Live Transcription screen also:
    setTranscript(data.text);
    setSpeakers(data.speakers);
    setDuration(data.duration);

  } catch (error) {
    console.error('Error uploading file:', error);
  }
};

 const clearAll = () => {
  setTranscript('');
  setSegments([]);
  setKeywords([]);
  setSummary({
    keyPoints: [],
    actionItems: [],
    participants: [],
    duration: 0
  });
  setDiarizationResult(null);
  setSpeakers(0);
  setDuration(0);
};


  // Export Functions
  
  const exportToPDF = () => {
  if (!diarizationResult && segments.length === 0) {
    alert('No transcription data to export');
    return;
  }

  const doc = new jsPDF();
  let yPosition = 20;

  // Title
  doc.setFontSize(16);
  doc.text('Meeting Transcription', 20, yPosition);
  yPosition += 20;

  // Summary (only for live transcription)
  if (!diarizationResult) {
    doc.setFontSize(12);
    doc.text('Key Points:', 20, yPosition);
    yPosition += 10;

    summary.keyPoints.forEach(point => {
      const lines: string[] = doc.splitTextToSize(`• ${point}`, 170) as string[];
      lines.forEach((line: string) => {
        doc.text(line, 25, yPosition);
        yPosition += 7;
      });
    });

    yPosition += 10;
    doc.text('Action Items:', 20, yPosition);
    yPosition += 10;

    summary.actionItems.forEach(item => {
      const lines: string[] = doc.splitTextToSize(`• ${item}`, 170) as string[];
      lines.forEach((line: string) => {
        doc.text(line, 25, yPosition);
        yPosition += 7;
      });
    });

    yPosition += 20;
  }

  // Transcription
  doc.text('Full Transcription:', 20, yPosition);
  yPosition += 15;

  if (diarizationResult) {
    const lines: string[] = doc.splitTextToSize(diarizationResult.text, 170) as string[];
    lines.forEach((line: string) => {
      if (yPosition > 280) {
        doc.addPage();
        yPosition = 20;
      }
      doc.text(line, 20, yPosition);
      yPosition += 7;
    });
  } else {
    segments.forEach(segment => {
      const timestamp = new Date(segment.timestamp).toLocaleTimeString();
      const speaker = segment.speaker || 'Unknown';
      const text = `[${timestamp}] ${speaker}: ${segment.text}`;

      const lines: string[] = doc.splitTextToSize(text, 170) as string[];
      lines.forEach((line: string) => {
        if (yPosition > 280) {
          doc.addPage();
          yPosition = 20;
        }
        doc.text(line, 20, yPosition);
        yPosition += 7;
      });
      yPosition += 5;
    });
  }

  doc.save('meeting-transcription.pdf');
};


  const exportToTXT = () => {
  if (!diarizationResult && segments.length === 0) {
    alert('No transcription data to export');
    return;
  }

  let content = 'MEETING TRANSCRIPTION\n';
  content += '=====================\n\n';

  // Summary (only for live transcription)
  if (!diarizationResult) {
    content += 'KEY POINTS:\n';
    content += '-----------\n';
    summary.keyPoints.forEach(point => {
      content += `• ${point}\n`;
    });

    content += '\nACTION ITEMS:\n';
    content += '-------------\n';
    summary.actionItems.forEach(item => {
      content += `• ${item}\n`;
    });

    content += '\n';
  }

  content += 'FULL TRANSCRIPTION:\n';
  content += '-------------------\n\n';

  if (diarizationResult) {
    content += diarizationResult.text;
  } else {
    segments.forEach(segment => {
      const timestamp = new Date(segment.timestamp).toLocaleTimeString();
      const speaker = segment.speaker || 'Unknown';
      content += `[${timestamp}] ${speaker}: ${segment.text}\n\n`;
    });
  }

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  saveAs(blob, 'meeting-transcription.txt');
};

  // Helper function to highlight keywords
  const highlightKeywords = (text: string) => {
    let highlightedText = text;
    keywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      highlightedText = highlightedText.replace(
        regex,
        `<span class="keyword-highlight">${keyword}</span>`
      );
    });
    return highlightedText;
  };

 return (
  <div className="min-h-screen bg-gradient-to-r from-blue-50 to-gray-100 py-10 px-4 flex flex-col items-center">
    {/* Header */}
    <header className="bg-white shadow-lg rounded-xl w-full max-w-5xl p-6 mb-10 text-center">
      <div className="flex justify-center items-center gap-3 mb-4">
        <Headphones className="w-10 h-10 text-blue-600" />
        <h1 className="text-4xl font-bold text-gray-800">Voice Transcription System</h1>
      </div>
      <p className="text-gray-500 text-lg">
        Record meetings, generate transcripts, and create summaries automatically
      </p>
    </header>

    {/* Main Grid */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 w-full max-w-6xl">
      {/* Left Column - Controls */}
      <div className="bg-white rounded-xl shadow-md p-6 space-y-6">
        <div>
          <h2 className="text-xl font-semibold mb-4 text-gray-700">Controls</h2>
          <div className="flex items-center justify-center gap-2 mb-4">
            {isListening ? (
              <div className="flex items-center gap-2 text-red-600 font-medium">
                <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
                Recording...
              </div>
            ) : (
              <span className="text-gray-500">Ready to record</span>
            )}
          </div>

          <button
            onClick={isListening ? stopListening : startListening}
            className={`w-full py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition duration-300 ${
              isListening
                ? 'bg-red-500 hover:bg-red-600 text-white'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
          >
            {isListening ? <><Square size={18} />Stop Recording</> : <><Mic size={18} />Start Recording</>}
          </button>

          {segments.length > 0 && (
            <button
              onClick={clearAll}
              className="w-full mt-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg flex items-center justify-center gap-2 transition"
            >
              <Trash2 size={16} /> Clear All
            </button>
          )}
          <div className="mt-4">
          <label className="block text-gray-700 mb-2 font-medium">Upload Audio File (for Speaker Diarization)</label>
            <input
              type="file"
              accept="audio/*"
              onChange={handleFileUpload}
              className="w-full text-gray-600 bg-gray-50 border rounded p-2"
            />{/* Show backend result below upload */}
            </div>
        </div>

        {/* Export */}
        <div>
          <h2 className="text-xl font-semibold mb-4 text-gray-700">Export Options</h2>
          <div className="space-y-3">
            <button
              onClick={exportToPDF}
              disabled={!diarizationResult && segments.length === 0}
              className="w-full flex items-center gap-3 p-3 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 transition disabled:opacity-50"
            >
              <FileText /> Export as PDF
            </button>
            <button
              onClick={exportToTXT}
              disabled={!diarizationResult && segments.length === 0}
              className="w-full flex items-center gap-3 p-3 bg-green-100 text-green-800 rounded-lg hover:bg-green-200 transition disabled:opacity-50"
            >
              <File /> Export as Text
            </button>
          </div>
        </div>
      </div>

      {/* Middle Column - Live Transcription */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">Live Transcription</h2>
        {/* {transcript && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2 text-blue-600 font-medium">
              <Mic className="w-4 h-4" /> Current:
            </div>
            <p className="text-gray-800">{transcript}</p>
          </div>
          
        )} */}
        {diarizationResult ? (
        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-2 mb-2 text-blue-600 font-medium">
            <Mic className="w-4 h-4" /> Processed Diarization Output:
          </div>
          <pre className="text-gray-800 whitespace-pre-wrap">{diarizationResult.text}</pre>
        </div>
      ) : (
        transcript && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2 text-blue-600 font-medium">
              <Mic className="w-4 h-4" /> Live Recording:
            </div>
            <p className="text-gray-800">{transcript}</p>
          </div>
        )
      )}

        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
          {segments.map(segment => (
            <div key={segment.id} className="border-l-4 border-blue-200 pl-4 py-2 bg-gray-50 rounded">
              <div className="flex items-center gap-2 mb-1 text-sm text-gray-500">
                <Clock className="w-4 h-4" />
                {new Date(segment.timestamp).toLocaleTimeString()}
                {segment.speaker && (
                  <>
                    <User className="w-4 h-4" /> {segment.speaker}
                  </>
                )}
                {segment.confidence && (
                  <span className="ml-auto bg-gray-200 px-2 py-0.5 rounded text-xs">
                    {Math.round(segment.confidence * 100)}%
                  </span>
                )}
              </div>
              <p className="text-gray-700" dangerouslySetInnerHTML={{ __html: highlightKeywords(segment.text) }} />
            </div>
          ))}
        </div>
      </div>

      {/* Right Column - Summary */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">Meeting Summary</h2>
        <div className="space-y-4">
          <div className="flex justify-between text-sm text-gray-600">
            <div className="flex gap-1 items-center">
              <Clock className="w-4 h-4 text-blue-500" /> 
              {diarizationResult ? `${Math.round(diarizationResult.duration)} sec` : `${Math.round(summary.duration / 60000)} min`}
            </div>
            <div className="flex gap-1 items-center">
            <Users className="w-4 h-4 text-green-500" /> {diarizationResult ? diarizationResult.speakers : summary.participants.length} speakers
          </div>

          </div>

          {/* Key Points */}
          {summary.keyPoints.length > 0 && (
            <div>
              <h3 className="font-medium text-gray-700 mb-2">Key Points</h3>
              <ul className="list-disc list-inside text-gray-600 text-sm space-y-1">
                {summary.keyPoints.map((point, idx) => <li key={idx}>{point}</li>)}
              </ul>
            </div>
          )}

          {/* Action Items */}
          {summary.actionItems.length > 0 && (
            <div>
              <h3 className="font-medium text-gray-700 mb-2">Action Items</h3>
              <ul className="list-disc list-inside text-gray-600 text-sm space-y-1">
                {summary.actionItems.map((item, idx) => <li key={idx}>{item}</li>)}
              </ul>
            </div>
          )}

          {/* Participants */}
          {summary.participants.length > 0 && (
            <div>
              <h3 className="font-medium text-gray-700 mb-2">Participants</h3>
              <div className="flex flex-wrap gap-2">
                {summary.participants.map((p, idx) => (
                  <span key={idx} className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs">{p}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>

    {/* Keywords */}
    {keywords.length > 0 && (
      <div className="mt-8 bg-white rounded-xl shadow-md p-6 w-full max-w-5xl">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">Key Topics</h2>
        <div className="flex flex-wrap gap-2">
          {keywords.map((k, i) => (
            <span key={i} className="px-3 py-1 bg-blue-200 text-blue-800 rounded-full text-sm">{k}</span>
          ))}
        </div>
      </div>
    )}
  </div>
);

}

export default App;