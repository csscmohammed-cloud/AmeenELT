import React, { useState, useEffect } from 'react';
import { CheckCircle2, RotateCcw, Award, Sparkles, HelpCircle } from 'lucide-react';

interface Props {
  sentences?: { scrambled: string[]; correct: string[]; hint?: string }[];
}

export function InteractiveSentenceBuilder({ sentences }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [wordBank, setWordBank] = useState<{ id: string; word: string }[]>([]);
  const [selectedWords, setSelectedWords] = useState<{ id: string; word: string }[]>([]);
  const [feedback, setFeedback] = useState<'correct' | 'incorrect' | null>(null);
  const [score, setScore] = useState(0);
  const [showHint, setShowHint] = useState(false);

  const defaultChallenges = [
    {
      correct: ["The", "quick", "brown", "fox", "jumps", "over", "the", "lazy", "dog."],
      scrambled: ["fox", "quick", "The", "jumps", "brown", "lazy", "over", "the", "dog."],
      hint: "Start with the article 'The'."
    },
    {
      correct: ["Effective", "communication", "requires", "clarity", "and", "active", "listening."],
      scrambled: ["clarity", "requires", "Effective", "listening.", "active", "communication", "and"],
      hint: "Subject comes first: 'Effective communication'."
    }
  ];

  const challenges = sentences && sentences.length > 0 ? sentences.map(s => ({
    correct: s.correct || s.scrambled,
    scrambled: s.scrambled || s.correct,
    hint: s.hint || "Arrange the words in correct grammatical order."
  })) : defaultChallenges;

  const currentChallenge = challenges[currentIndex % challenges.length];

  useEffect(() => {
    const scrambled = currentChallenge?.scrambled || [];
    const words = [...scrambled]
      .sort(() => Math.random() - 0.5)
      .map((w, idx) => ({ id: `${idx}-${w}`, word: w }));
    setWordBank(words);
    setSelectedWords([]);
    setFeedback(null);
    setShowHint(false);
  }, [currentIndex, JSON.stringify(currentChallenge?.scrambled)]);

  const handleSelectWord = (item: { id: string; word: string }) => {
    setWordBank(prev => prev.filter(w => w.id !== item.id));
    setSelectedWords(prev => [...prev, item]);
    setFeedback(null);
  };

  const handleRemoveWord = (item: { id: string; word: string }) => {
    setSelectedWords(prev => prev.filter(w => w.id !== item.id));
    setWordBank(prev => [...prev, item]);
    setFeedback(null);
  };

  const checkSentence = () => {
    const userString = selectedWords.map(w => w.word).join(' ');
    const correctString = currentChallenge.correct.join(' ');
    const isCorrect = userString.toLowerCase() === correctString.toLowerCase();
    
    setFeedback(isCorrect ? 'correct' : 'incorrect');
    if (isCorrect) {
      setScore(prev => prev + 1);
    }
  };

  const nextChallenge = () => {
    setCurrentIndex(prev => prev + 1);
  };

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 rounded-2xl shadow-sm space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
            🧩 Drag & Drop Sentence Builder
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Click words in the correct order to construct a grammatically accurate sentence.
          </p>
        </div>
        <span className="text-xs font-bold bg-indigo-50 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 px-3 py-1 rounded-full">
          Challenge {currentIndex + 1} of {challenges.length}
        </span>
      </div>

      {/* Selected Sentence Assembly Zone */}
      <div className="min-h-[80px] p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-wrap items-center gap-2">
        {selectedWords.length === 0 ? (
          <p className="text-xs text-slate-400 italic">Click words below to build your sentence here...</p>
        ) : (
          selectedWords.map(item => (
            <button
              key={item.id}
              onClick={() => handleRemoveWord(item)}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-sm transition-transform active:scale-95"
            >
              {item.word} ✕
            </button>
          ))
        )}
      </div>

      {/* Word Bank */}
      <div className="space-y-2">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Available Words</p>
        <div className="flex flex-wrap gap-2">
          {wordBank.map(item => (
            <button
              key={item.id}
              onClick={() => handleSelectWord(item)}
              className="px-3.5 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 hover:border-indigo-400 text-slate-800 dark:text-slate-200 text-xs font-bold rounded-xl shadow-sm transition-all hover:scale-105"
            >
              {item.word}
            </button>
          ))}
        </div>
      </div>

      {/* Hint Section */}
      {showHint && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span><strong>AI Hint:</strong> {currentChallenge.hint}</span>
        </div>
      )}

      {/* Feedback Banner */}
      {feedback === 'correct' && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center justify-between text-emerald-800 dark:text-emerald-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <span className="text-sm font-bold">Correct! Excellent sentence construction.</span>
          </div>
          <button
            onClick={nextChallenge}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors"
          >
            Next Challenge ➔
          </button>
        </div>
      )}

      {feedback === 'incorrect' && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center justify-between text-rose-800 dark:text-rose-200">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold">⚠️ Not quite right. Review word order and grammar rules.</span>
          </div>
          <button
            onClick={() => setShowHint(true)}
            className="px-3 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-xs font-bold transition-colors"
          >
            Get Hint 💡
          </button>
        </div>
      )}

      {/* Action Controls */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-700">
        <button
          onClick={() => {
            setWordBank([...selectedWords, ...wordBank].sort(() => Math.random() - 0.5));
            setSelectedWords([]);
            setFeedback(null);
          }}
          className="text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 flex items-center gap-1"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Reset Sentence
        </button>

        <button
          onClick={checkSentence}
          disabled={selectedWords.length === 0}
          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md transition-colors flex items-center gap-1.5"
        >
          <Sparkles className="w-4 h-4" /> Check Answer
        </button>
      </div>
    </div>
  );
}
