import fs from 'fs';

let content = fs.readFileSync('src/components/AudioRecorder.tsx', 'utf8');
content = content.replace(
  "return (\n    \n      {toastMsg && (",
  "return (\n    <>\n      {toastMsg && ("
);
content = content.replace(
  "  );\n}",
  "    </>\n  );\n}"
);

fs.writeFileSync('src/components/AudioRecorder.tsx', content);
console.log('Fixed return');
