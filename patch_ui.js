import fs from 'fs';

let content = fs.readFileSync('src/components/AudioRecorder.tsx', 'utf8');

// 1. Update the Evaluation state type
content = content.replace(
  "const [evaluation, setEvaluation] = useState<{ score: number, feedback: string, mispronouncedWords: string[], transcription?: string } | null>(null);",
  "const [evaluation, setEvaluation] = useState<{ score: number, details?: { clarity: number, intonation: number, fluency: number }, feedback: string, mispronouncedWords: string[], transcription?: string } | null>(null);"
);

// 2. Add progress bars UI below the overall score
const progressBars = `
              {evaluation.details && (
                <div className="bg-white dark:bg-slate-900 px-6 py-4 border-b border-teal-100 dark:border-teal-900/50">
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-4">Detailed Breakdown</h4>
                  <div className="space-y-4">
                    {/* Clarity */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm font-medium">
                        <span className="text-slate-700 dark:text-slate-300">Clarity</span>
                        <span className="text-slate-600 dark:text-slate-400">{evaluation.details.clarity}%</span>
                      </div>
                      <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-teal-500 rounded-full transition-all duration-1000" style={{ width: \`\${evaluation.details.clarity}%\` }}></div>
                      </div>
                    </div>
                    {/* Intonation */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm font-medium">
                        <span className="text-slate-700 dark:text-slate-300">Intonation</span>
                        <span className="text-slate-600 dark:text-slate-400">{evaluation.details.intonation}%</span>
                      </div>
                      <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-500 rounded-full transition-all duration-1000" style={{ width: \`\${evaluation.details.intonation}%\` }}></div>
                      </div>
                    </div>
                    {/* Fluency */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm font-medium">
                        <span className="text-slate-700 dark:text-slate-300">Fluency</span>
                        <span className="text-slate-600 dark:text-slate-400">{evaluation.details.fluency}%</span>
                      </div>
                      <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-indigo-500 rounded-full transition-all duration-1000" style={{ width: \`\${evaluation.details.fluency}%\` }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
`;

content = content.replace(
  "</div>\n              \n              <div className=\"p-6 space-y-6\">",
  "</div>\n              " + progressBars + "\n              <div className=\"p-6 space-y-6\">"
);

fs.writeFileSync('src/components/AudioRecorder.tsx', content);
console.log('Patched AudioRecorder UI');
