import fs from 'fs';

let content = fs.readFileSync('src/components/AudioRecorder.tsx', 'utf8');
content = content.replace(
  "const [toastMsg, setToastMsg] = useState<string | null>(null);",
  "const [toastMsg, setToastMsg] = useState<string | null>(null);\n  const [isSpeaking, setIsSpeaking] = useState(false);"
);
fs.writeFileSync('src/components/AudioRecorder.tsx', content);
