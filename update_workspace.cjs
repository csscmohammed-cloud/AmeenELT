const fs = require('fs');
let content = fs.readFileSync('src/components/workspace/TeacherWorkspace.tsx', 'utf8');

// We will add state variables and modal for course generation
const stateToAdd = `  const [showCourseGenModal, setShowCourseGenModal] = useState(false);
  const [courseGenOptions, setCourseGenOptions] = useState({
    drawings: true,
    illustrations: true,
    charts: true,
    flashcards: true,
    audio: true
  });

  const handleGenerateCourse = async () => {
    setIsAILoading(true);
    setShowCourseGenModal(false);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'course', topic, context: title + " - " + topic, options: courseGenOptions })
      });
      const data = await res.json();
      if (res.ok) {
        if (material.type === 'course') {
           setContent(data);
           alert("AI generated course content successfully!");
        }
      } else {
        alert("Failed to generate course.");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to generate course.");
    } finally {
      setIsAILoading(false);
    }
  };`;

content = content.replace("  const handleGenerateQuiz = async () => {", stateToAdd + "\n\n  const handleGenerateQuiz = async () => {");

// Add button
const buttons = `<button onClick={handleAIImprove} disabled={isAILoading} className="px-3 py-1.5 text-xs font-medium bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 rounded-md hover:bg-teal-200 transition-colors disabled:opacity-50">✨ {isAILoading ? 'Working...' : 'AI Improve'}</button>
                      {material.type === 'quiz' && (
                        <button onClick={handleGenerateQuiz} disabled={isAILoading} className="px-3 py-1.5 text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded-md hover:bg-purple-200 transition-colors disabled:opacity-50">🪄 {isAILoading ? 'Working...' : 'Generate Quiz'}</button>
                      )}
                      {material.type === 'course' && (
                        <button onClick={() => setShowCourseGenModal(true)} disabled={isAILoading} className="px-3 py-1.5 text-xs font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 rounded-md hover:bg-indigo-200 transition-colors disabled:opacity-50">🪄 {isAILoading ? 'Working...' : 'AI Course Generator'}</button>
                      )}`;

content = content.replace(`<button onClick={handleAIImprove} disabled={isAILoading} className="px-3 py-1.5 text-xs font-medium bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 rounded-md hover:bg-teal-200 transition-colors disabled:opacity-50">✨ {isAILoading ? 'Working...' : 'AI Improve'}</button>
                      <button onClick={handleGenerateQuiz} disabled={isAILoading} className="px-3 py-1.5 text-xs font-medium bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 rounded-md hover:bg-purple-200 transition-colors disabled:opacity-50">🪄 {isAILoading ? 'Working...' : 'Generate Quiz'}</button>`, buttons);


const modalStr = `{showCourseGenModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700/50">
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">AI Course Options</h3>
              <p className="text-sm text-slate-500 mt-1">Select the rich media elements you want AI to generate.</p>
            </div>
            <div className="p-6 space-y-4">
              {Object.keys(courseGenOptions).map((key) => (
                <label key={key} className="flex items-center gap-3 cursor-pointer p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 border border-slate-100 dark:border-slate-700">
                  <input
                    type="checkbox"
                    checked={courseGenOptions[key as keyof typeof courseGenOptions]}
                    onChange={(e) => setCourseGenOptions({ ...courseGenOptions, [key]: e.target.checked })}
                    className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
                  />
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300 capitalize">{key}</span>
                </label>
              ))}
            </div>
            <div className="p-6 bg-slate-50 dark:bg-slate-900 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-700/50">
              <button onClick={() => setShowCourseGenModal(false)} className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors">Cancel</button>
              <button onClick={handleGenerateCourse} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors shadow-sm">Generate</button>
            </div>
          </div>
        </div>
      )}`;

content = content.replace("    </div>\n  );\n}\n", `      ${modalStr}\n    </div>\n  );\n}\n`);

fs.writeFileSync('src/components/workspace/TeacherWorkspace.tsx', content);
