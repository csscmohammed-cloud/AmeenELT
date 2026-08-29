import fs from 'fs';

let content = fs.readFileSync('src/components/AudioRecorder.tsx', 'utf8');

// 1. Add isPaused state
content = content.replace(
  "const [isSpeaking, setIsSpeaking] = useState(false);",
  "const [isSpeaking, setIsSpeaking] = useState(false);\n  const [isPaused, setIsPaused] = useState(false);"
);

fs.writeFileSync('src/components/AudioRecorder.tsx', content);
