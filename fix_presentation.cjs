const fs = require('fs');
let content = fs.readFileSync('src/components/CoursePresentation.tsx', 'utf8');

content = content.replace("key={\\`cell-\\${index}\\`}", "key={`cell-${index}`}");
content = content.replace("style={{ width: \\`\\${(currentSlide / modules.length) * 100}%\\` }}", "style={{ width: `${(currentSlide / modules.length) * 100}%` }}");
content = content.replace("className={\\`relative preserve-3d transition-transform duration-500 w-full h-full \\${flippedCards[idx] ? 'rotate-y-180' : ''}\\`}", "className={`relative preserve-3d transition-transform duration-500 w-full h-full ${flippedCards[idx] ? 'rotate-y-180' : ''}`}");
content = content.replace("className={\\`w-3 h-3 rounded-full transition-all duration-300 \\${currentSlide === idx ? 'bg-indigo-600 scale-125' : 'bg-slate-300 dark:bg-slate-700 hover:bg-slate-400'}\\`}", "className={`w-3 h-3 rounded-full transition-all duration-300 ${currentSlide === idx ? 'bg-indigo-600 scale-125' : 'bg-slate-300 dark:bg-slate-700 hover:bg-slate-400'}`}");
content = content.replace("aria-label={\\`Go to slide \\${idx}\\`}", "aria-label={`Go to slide ${idx}`}");

fs.writeFileSync('src/components/CoursePresentation.tsx', content);
