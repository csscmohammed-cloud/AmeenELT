const fs = require('fs');
let content = fs.readFileSync('src/pages/MaterialView.tsx', 'utf8');

const startIdx = content.indexOf('  const renderTeacherPreview = () => {');
if (startIdx !== -1) {
  const endIdx = content.indexOf('  const renderQuiz = () => {');
  content = content.substring(0, startIdx) + content.substring(endIdx);
  fs.writeFileSync('src/pages/MaterialView.tsx', content);
}
