const fs = require('fs');
let content = fs.readFileSync('src/pages/StudentDashboard.tsx', 'utf8');
const search = /<\/div>\s*<\/div>\s*<\/div>\s*<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">/;
const replace = `        </div>\n      </div>\n      </div>\n\n      <div className="flex items-center gap-6 border-b border-slate-200 dark:border-slate-700">\n        <button\n          onClick={() => setMainTab('overview')}\n          className={\`pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 \${\n            mainTab === 'overview'\n              ? 'border-teal-500 text-teal-600'\n              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'\n          }\`}\n        >\n          <Target className="w-4 h-4" /> Overview\n        </button>\n        <button\n          onClick={() => setMainTab('profile')}\n          className={\`pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 \${\n            mainTab === 'profile'\n              ? 'border-teal-500 text-teal-600'\n              : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'\n          }\`}\n        >\n          <User className="w-4 h-4" /> Profile & Performance\n        </button>\n      </div>\n\n      {mainTab === 'profile' && (\n        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">\n          <PerformanceHeatmap attempts={myAttempts} />\n          <ProfileManager />\n        </div>\n      )}\n\n      {mainTab === 'overview' && (\n      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">`;

if (search.test(content)) {
  content = content.replace(search, replace);
  // Also fix the bottom to close the {mainTab === 'overview' && ( ... )}
  content = content.replace(/<\/div>\s*<\/div>\s*$/, '      </div>\n      )}\n    </div>\n  );\n}');
  fs.writeFileSync('src/pages/StudentDashboard.tsx', content);
  console.log('patched');
} else {
  console.log('not found');
}
