import fs from 'fs';

let content = fs.readFileSync('src/components/AudioRecorder.tsx', 'utf8');

// 1. Add toastMsg state
content = content.replace(
  "const [isTranscribing, setIsTranscribing] = useState(false);",
  "const [isTranscribing, setIsTranscribing] = useState(false);\n  const [toastMsg, setToastMsg] = useState<string | null>(null);\n"
);

// 2. Add Pre-evaluation check inside processAudio
const preEval = `
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const arrayBuffer = await blob.arrayBuffer();
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
      const channelData = audioBuffer.getChannelData(0);
      let sum = 0;
      for (let i = 0; i < channelData.length; i++) {
        sum += channelData[i] * channelData[i];
      }
      const rms = Math.sqrt(sum / channelData.length);
      const db = rms > 0 ? 20 * Math.log10(rms) : -100;
      
      if (db < -40) {
        setIsTranscribing(false);
        setToastMsg('Voice too quiet, please try recording again.');
        setTimeout(() => setToastMsg(null), 4000);
        return;
      }
`;

content = content.replace(
  "const processAudio = async (blob: Blob) => {\n    setIsTranscribing(true);\n    try {\n      const reader = new FileReader();",
  "const processAudio = async (blob: Blob) => {\n    setIsTranscribing(true);\n    try {\n" + preEval + "\n      const reader = new FileReader();"
);

// 3. Add Toast UI component at the top of the return block
const toastUI = `
      {toastMsg && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-6 py-3 rounded-xl shadow-2xl animate-in fade-in slide-in-from-top-4">
          {toastMsg}
        </div>
      )}
`;

content = content.replace(
  '<div className="bg-slate-50 dark:bg-slate-800/50 p-8 rounded-2xl border-2 border-slate-200 dark:border-slate-700 shadow-sm space-y-8 max-w-2xl mx-auto">',
  toastUI + '\n    <div className="bg-slate-50 dark:bg-slate-800/50 p-8 rounded-2xl border-2 border-slate-200 dark:border-slate-700 shadow-sm space-y-8 max-w-2xl mx-auto">'
);

fs.writeFileSync('src/components/AudioRecorder.tsx', content);
console.log('Patch applied successfully.');
