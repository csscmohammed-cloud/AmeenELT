import fs from 'fs';

let content = fs.readFileSync('src/components/AudioRecorder.tsx', 'utf8');

// 1. Add isSpeaking state
content = content.replace(
  "const [toastMsg, setToastMsg] = useState<string | null>(null);",
  "const [toastMsg, setToastMsg] = useState<string | null>(null);\n  const [isSpeaking, setIsSpeaking] = useState(false);"
);

// 2. Add stopSpeaking function and modify speakPassage
const speakLogic = `  const speakPassage = () => {
    if (!passage) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(passage);
    utterance.lang = 'en-US';
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };`;

content = content.replace(
  /const speakPassage = \(\) => \{[\s\S]*?window\.speechSynthesis\.speak\(utterance\);\n  \};/,
  speakLogic
);

// 3. Import Pause / Stop icon from lucide-react if needed. Let's just import Square/Circle/StopCircle if not already imported. Let's check what's imported first.
