import React, { useState } from 'react';
import { CheckCircle2, XCircle, Sparkles, RotateCcw } from 'lucide-react';

interface BlankItem {
  prompt: string; // e.g. "She [____] to the university every morning."
  options?: string[];
  correctAnswer: string;
  explanation: string;
}

interface Props {
  exercises?: BlankItem[];
}

export function InteractiveFillBlanks({ exercises }: Props) {
  const defaultExercises: BlankItem[] = [
    {
      prompt: "By the time we arrived, the lecture [____] already begun.",
      options: ["has", "had", "have", "was"],
      correctAnswer: "had",
      explanation: "Use 'had' for past perfect tense when an action was completed before another past action."
    },
    {
      prompt: "If I [____] known about the quiz, I would have studied harder.",
      options: ["have", "had", "would have", "did"],
      correctAnswer: "had",
      explanation: "Third conditional structure: If + past perfect (had known), would have + past participle."
    }
  ];

  const items = exercises && exercises.length > 0 ? exercises : defaultExercises;
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [feedback, setFeedback] = useState<Record<number, 'correct' | 'incorrect'>>({});
  const [showExplanation, setShowExplanation] = useState<Record<number, boolean>>({});

  const handleSelect = (idx: number, val: string) => {
    setAnswers(prev => ({ ...prev, [idx]: val }));
    const isCorrect = val.trim().toLowerCase() === items[idx].correctAnswer.trim().toLowerCase();
    setFeedback(prev => ({ ...prev, [idx]: isCorrect ? 'correct' : 'incorrect' }));
  };

  const handleReset = () => {
    setAnswers({});
    setFeedback({});
    setShowExplanation({});
  };

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 rounded-2xl shadow-sm space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
            ✏️ Fill-in-the-Blanks & Grammar Practice
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Select or type the correct word to complete each sentence with immediate explanation.
          </p>
        </div>
        <button
          onClick={handleReset}
          className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Reset
        </button>
      </div>

      <div className="space-y-4">
        {items.map((item, idx) => {
          const status = feedback[idx];
          const parts = item.prompt.split('[____]');

          return (
            <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl space-y-3">
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold bg-teal-500/20 text-teal-700 dark:text-teal-300 px-2 py-0.5 rounded">
                  Q{idx + 1}
                </span>
                <span>{parts[0]}</span>
                <input
                  type="text"
                  value={answers[idx] || ''}
                  onChange={e => handleSelect(idx, e.target.value)}
                  placeholder="type answer..."
                  className={`px-3 py-1 text-xs font-bold rounded-lg border bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 w-36 ${
                    status === 'correct' 
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30' 
                      : status === 'incorrect' 
                      ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/30' 
                      : 'border-slate-300 dark:border-slate-600'
                  }`}
                />
                <span>{parts[1]}</span>
                {status === 'correct' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                {status === 'incorrect' && <XCircle className="w-4 h-4 text-rose-600" />}
              </div>

              {item.options && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {item.options.map((opt, oIdx) => (
                    <button
                      key={oIdx}
                      onClick={() => handleSelect(idx, opt)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                        answers[idx] === opt
                          ? 'bg-teal-600 text-white shadow-sm'
                          : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-teal-400'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}

              {status === 'incorrect' && (
                <div className="flex items-center justify-between pt-1">
                  <button
                    onClick={() => setShowExplanation(prev => ({ ...prev, [idx]: !prev[idx] }))}
                    className="text-xs text-teal-600 dark:text-teal-400 font-bold hover:underline"
                  >
                    {showExplanation[idx] ? 'Hide explanation' : '💡 Why is this correct?'}
                  </button>
                </div>
              )}

              {(showExplanation[idx] || status === 'correct') && item.explanation && (
                <div className="p-3 bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 rounded-lg text-xs text-teal-900 dark:text-teal-200 animate-in fade-in">
                  <strong>Grammar Rule & Explanation:</strong> {item.explanation}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
