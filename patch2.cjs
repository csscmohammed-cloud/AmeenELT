const fs = require('fs');
let content = fs.readFileSync('src/pages/StudentDashboard.tsx', 'utf8');

content = content.replace('      {showAITutor && <AITutor />}\n    </div>', '      )}\n      {showAITutor && <AITutor />}\n    </div>');
fs.writeFileSync('src/pages/StudentDashboard.tsx', content);
