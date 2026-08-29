import fs from 'fs';

let content = fs.readFileSync('src/components/AudioRecorder.tsx', 'utf8');

content = content.replace("import { Volume2, Mic, Square, Loader2, Play, RefreshCw, Activity }", "import { Volume2, Mic, Square, Loader2, Play, Pause, RefreshCw, Activity }");
content = content.replace("<Loader2 className=\"w-4 h-4\" />", "<Pause className=\"w-4 h-4\" />");

fs.writeFileSync('src/components/AudioRecorder.tsx', content);
