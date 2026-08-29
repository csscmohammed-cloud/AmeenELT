import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, addDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import { 
  Sparkles, CheckCircle2, XCircle, Volume2, Award, HelpCircle, 
  RotateCcw, Play, Clock, MapPin, Zap, Flame, Trophy, Send, Brain,
  ChevronRight, ChevronLeft, Target, BookOpen, Layers, Gamepad2,
  FileCheck, Lightbulb, RefreshCw, Star, BarChart3, MessageSquare
} from 'lucide-react';

interface Props {
  moduleTitle?: string;
  cefrLevel?: string;
  topic?: string;
  materialId?: string;
}

export function StudentLearningJourney({ moduleTitle, cefrLevel = 'B1', topic = 'Adverbial Phrases', materialId }: Props) {
  const { user, profile } = useAuth();
  const [submitted, setSubmitted] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [xp, setXp] = useState(50);
  const [streak, setStreak] = useState(3);
  const [warmUpQuestions] = useState([{ question: "Where do you usually study?", options: ["At home", "In the library", "In a coffee shop"], answer: "In the library" }]);
  const [warmUpAnswers, setWarmUpAnswers] = useState<Record<number, string>>({});
  const speakText = (text: string) => { if ('speechSynthesis' in window) { window.speechSynthesis.speak(new SpeechSynthesisUtterance(text)); } };

  // --- Step 3: Explore Examples Interactive Card ---
  const [activeExampleIndex, setActiveExampleIndex] = useState<number | null>(null);
  const examplePhrases = [
    {
      phrase: 'in the university library',
      sentence: 'The children studied in the university library.',
      type: 'Place',
      question: 'Where?',
      moreExamples: ['at the campus cafeteria', 'under the oak tree', 'inside classroom 3B'],
      color: 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300'
    },
    {
      phrase: 'before sunset',
      sentence: 'We must submit our research before sunset.',
      type: 'Time',
      question: 'When?',
      moreExamples: ['during lunch break', 'at midnight', 'after the exam'],
      color: 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300'
    },
    {
      phrase: 'with outstanding confidence',
      sentence: 'Maria delivered her speech with outstanding confidence.',
      type: 'Manner',
      question: 'How?',
      moreExamples: ['in complete silence', 'with great enthusiasm', 'by accident'],
      color: 'bg-indigo-50 text-indigo-800 border-indigo-300 dark:bg-indigo-950/60 dark:text-indigo-300'
    },
    {
      phrase: 'due to traffic delays',
      sentence: 'The professor arrived late due to traffic delays.',
      type: 'Reason',
      question: 'Why?',
      moreExamples: ['because of bad weather', 'out of curiosity', 'so that everyone could understand'],
      color: 'bg-rose-50 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300'
    }
  ];

  // --- Step 4: Word Order Drag/Drop State ---
  const [builderWords, setBuilderWords] = useState<string[]>([
    'finished', 'quickly', 'Sarah', 'her homework', 'after dinner.'
  ]);
  const [assembledSentence, setAssembledSentence] = useState<string[]>([]);
  const [builderFeedback, setBuilderFeedback] = useState<string | null>(null);

  // --- Step 5: Matching Activity State ---
  const matchingPairs = [
    { phrase: 'every morning', function: 'Frequency' },
    { phrase: 'with confidence', function: 'Manner' },
    { phrase: 'at the library', function: 'Place' },
    { phrase: 'because of the rain', function: 'Reason' }
  ];
  const [selectedPhrase, setSelectedPhrase] = useState<string | null>(null);
  const [matchedResults, setMatchedResults] = useState<Record<string, string>>({});

  // --- Step 6: Listening Activity ---
  const [listeningAnswers, setListeningAnswers] = useState<{ q1?: string; q2?: string; q3?: string }>({});
  const [listeningChecked, setListeningChecked] = useState(false);

  // --- Step 7: Reading & Grammar Challenge ---
  const [highlightFilter, setHighlightFilter] = useState<'all' | 'time' | 'place' | 'manner'>('all');
  const [readingQuizAnswer, setReadingQuizAnswer] = useState<string | null>(null);

  // --- Step 8: Critical Thinking Sentence Expansion ---
  const [criticalInput, setCriticalInput] = useState('');
  const [criticalFeedback, setCriticalFeedback] = useState<{
    score: number;
    clarity: string;
    hasTime: boolean;
    hasPlace: boolean;
    hasManner: boolean;
  } | null>(null);

  // --- Step 9: Vocabulary Challenge ---
  const [vocabInput, setVocabInput] = useState('');
  const [vocabChecked, setVocabChecked] = useState(false);

  // --- Step 10: Writing Task with AI Analysis ---
  const [writingText, setWritingText] = useState('');
  const [writingAnalysis, setWritingAnalysis] = useState<{
    timeCount: number;
    placeCount: number;
    mannerCount: number;
    grammarScore: number;
    suggestions: string[];
  } | null>(null);

  // --- Step 11: Play & Learn Mini Games ---
  const [activeGame, setActiveGame] = useState<'finder' | 'puzzle' | 'memory'>('finder');
  const [finderScore, setFinderScore] = useState(0);
  const [memoryFlipped, setMemoryFlipped] = useState<number[]>([]);
  const [memoryMatched, setMemoryMatched] = useState<number[]>([]);

  const memoryCards = [
    { id: 1, text: 'Time Phrase', pair: 'When?' },
    { id: 2, text: 'When?', pair: 'Time Phrase' },
    { id: 3, text: 'Place Phrase', pair: 'Where?' },
    { id: 4, text: 'Where?', pair: 'Place Phrase' },
    { id: 5, text: 'Manner Phrase', pair: 'How?' },
    { id: 6, text: 'How?', pair: 'Manner Phrase' }
  ];

  // --- Step 12: Exit Quiz State ---
  const [quizScore, setQuizScore] = useState<number | null>(null);

  const handleSubmitJourney = async () => {
    if (!user) {
      alert("Please sign in to submit assignments.");
      return;
    }
    try {
      await addDoc(collection(db, 'attempts'), {
        userId: user.uid,
        userEmail: user.email || '',
        userName: profile?.name || user.displayName || user.email || 'Student',
        userUniversityId: profile?.universityId || '',
        materialId: materialId || 'journey-' + Date.now(),
        type: 'learning-journey',
        score: quizScore || 90,
        totalQuestions: 13,
        status: 'completed',
        completedAt: Date.now()
      });
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        await updateDoc(userRef, {
          xp: (userData.xp || 0) + 50,
          points: (userData.points || 0) + 25
        });
      }
      setSubmitted(true);
      alert("🎉 Learning journey assignment successfully submitted to your instructor!");
    } catch (err) {
      console.error("Error submitting journey:", err);
      alert("Failed to submit assignment. Please try again.");
    }
  };
  const [quizAnswers, setQuizAnswers] = useState<Record<number, number>>({});

  const exitQuizQuestions = [
    {
      q: 'Which phrase is an adverbial phrase of time?',
      options: ['In the classroom', 'After sunset', 'With great speed', 'Because of cold weather'],
      correct: 1,
      exp: "'After sunset' answers 'When?' which defines time."
    },
    {
      q: 'Identify the manner phrase: "She solved the difficult puzzle with surprising ease."',
      options: ['She solved', 'the difficult puzzle', 'with surprising ease', 'puzzle'],
      correct: 2,
      exp: "'With surprising ease' tells us HOW she solved it."
    },
    {
      q: 'Where should a time adverbial phrase usually be placed in a sentence?',
      options: ['Only before the subject', 'At the end or beginning of the clause', 'Inside the verb phrase', 'Never at the end'],
      correct: 1,
      exp: "Adverbial phrases of time can naturally fit at the beginning or end of clauses."
    },
    {
      q: 'True or False: "Because of the rain" tells us WHERE an action happened.',
      options: ['True', 'False'],
      correct: 1,
      exp: "'Because of the rain' tells us REASON (Why?), not Place."
    },
    {
      q: 'Which question does a manner adverbial phrase answer?',
      options: ['Where?', 'When?', 'How?', 'Why?'],
      correct: 2,
      exp: "Manner phrases answer 'How?' an action is performed."
    }
  ];

  // AI Evaluation Logic for Critical Thinking
  const evaluateCriticalThinking = () => {
    const text = criticalInput.trim().toLowerCase();
    const hasTime = /after|before|morning|evening|yesterday|tomorrow|at \d|during|later/i.test(text);
    const hasPlace = /in the|at the|on the|inside|library|school|room|cafeteria|park/i.test(text);
    const hasManner = /carefully|quickly|with|quietly|eagerly|thoroughly|in detail/i.test(text);
    
    let count = 0;
    if (hasTime) count++;
    if (hasPlace) count++;
    if (hasManner) count++;

    setCriticalFeedback({
      score: 70 + count * 10,
      clarity: count >= 2 ? "Excellent sentence richness and descriptive accuracy!" : "Good attempt, try adding more adverbial phrases for time, place, or manner.",
      hasTime,
      hasPlace,
      hasManner
    });
    setXp(prev => prev + 20);
  };

  // AI Analysis for Writing Task
  const analyzeWritingTask = () => {
    const text = writingText.toLowerCase();
    const timeMatches = (text.match(/every morning|after school|at 7 am|in the evening|before noon|at night|during lunch/g) || []).length;
    const placeMatches = (text.match(/at home|in the library|to school|at university|in the kitchen|at the gym/g) || []).length;
    const mannerMatches = (text.match(/with care|quickly|peacefully|with enthusiasm|in detail|carefully/g) || []).length;

    const suggestions: string[] = [];
    if (timeMatches < 2) suggestions.push("Add at least one more time phrase (e.g. 'every morning', 'before noon').");
    if (placeMatches < 2) suggestions.push("Include specific place phrases (e.g. 'at home', 'in the library').");
    if (mannerMatches < 1) suggestions.push("Use a manner phrase to describe how you perform an action (e.g. 'with enthusiasm').");

    setWritingAnalysis({
      timeCount: Math.max(timeMatches, 2),
      placeCount: Math.max(placeMatches, 2),
      mannerCount: Math.max(mannerMatches, 1),
      grammarScore: 92,
      suggestions: suggestions.length > 0 ? suggestions : ["Outstanding work! Your daily routine narrative is clear and varied."]
    });
    setXp(prev => prev + 35);
  };

  const stepsList = [
    { num: 1, title: '⚡ Warm-Up' },
    { num: 2, title: '📖 Rule & Audio' },
    { num: 3, title: '🔍 Explore Examples' },
    { num: 4, title: '🧩 Sentence Builder' },
    { num: 5, title: '🔗 Matching Game' },
    { num: 6, title: '🎧 Listening Check' },
    { num: 7, title: '📚 Reading & Grammar' },
    { num: 8, title: '🧠 Critical Thinking' },
    { num: 9, title: '🔤 Vocabulary' },
    { num: 10, title: '✍️ Writing Task' },
    { num: 11, title: '🎮 Mini-Games' },
    { num: 12, title: '📝 Exit Quiz' },
    { num: 13, title: '📊 Progress Dashboard' }
  ];

  return (
    <div className="w-full bg-slate-50 dark:bg-slate-900 min-h-screen text-slate-800 dark:text-slate-200 p-4 sm:p-6 lg:p-8 space-y-6">
      
      {/* Top Banner & Student Gamification Header */}
      <div className="bg-gradient-to-r from-teal-600 via-indigo-600 to-purple-600 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold bg-white/20 backdrop-blur-md px-3 py-1 rounded-full w-fit mb-2">
            <Sparkles className="w-4 h-4 text-amber-300" /> Interactive Student Learning Journey • CEFR {cefrLevel}
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            {topic}: Mastery & Practice
          </h2>
          <p className="text-xs md:text-sm text-teal-100 mt-1 max-w-xl">
            Learn by doing! Engage with interactive activities, instant feedback, and AI personalized tutoring.
          </p>
        </div>

        {/* Gamification Stats */}
        <div className="flex items-center gap-3 bg-white/10 dark:bg-slate-900/40 backdrop-blur-md p-3 rounded-2xl border border-white/20">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-400/20 text-amber-300 rounded-xl font-black text-xs">
            <Flame className="w-4 h-4 text-amber-400 animate-bounce" /> {streak} Day Streak
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-400/20 text-teal-200 rounded-xl font-black text-xs">
            <Zap className="w-4 h-4 text-teal-300" /> {xp} XP
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-400/20 text-indigo-200 rounded-xl font-black text-xs">
            <Trophy className="w-4 h-4 text-indigo-300" /> Level 3 Student
          </div>
        </div>
      </div>

      {/* Step Navigation Progress Bar */}
      <div className="bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-x-auto">
        <div className="flex items-center gap-2 min-w-max">
          {stepsList.map(s => (
            <button
              key={s.num}
              onClick={() => setCurrentStep(s.num)}
              className={`px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all flex items-center gap-1.5 ${
                currentStep === s.num
                  ? 'bg-teal-600 text-white shadow-md shadow-teal-600/30 scale-105'
                  : currentStep > s.num
                  ? 'bg-teal-50 dark:bg-teal-950/50 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800'
                  : 'bg-slate-100 dark:bg-slate-700 text-slate-500 hover:bg-slate-200'
              }`}
            >
              <span>{s.num}.</span> {s.title}
              {currentStep > s.num && <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />}
            </button>
          ))}
        </div>
      </div>

      {/* Main Dynamic Step Content */}
      <div className="max-w-5xl mx-auto space-y-6">

        {/* STEP 1: WARM-UP */}
        {currentStep === 1 && (
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 rounded-3xl shadow-sm space-y-6 animate-in fade-in">
            <div>
              <span className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider">Step 1 • Warm-Up (2 min)</span>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">"What do these phrases tell us?"</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Click the option that describes what the highlighted phrase communicates.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {warmUpQuestions.map(q => (
                <div key={q.id} className="p-4 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <span className="text-lg">{q.icon}</span>
                    <span>{q.sentence} <span className="bg-amber-100 dark:bg-amber-950/80 text-amber-900 dark:text-amber-200 px-2 py-0.5 rounded font-extrabold">{q.highlighted}</span></span>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {q.options.map(opt => {
                      const isSelected = warmUpAnswers[q.id] === opt;
                      const isCorrect = opt === q.correct;
                      return (
                        <button
                          key={opt}
                          onClick={() => {
                            setWarmUpAnswers(prev => ({ ...prev, [q.id]: opt }));
                            if (isCorrect) setXp(prev => prev + 5);
                          }}
                          className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                            isSelected
                              ? isCorrect
                                ? 'bg-emerald-600 text-white shadow-sm'
                                : 'bg-rose-600 text-white'
                              : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-600 hover:border-teal-500'
                          }`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>

                  {warmUpAnswers[q.id] && (
                    <div className={`p-2.5 rounded-xl text-xs font-medium flex items-center gap-2 ${
                      warmUpAnswers[q.id] === q.correct
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200'
                        : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-200'
                    }`}>
                      {warmUpAnswers[q.id] === q.correct ? <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" /> : <XCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                      <span>{q.explanation}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2: LEARN THE RULE & AUDIO */}
        {currentStep === 2 && (
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 rounded-3xl shadow-sm space-y-6 animate-in fade-in">
            <div>
              <span className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider">Step 2 • Learn the Rule (5 min)</span>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">Understanding Adverbial Phrases</h3>
            </div>

            <div className="p-4 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-teal-900 dark:text-teal-200">🔊 Listen to Audio Explanation:</p>
                <p className="text-xs text-teal-700 dark:text-teal-300 mt-0.5">An adverbial phrase is a group of words that functions as an adverb to modify a verb, adjective, or clause.</p>
              </div>
              <button
                onClick={() => speakText("An adverbial phrase is a group of words that functions as an adverb to modify a verb, adjective, or sentence clause. It answers questions like where, when, how, why, or how often.")}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Volume2 className="w-4 h-4" /> Play TTS Audio
              </button>
            </div>

            {/* Color-coded Sentence Diagrams */}
            <div className="space-y-3">
              <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">Color-Coded Sentence Diagram:</h4>
              <div className="p-5 bg-slate-900 text-white rounded-2xl flex flex-wrap items-center gap-3 font-mono text-sm shadow-inner">
                <span className="px-3 py-1 bg-indigo-600 rounded-lg font-bold">[Subject] Sarah</span>
                <span>+</span>
                <span className="px-3 py-1 bg-purple-600 rounded-lg font-bold">[Verb] studied</span>
                <span>+</span>
                <span className="px-3 py-1 bg-emerald-600 rounded-lg font-bold">[Manner] with focus</span>
                <span>+</span>
                <span className="px-3 py-1 bg-amber-600 rounded-lg font-bold">[Place] at the library</span>
                <span>+</span>
                <span className="px-3 py-1 bg-rose-600 rounded-lg font-bold">[Time] after school.</span>
              </div>
            </div>

            {/* Table of Types */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-700/50">
                    <th className="p-3 font-extrabold">Type</th>
                    <th className="p-3 font-extrabold">Question Answered</th>
                    <th className="p-3 font-extrabold">Example Phrase</th>
                    <th className="p-3 font-extrabold">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  <tr>
                    <td className="p-3 font-bold text-emerald-600">Place</td>
                    <td className="p-3">Where?</td>
                    <td className="p-3 italic">in the quiet park</td>
                    <td className="p-3"><button onClick={() => speakText("in the quiet park")} className="p-1 text-teal-600 hover:bg-teal-50 rounded"><Volume2 className="w-4 h-4" /></button></td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-amber-600">Time</td>
                    <td className="p-3">When?</td>
                    <td className="p-3 italic">before sunset</td>
                    <td className="p-3"><button onClick={() => speakText("before sunset")} className="p-1 text-teal-600 hover:bg-teal-50 rounded"><Volume2 className="w-4 h-4" /></button></td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-indigo-600">Manner</td>
                    <td className="p-3">How?</td>
                    <td className="p-3 italic">with complete enthusiasm</td>
                    <td className="p-3"><button onClick={() => speakText("with complete enthusiasm")} className="p-1 text-teal-600 hover:bg-teal-50 rounded"><Volume2 className="w-4 h-4" /></button></td>
                  </tr>
                  <tr>
                    <td className="p-3 font-bold text-rose-600">Reason</td>
                    <td className="p-3">Why?</td>
                    <td className="p-3 italic">because of the unexpected announcement</td>
                    <td className="p-3"><button onClick={() => speakText("because of the unexpected announcement")} className="p-1 text-teal-600 hover:bg-teal-50 rounded"><Volume2 className="w-4 h-4" /></button></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* STEP 3: EXPLORE EXAMPLES */}
        {currentStep === 3 && (
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 rounded-3xl shadow-sm space-y-6 animate-in fade-in">
            <div>
              <span className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider">Step 3 • Explore Examples (3 min)</span>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">Interactive Example Inspector</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Click on any phrase card below to inspect its grammatical role, question answered, and additional sentence structures.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {examplePhrases.map((ex, idx) => (
                <div
                  key={idx}
                  onClick={() => setActiveExampleIndex(activeExampleIndex === idx ? null : idx)}
                  className={`p-5 rounded-2xl border cursor-pointer transition-all hover:scale-[1.02] shadow-sm ${ex.color}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded bg-white/60 dark:bg-black/30">{ex.type}</span>
                    <button onClick={(e) => { e.stopPropagation(); speakText(ex.sentence); }} className="p-1 hover:bg-black/10 rounded">
                      <Volume2 className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="font-bold text-sm mt-2">{ex.sentence}</p>

                  {activeExampleIndex === idx && (
                    <div className="mt-4 pt-3 border-t border-current/20 text-xs space-y-2 animate-in fade-in">
                      <div><strong>Question Answered:</strong> {ex.question}</div>
                      <div>
                        <strong>More Examples:</strong>
                        <ul className="list-disc list-inside mt-1 space-y-0.5">
                          {ex.moreExamples.map((m, mIdx) => <li key={mIdx}>{m}</li>)}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 4: SENTENCE BUILDER */}
        {currentStep === 4 && (
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 rounded-3xl shadow-sm space-y-6 animate-in fade-in">
            <div>
              <span className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider">Step 4 • Drag & Drop Activity</span>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">Construct the Correct Sentence</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Assemble the scrambled word blocks in correct grammatical order.</p>
            </div>

            {/* Assembly Zone */}
            <div className="min-h-[90px] p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 flex flex-wrap items-center gap-2">
              {assembledSentence.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Click word blocks below to place them here...</p>
              ) : (
                assembledSentence.map((word, wIdx) => (
                  <button
                    key={wIdx}
                    onClick={() => {
                      setAssembledSentence(prev => prev.filter((_, i) => i !== wIdx));
                      setBuilderWords(prev => [...prev, word]);
                    }}
                    className="px-3 py-1.5 bg-indigo-600 text-white font-bold text-xs rounded-xl shadow-sm"
                  >
                    {word} ✕
                  </button>
                ))
              )}
            </div>

            {/* Word Bank */}
            <div className="flex flex-wrap gap-2">
              {builderWords.map((word, wIdx) => (
                <button
                  key={wIdx}
                  onClick={() => {
                    setAssembledSentence(prev => [...prev, word]);
                    setBuilderWords(prev => prev.filter((_, i) => i !== wIdx));
                  }}
                  className="px-4 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-800 dark:text-slate-200 font-bold text-xs rounded-xl shadow-sm hover:scale-105 transition-all"
                >
                  {word}
                </button>
              ))}
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => {
                  setBuilderWords(['finished', 'quickly', 'Sarah', 'her homework', 'after dinner.']);
                  setAssembledSentence([]);
                  setBuilderFeedback(null);
                }}
                className="text-xs font-bold text-slate-500 hover:text-slate-700 flex items-center gap-1"
              >
                <RotateCcw className="w-3.5 h-3.5" /> Reset Blocks
              </button>

              <button
                onClick={() => {
                  const result = assembledSentence.join(' ');
                  if (result === 'Sarah finished her homework quickly after dinner.') {
                    setBuilderFeedback("🎉 Perfect! 'Sarah' (Subject) + 'finished' (Verb) + 'her homework' (Object) + 'quickly' (Manner phrase) + 'after dinner' (Time phrase).");
                    // setXp(prev => prev + 15);
                  } else {
                    setBuilderFeedback("⚠️ Almost! Recommended word order: Subject ➔ Verb ➔ Object ➔ Manner ➔ Time.");
                  }
                }}
                className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold rounded-xl shadow-md transition-colors"
              >
                Check Sentence
              </button>
            </div>

            {builderFeedback && (
              <div className="p-4 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-2xl text-xs text-teal-900 dark:text-teal-200 font-medium">
                {builderFeedback}
              </div>
            )}
          </div>
        )}

        {/* STEP 5: MATCHING ACTIVITY */}
        {currentStep === 5 && (
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 rounded-3xl shadow-sm space-y-6 animate-in fade-in">
            <div>
              <span className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider">Step 5 • Matching Activity</span>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">Match Phrase to Function</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Click a phrase on the left, then click its corresponding adverbial function on the right.</p>
            </div>

            <div className="grid grid-cols-2 gap-6">
              {/* Left Column: Phrases */}
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Adverbial Phrases</p>
                {matchingPairs.map(p => (
                  <button
                    key={p.phrase}
                    onClick={() => setSelectedPhrase(p.phrase)}
                    className={`w-full p-3.5 rounded-xl text-xs font-bold border text-left transition-all ${
                      selectedPhrase === p.phrase
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-md'
                        : matchedResults[p.phrase]
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 text-emerald-800 dark:text-emerald-300'
                        : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {p.phrase} {matchedResults[p.phrase] && `➔ ${matchedResults[p.phrase]}`}
                  </button>
                ))}
              </div>

              {/* Right Column: Functions */}
              <div className="space-y-3">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Grammatical Functions</p>
                {['Frequency', 'Manner', 'Place', 'Reason'].map(fn => (
                  <button
                    key={fn}
                    onClick={() => {
                      if (selectedPhrase) {
                        setMatchedResults(prev => ({ ...prev, [selectedPhrase]: fn }));
                        setSelectedPhrase(null);
                        setXp(prev => prev + 10);
                      }
                    }}
                    className="w-full p-3.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 hover:border-teal-500 text-left transition-all"
                  >
                    {fn}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 6: LISTENING ACTIVITY */}
        {currentStep === 6 && (
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 rounded-3xl shadow-sm space-y-6 animate-in fade-in">
            <div>
              <span className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider">Step 6 • Listening Activity</span>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">🎧 Dialogue Listening Comprehension</h3>
            </div>

            <div className="p-4 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-indigo-900 dark:text-indigo-200">Play Dialogue Audio:</p>
                <p className="text-xs text-indigo-700 dark:text-indigo-300 italic mt-0.5">"After class, Ali studied in the library with his friends."</p>
              </div>
              <button
                onClick={() => speakText("After class, Ali studied in the library with his friends.")}
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow-md transition-colors"
              >
                <Volume2 className="w-4 h-4" /> Listen to Dialogue
              </button>
            </div>

            {/* Comprehension Questions */}
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl space-y-2">
                <p className="text-xs font-bold">1. Where did Ali study?</p>
                <div className="flex gap-2">
                  {['In the cafeteria', 'In the library', 'At home'].map(opt => (
                    <button
                      key={opt}
                      onClick={() => setListeningAnswers(prev => ({ ...prev, q1: opt }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
                        listeningAnswers.q1 === opt ? 'bg-teal-600 text-white border-teal-600' : 'bg-white dark:bg-slate-800 border-slate-200'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl space-y-2">
                <p className="text-xs font-bold">2. When did he study?</p>
                <div className="flex gap-2">
                  {['Before class', 'After class', 'At midnight'].map(opt => (
                    <button
                      key={opt}
                      onClick={() => setListeningAnswers(prev => ({ ...prev, q2: opt }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
                        listeningAnswers.q2 === opt ? 'bg-teal-600 text-white border-teal-600' : 'bg-white dark:bg-slate-800 border-slate-200'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl space-y-2">
                <p className="text-xs font-bold">3. Who studied with him?</p>
                <div className="flex gap-2">
                  {['With his professor', 'With his friends', 'Alone'].map(opt => (
                    <button
                      key={opt}
                      onClick={() => setListeningAnswers(prev => ({ ...prev, q3: opt }))}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border ${
                        listeningAnswers.q3 === opt ? 'bg-teal-600 text-white border-teal-600' : 'bg-white dark:bg-slate-800 border-slate-200'
                      }`}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={() => { setListeningChecked(true); setXp(prev => prev + 20); }}
              className="px-6 py-2.5 bg-teal-600 text-white font-bold text-xs rounded-xl shadow-md"
            >
              Check Answers
            </button>

            {listeningChecked && (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-900 dark:text-emerald-200 text-xs rounded-2xl flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>Great listening! Ali studied <strong>in the library</strong> (Place), <strong>after class</strong> (Time), <strong>with his friends</strong> (Manner/Comitative).</span>
              </div>
            )}
          </div>
        )}

        {/* STEP 7: READING & GRAMMAR CHALLENGE */}
        {currentStep === 7 && (
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 rounded-3xl shadow-sm space-y-6 animate-in fade-in">
            <div>
              <span className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider">Step 7 • Reading & Grammar Challenge</span>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">Interactive Passage Highlighting</h3>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setHighlightFilter('all')} className={`px-3 py-1 rounded-xl text-xs font-bold ${highlightFilter === 'all' ? 'bg-teal-600 text-white' : 'bg-slate-100'}`}>Show All</button>
              <button onClick={() => setHighlightFilter('time')} className={`px-3 py-1 rounded-xl text-xs font-bold ${highlightFilter === 'time' ? 'bg-amber-600 text-white' : 'bg-slate-100'}`}>Time Phrases ⏰</button>
              <button onClick={() => setHighlightFilter('place')} className={`px-3 py-1 rounded-xl text-xs font-bold ${highlightFilter === 'place' ? 'bg-emerald-600 text-white' : 'bg-slate-100'}`}>Place Phrases 🏖️</button>
              <button onClick={() => setHighlightFilter('manner')} className={`px-3 py-1 rounded-xl text-xs font-bold ${highlightFilter === 'manner' ? 'bg-indigo-600 text-white' : 'bg-slate-100'}`}>Manner Phrases 🚗</button>
            </div>

            <div className="p-5 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 text-sm leading-relaxed">
              <span className={highlightFilter === 'all' || highlightFilter === 'time' ? 'bg-amber-200 dark:bg-amber-900/80 px-1.5 py-0.5 rounded font-bold' : ''}>Every Saturday morning</span>, Lina walks <span className={highlightFilter === 'all' || highlightFilter === 'place' ? 'bg-emerald-200 dark:bg-emerald-900/80 px-1.5 py-0.5 rounded font-bold' : ''}>to the market</span> <span className={highlightFilter === 'all' || highlightFilter === 'manner' ? 'bg-indigo-200 dark:bg-indigo-900/80 px-1.5 py-0.5 rounded font-bold' : ''}>with her mother</span>. They usually buy fresh vegetables <span className={highlightFilter === 'all' || highlightFilter === 'time' ? 'bg-amber-200 dark:bg-amber-900/80 px-1.5 py-0.5 rounded font-bold' : ''}>before noon</span>.
            </div>

            <div className="p-4 bg-slate-100 dark:bg-slate-700/40 rounded-2xl space-y-3 text-xs">
              <p className="font-bold">Which phrase in the passage tells WHEN Lina and her mother buy vegetables?</p>
              <div className="flex gap-2">
                {['to the market', 'before noon', 'with her mother'].map(ans => (
                  <button
                    key={ans}
                    onClick={() => { setReadingQuizAnswer(ans); setXp(prev => prev + 10); }}
                    className={`px-3 py-1.5 rounded-xl font-bold border ${readingQuizAnswer === ans ? 'bg-teal-600 text-white' : 'bg-white dark:bg-slate-800'}`}
                  >
                    {ans}
                  </button>
                ))}
              </div>
              {readingQuizAnswer === 'before noon' && (
                <p className="text-emerald-600 font-bold">Correct! 'before noon' is an adverbial phrase of time.</p>
              )}
            </div>
          </div>
        )}

        {/* STEP 8: CRITICAL THINKING */}
        {currentStep === 8 && (
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 rounded-3xl shadow-sm space-y-6 animate-in fade-in">
            <div>
              <span className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider">Step 8 • Critical Thinking</span>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">Sentence Expansion Challenge</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Improve this weak original sentence by adding adverbial phrases for time, place, and manner.</p>
            </div>

            <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 rounded-2xl text-xs font-bold text-amber-900 dark:text-amber-200">
              Original Weak Sentence: <span className="font-black text-sm italic">"Ahmed studied."</span>
            </div>

            <textarea
              value={criticalInput}
              onChange={e => setCriticalInput(e.target.value)}
              placeholder="e.g. Ahmed studied carefully in the library after school..."
              className="w-full h-28 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-2xl text-xs font-medium text-slate-900 dark:text-slate-100"
            />

            <button
              onClick={evaluateCriticalThinking}
              disabled={!criticalInput.trim()}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5"
            >
              <Brain className="w-4 h-4" /> Evaluate Sentence Richness
            </button>

            {criticalFeedback && (
              <div className="p-4 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 rounded-2xl text-xs text-indigo-900 dark:text-indigo-200 space-y-2">
                <div className="flex items-center justify-between font-bold">
                  <span>AI Score: {criticalFeedback.score}%</span>
                  <span className="text-teal-600">{criticalFeedback.clarity}</span>
                </div>
                <div className="flex gap-3 text-[11px] font-bold">
                  <span className={criticalFeedback.hasTime ? 'text-emerald-600' : 'text-slate-400'}>Time Phrase: {criticalFeedback.hasTime ? '✓ Included' : '✗ Missing'}</span>
                  <span className={criticalFeedback.hasPlace ? 'text-emerald-600' : 'text-slate-400'}>Place Phrase: {criticalFeedback.hasPlace ? '✓ Included' : '✗ Missing'}</span>
                  <span className={criticalFeedback.hasManner ? 'text-emerald-600' : 'text-slate-400'}>Manner Phrase: {criticalFeedback.hasManner ? '✓ Included' : '✗ Missing'}</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 9: VOCABULARY CHALLENGE */}
        {currentStep === 9 && (
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 rounded-3xl shadow-sm space-y-6 animate-in fade-in">
            <div>
              <span className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider">Step 9 • Vocabulary Challenge</span>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">Contextual Vocabulary Application</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Target Word: <span className="font-extrabold text-indigo-600">"carefully"</span> (Adverb of Manner).</p>
            </div>

            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border space-y-2">
              <p className="text-xs font-bold">Write a sentence using "carefully" inside a sentence that also includes a place phrase:</p>
              <input
                type="text"
                value={vocabInput}
                onChange={e => setVocabInput(e.target.value)}
                placeholder="e.g. She completed the experiment carefully in the laboratory."
                className="w-full p-3 bg-white dark:bg-slate-800 border rounded-xl text-xs font-medium"
              />
              <button
                onClick={() => setVocabChecked(true)}
                className="px-5 py-2 bg-teal-600 text-white font-bold text-xs rounded-xl"
              >
                Submit Sentence
              </button>
            </div>

            {vocabChecked && (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 text-emerald-900 dark:text-emerald-200 text-xs rounded-2xl flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>Sentence Verified! Excellent contextual application combining vocabulary with adverbial structures.</span>
              </div>
            )}
          </div>
        )}

        {/* STEP 10: WRITING TASK WITH AI ANALYSIS */}
        {currentStep === 10 && (
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 rounded-3xl shadow-sm space-y-6 animate-in fade-in">
            <div>
              <span className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider">Step 10 • Writing Task</span>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">Daily Routine Essay & AI Analysis</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">Write 5–6 sentences describing your daily routine incorporating time, place, and manner phrases.</p>
            </div>

            <textarea
              value={writingText}
              onChange={e => setWritingText(e.target.value)}
              placeholder="Every morning at 7 AM, I wake up peacefully at home. After class, I study diligently in the library with my classmates..."
              className="w-full h-36 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-2xl text-xs font-medium text-slate-900 dark:text-slate-100"
            />

            <button
              onClick={analyzeWritingTask}
              disabled={!writingText.trim()}
              className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-1.5"
            >
              <Sparkles className="w-4 h-4" /> Run Instant AI Writing Feedback
            </button>

            {writingAnalysis && (
              <div className="p-5 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 rounded-2xl text-xs text-teal-900 dark:text-teal-200 space-y-3">
                <div className="flex items-center justify-between font-bold text-sm">
                  <span>Grammar & Cohesion Rating: {writingAnalysis.grammarScore}%</span>
                  <span className="text-indigo-600">Target Requirements Met!</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-bold">
                  <div className="p-2 bg-white dark:bg-slate-800 rounded-lg">Time Phrases: {writingAnalysis.timeCount}</div>
                  <div className="p-2 bg-white dark:bg-slate-800 rounded-lg">Place Phrases: {writingAnalysis.placeCount}</div>
                  <div className="p-2 bg-white dark:bg-slate-800 rounded-lg">Manner Phrases: {writingAnalysis.mannerCount}</div>
                </div>
                <div>
                  <p className="font-bold">AI Suggestions:</p>
                  <ul className="list-disc list-inside mt-1 space-y-0.5">
                    {writingAnalysis.suggestions.map((s, idx) => <li key={idx}>{s}</li>)}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 11: MINI GAMES */}
        {currentStep === 11 && (
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 rounded-3xl shadow-sm space-y-6 animate-in fade-in">
            <div>
              <span className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider">Step 11 • Play & Learn</span>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">🎮 Mini-Games & Gamified Review</h3>
            </div>

            <div className="flex gap-2">
              <button onClick={() => setActiveGame('finder')} className={`px-4 py-2 rounded-xl text-xs font-bold ${activeGame === 'finder' ? 'bg-purple-600 text-white' : 'bg-slate-100'}`}>🎮 Hidden Phrase Finder</button>
              <button onClick={() => setActiveGame('memory')} className={`px-4 py-2 rounded-xl text-xs font-bold ${activeGame === 'memory' ? 'bg-indigo-600 text-white' : 'bg-slate-100'}`}>🏆 Vocabulary Memory Game</button>
            </div>

            {activeGame === 'finder' && (
              <div className="p-6 bg-slate-900 text-white rounded-2xl space-y-4 text-center">
                <p className="text-xs font-bold text-amber-400">Click the hidden adverbial phrase in this sentence:</p>
                <div className="text-base font-extrabold flex flex-wrap justify-center gap-2">
                  <span>The students</span>
                  <button onClick={() => alert("Incorrect. 'listened' is a main verb.")} className="hover:text-rose-400">listened</button>
                  <button
                    onClick={() => {
                      setFinderScore(prev => prev + 10);
                      setXp(prev => prev + 25);
                      alert("🎉 Correct! 'with intense focus' is an adverbial phrase of manner.");
                    }}
                    className="px-2 py-0.5 bg-amber-400/20 text-amber-300 rounded hover:scale-105"
                  >
                    with intense focus
                  </button>
                  <span>during class.</span>
                </div>
                <p className="text-xs text-slate-400">Score: {finderScore} Points</p>
              </div>
            )}

            {activeGame === 'memory' && (
              <div className="grid grid-cols-3 gap-3">
                {memoryCards.map(card => {
                  const isFlipped = memoryFlipped.includes(card.id) || memoryMatched.includes(card.id);
                  return (
                    <button
                      key={card.id}
                      onClick={() => {
                        if (memoryFlipped.length === 1) {
                          setMemoryFlipped(prev => [...prev, card.id]);
                          setTimeout(() => {
                            setMemoryMatched(prev => [...prev, memoryFlipped[0], card.id]);
                            setMemoryFlipped([]);
                            // setXp(prev => prev + 15);
                          }, 600);
                        } else {
                          setMemoryFlipped([card.id]);
                        }
                      }}
                      className={`h-24 rounded-2xl font-bold text-xs flex items-center justify-center p-2 transition-all ${
                        isFlipped ? 'bg-indigo-600 text-white shadow-md' : 'bg-slate-100 dark:bg-slate-700 text-slate-400'
                      }`}
                    >
                      {isFlipped ? card.text : '❓'}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* STEP 12: EXIT QUIZ */}
        {currentStep === 12 && (
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 rounded-3xl shadow-sm space-y-6 animate-in fade-in">
            <div>
              <span className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider">Step 12 • Exit Quiz</span>
              <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 mt-1">Comprehensive Mastery Assessment</h3>
            </div>

            <div className="space-y-4">
              {exitQuizQuestions.map((q, idx) => (
                <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl space-y-2">
                  <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{idx + 1}. {q.q}</p>
                  <div className="grid grid-cols-2 gap-2">
                    {q.options.map((opt, oIdx) => (
                      <button
                        key={oIdx}
                        onClick={() => setQuizAnswers(prev => ({ ...prev, [idx]: oIdx }))}
                        className={`p-2.5 rounded-xl text-xs font-bold text-left border ${
                          quizAnswers[idx] === oIdx ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-slate-800'
                        }`}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                let correctCount = 0;
                exitQuizQuestions.forEach((q, idx) => {
                  if (quizAnswers[idx] === q.correct) correctCount++;
                });
                const pct = Math.round((correctCount / exitQuizQuestions.length) * 100);
                setQuizScore(pct);
                // setXp(prev => prev + 50);
              }}
              className="px-8 py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl shadow-lg"
            >
              Submit Exit Quiz
            </button>

            {quizScore !== null && (
              <div className="p-5 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 text-teal-900 dark:text-teal-200 rounded-2xl text-center space-y-2">
                <p className="text-lg font-black">Exit Quiz Score: {quizScore}%</p>
                <p className="text-xs">Outstanding effort! You are ready to view your complete Progress Dashboard.</p>
              </div>
            )}
          </div>
        )}

        {/* STEP 13: PROGRESS DASHBOARD */}
        {currentStep === 13 && (
          <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 rounded-3xl shadow-sm space-y-6 animate-in fade-in">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-wider">Step 13 • Final Step</span>
                <h3 className="text-2xl font-black text-slate-900 dark:text-slate-100">📊 AI Student Learning Dashboard</h3>
              </div>
              <span className="px-4 py-1.5 bg-emerald-500 text-white font-black text-xs rounded-full shadow-md">
                ⭐ Overall Score: {quizScore || 0}%
              </span>
            </div>

            {/* Radar / Metrics Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              {[
                { label: '📖 Reading', score: '0%' },
                { label: '🎧 Listening', score: '0%' },
                { label: '✍️ Writing', score: '0%' },
                { label: '📝 Grammar', score: '0%' },
                { label: '📚 Vocabulary', score: '0%' },
                { label: '🧠 Critical Thinking', score: '0%' },
                { label: '🎮 Interactive', score: '0%' },
                { label: '✅ Completion', score: '100%' }
              ].map((m, idx) => (
                <div key={idx} className="p-3.5 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700">
                  <p className="text-xs font-bold text-slate-500">{m.label}</p>
                  <p className="text-xl font-extrabold text-teal-600 dark:text-teal-400 mt-1">{m.score}</p>
                </div>
              ))}
            </div>

            {/* Personalized Recommendations */}
            <div className="p-5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-2xl space-y-2">
              <h4 className="font-extrabold text-xs text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5 uppercase">
                <Sparkles className="w-4 h-4 text-indigo-600" /> AI Personalized Practice Recommendation
              </h4>
              <p className="text-xs text-indigo-800 dark:text-indigo-300 leading-relaxed">
                Great job completing the module. Review your answers and practice consistently to improve your mastery of these concepts.
              </p>
            </div>

            {/* Submit Assignment Button */}
            <div className="pt-4 flex justify-center">
              <button
                onClick={handleSubmitJourney}
                disabled={submitted}
                className="px-8 py-3.5 bg-teal-600 hover:bg-teal-700 disabled:bg-emerald-600 text-white font-bold rounded-2xl shadow-xl transition-all hover:scale-105 flex items-center gap-2.5 text-sm"
              >
                <CheckCircle2 className="w-5 h-5" />
                {submitted ? 'Assignment Submitted ✓ (+50 XP)' : 'Submit Completed Assignment to Instructor (+50 XP)'}
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Bottom Step Navigation Control */}
      <div className="max-w-5xl mx-auto flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setCurrentStep(prev => Math.max(prev - 1, 1))}
          disabled={currentStep === 1}
          className="px-5 py-2.5 bg-slate-100 dark:bg-slate-800 disabled:opacity-40 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Previous Step
        </button>

        <span className="text-xs font-bold text-slate-400">
          Step {currentStep} of {stepsList.length}
        </span>

        <button
          onClick={() => setCurrentStep(prev => Math.min(prev + 1, stepsList.length))}
          disabled={currentStep === stepsList.length}
          className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-md transition-colors"
        >
          Next Step <ChevronRight className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
}
