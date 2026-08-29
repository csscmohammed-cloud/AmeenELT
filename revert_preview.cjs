const fs = require('fs');
let content = fs.readFileSync('src/pages/MaterialView.tsx', 'utf8');

// We will just replace the {material.type === 'quiz' && (previewMode && profile?.role === 'teacher' ? renderTeacherPreview() : renderQuiz())}
// back to {material.type === 'quiz' && renderQuiz()}
content = content.replace(
  "{material.type === 'quiz' && (previewMode && profile?.role === 'teacher' ? renderTeacherPreview() : renderQuiz())}",
  "{material.type === 'quiz' && renderQuiz()}"
);

fs.writeFileSync('src/pages/MaterialView.tsx', content);
