import React, { useState, useEffect } from 'react';
import { CheckCircle2, XCircle, RotateCcw, Award, ArrowRight } from 'lucide-react';

interface Pair {
  id: string;
  term: string;
  definition: string;
}

interface InteractiveMatchingProps {
  pairs: { front: string; back: string }[];
}

export function InteractiveMatching({ pairs }: InteractiveMatchingProps) {
  const [items, setItems] = useState<Pair[]>([]);
  const [shuffledDefs, setShuffledDefs] = useState<{ id: string; definition: string }[]>([]);
  const [selectedTerm, setSelectedTerm] = useState<string | null>(null);
  const [matches, setMatches] = useState<Record<string, string>>({}); // termId -> defId
  const [feedback, setFeedback] = useState<Record<string, 'correct' | 'incorrect'>>({});
  const [score, setScore] = useState(0);
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    if (!pairs || pairs.length === 0) return;
    const formatted = pairs.slice(0, 4).map((p, idx) => ({
      id: `pair-${idx}`,
      term: p.front,
      definition: p.back,
    }));
    setItems(formatted);
    setShuffledDefs(
      formatted
        .map(f => ({ id: f.id, definition: f.definition }))
        .sort(() => Math.random() - 0.5)
    );
    setSelectedTerm(null);
    setMatches({});
    setFeedback({});
    setScore(0);
    setCompleted(false);
  }, [JSON.stringify(pairs)]);

  if (!pairs || pairs.length === 0) {
    return <div className="text-sm text-slate-500 p-4">No matching items available for this module.</div>;
  }

  const handleSelectTerm = (id: string) => {
    if (matches[id]) return; // already matched
    setSelectedTerm(id);
  };

  const handleSelectDef = (defId: string) => {
    if (!selectedTerm) return;
    if (Object.values(matches).includes(defId)) return; // already matched

    const isCorrect = selectedTerm === defId;
    setMatches(prev => ({ ...prev, [selectedTerm]: defId }));
    setFeedback(prev => ({ ...prev, [selectedTerm]: isCorrect ? 'correct' : 'incorrect' }));

    if (isCorrect) {
      const newScore = score + 1;
      setScore(newScore);
      if (newScore === items.length) {
        setCompleted(true);
      }
    }
    setSelectedTerm(null);
  };

  const resetGame = () => {
    setShuffledDefs([...shuffledDefs].sort(() => Math.random() - 0.5));
    setSelectedTerm(null);
    setMatches({});
    setFeedback({});
    setScore(0);
    setCompleted(false);
  };

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 rounded-2xl shadow-sm space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
            🧩 Interactive Term Matching Exercise
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Tap a term on the left, then tap its matching definition on the right.
          </p>
        </div>
        <button
          onClick={resetGame}
          className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Reset
        </button>
      </div>

      {completed ? (
        <div className="p-8 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-center space-y-3">
          <Award className="w-12 h-12 text-emerald-600 mx-auto animate-bounce" />
          <h5 className="text-lg font-bold text-emerald-900 dark:text-emerald-200">Fantastic Job! All Matches Correct!</h5>
          <p className="text-xs text-emerald-700 dark:text-emerald-300">You successfully mastered all vocabulary terms for this lesson.</p>
          <button
            onClick={resetGame}
            className="px-4 py-2 bg-emerald-600 text-white font-bold rounded-xl text-xs hover:bg-emerald-700 transition-colors shadow-md"
          >
            Play Again
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Terms Column */}
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Terms</p>
            {items.map(item => {
              const isMatched = !!matches[item.id];
              const isSelected = selectedTerm === item.id;
              const status = feedback[item.id];

              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectTerm(item.id)}
                  disabled={isMatched && status === 'correct'}
                  className={`w-full p-4 rounded-xl text-left font-bold text-sm transition-all flex items-center justify-between border ${
                    isMatched && status === 'correct'
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-200 cursor-default'
                      : isMatched && status === 'incorrect'
                      ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-300 dark:border-rose-700 text-rose-800 dark:text-rose-200'
                      : isSelected
                      ? 'bg-teal-600 text-white border-teal-600 shadow-md scale-[1.02]'
                      : 'bg-slate-50 dark:bg-slate-900/60 hover:bg-slate-100 dark:hover:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                  }`}
                >
                  <span>{item.term}</span>
                  {isMatched && status === 'correct' && <CheckCircle2 className="w-4 h-4 text-emerald-600" />}
                  {isMatched && status === 'incorrect' && <XCircle className="w-4 h-4 text-rose-600" />}
                </button>
              );
            })}
          </div>

          {/* Definitions Column */}
          <div className="space-y-3">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Definitions</p>
            {shuffledDefs.map(def => {
              const isUsed = Object.values(matches).includes(def.id);
              return (
                <button
                  key={def.id}
                  onClick={() => handleSelectDef(def.id)}
                  disabled={isUsed || !selectedTerm}
                  className={`w-full p-4 rounded-xl text-left text-xs font-medium transition-all border ${
                    isUsed
                      ? 'bg-slate-100 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-500 opacity-60 cursor-not-allowed'
                      : selectedTerm
                      ? 'bg-indigo-50/70 dark:bg-indigo-950/40 hover:bg-indigo-100 border-indigo-200 dark:border-indigo-800 text-indigo-900 dark:text-indigo-200 cursor-pointer shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                  }`}
                >
                  {def.definition}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex items-center justify-between text-xs font-semibold text-slate-500 pt-2 border-t border-slate-100 dark:border-slate-700">
        <span>Score: {score} / {items.length} matched</span>
        {selectedTerm && <span className="text-teal-600 dark:text-teal-400 animate-pulse font-bold">Now select matching definition &rarr;</span>}
      </div>
    </div>
  );
}
