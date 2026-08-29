import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, addDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import { ChevronLeft, ChevronRight, CheckCircle2, Circle, GripVertical, Check, Volume2, Sparkles } from 'lucide-react';
import { playSound } from '../utils/audio';

interface InteractiveCourseViewerProps {
  content: any;
}

export function InteractiveCourseViewer({ content }: InteractiveCourseViewerProps) {
  const { user } = useAuth();
  const [submitted, setSubmitted] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleSubmitAssignment = async () => {
    if (!user) {
      alert("Please sign in to submit assignments.");
      return;
    }
    try {
      await addDoc(collection(db, 'attempts'), {
        userId: user.uid,
        userEmail: user.email || '',
        userName: user.displayName || user.email || 'Student',
        materialId: content.materialId || 'interactive-course-' + Date.now(),
        type: 'interactive-course',
        score: 100,
        totalQuestions: slides.length,
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
      alert("🎉 Course assignment successfully submitted to your instructor!");
    } catch (err) {
      console.error("Error submitting course assignment:", err);
      alert("Failed to submit assignment. Please try again.");
    }
  };
  const slides = content.slides || [];
  
  if (slides.length === 0) {
    return <div className="p-8 text-center text-slate-500">No content available for this course.</div>;
  }

  const slide = slides[currentSlide];

  const nextSlide = () => {
    if (currentSlide < slides.length - 1) setCurrentSlide(curr => curr + 1);
  };

  const prevSlide = () => {
    if (currentSlide > 0) setCurrentSlide(curr => curr - 1);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
        <button 
          onClick={prevSlide} 
          disabled={currentSlide === 0}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg disabled:opacity-50"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        
        <div className="flex gap-2">
          {slides.map((_, idx) => (
            <div 
              key={idx} 
              className={`w-2.5 h-2.5 rounded-full transition-colors ${idx === currentSlide ? 'bg-purple-600' : 'bg-slate-200 dark:bg-slate-700'}`}
            />
          ))}
        </div>

        <button 
          onClick={nextSlide} 
          disabled={currentSlide === slides.length - 1}
          className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg disabled:opacity-50"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800 min-h-[500px] rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-8 flex flex-col animate-in fade-in zoom-in-95 duration-300 relative overflow-hidden" key={currentSlide}>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6 text-center">{slide.title}</h2>
        <div className="flex-1 flex flex-col justify-center">
          {slide.type === 'intro' && <IntroSlide slide={slide} />}
          {slide.type === 'rules' && <RulesSlide slide={slide} />}
          {slide.type === 'flashcards' && <FlashcardsSlide slide={slide} />}
          {slide.type === 'reading' && <ReadingSlide slide={slide} />}
          {slide.type === 'drag-drop' && <DragDropSlide slide={slide} />}
          {slide.type === 'presentation' && <PresentationSlide slide={slide} />}
          {slide.type === 'fill-in-blanks' && <FillInBlanksSlide slide={slide} />}
          {slide.type === 'sentence-builder' && <SentenceBuilderSlide slide={slide} />}
          {slide.type === 'quiz' && <QuizSlide slide={slide} onComplete={nextSlide} isLast={currentSlide === slides.length - 1} />}
        </div>
      </div>

      {currentSlide === slides.length - 1 && (
        <div className="bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-200 dark:border-purple-800 p-6 rounded-xl text-center space-y-4">
          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Congratulations on Completing This Course!</h3>
          <p className="text-sm text-slate-600 dark:text-slate-300">Submit your completed work to your instructor to record your score and earn +50 XP.</p>
          <button
            onClick={handleSubmitAssignment}
            disabled={submitted}
            className="px-8 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-emerald-600 text-white font-bold rounded-xl shadow-lg transition-colors flex items-center gap-2 mx-auto"
          >
            <CheckCircle2 className="w-5 h-5" />
            {submitted ? 'Assignment Submitted ✓' : 'Submit Assignment to Instructor'}
          </button>
        </div>
      )}
    </div>
  );
}

function IntroSlide({ slide }: { slide: any }) {
  const [revealed, setRevealed] = useState<number[]>([]);

  return (
    <div className="space-y-8 max-w-3xl mx-auto w-full">
      <div className="text-center space-y-4">
        {slide.warmup && <p className="text-lg text-slate-600 dark:text-slate-300 italic">"{slide.warmup}"</p>}
        {slide.objectives && (
          <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-xl inline-block text-left border border-purple-100 dark:border-purple-800">
            <h4 className="font-semibold text-purple-800 dark:text-purple-300 mb-2">Learning Objectives:</h4>
            <ul className="list-disc list-inside text-sm text-purple-900/80 dark:text-purple-300/80 space-y-1">
              {slide.objectives.map((obj: string, i: number) => <li key={i}>{obj}</li>)}
            </ul>
          </div>
        )}
      </div>

      {slide.stickyNotes && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
          {slide.stickyNotes.map((note: any, i: number) => (
            <button 
              key={i}
              onClick={() => setRevealed(prev => prev.includes(i) ? prev : [...prev, i])}
              className={`p-6 text-left rounded-xl shadow-sm border transition-all duration-300 min-h-[140px] flex flex-col justify-center ${
                revealed.includes(i) 
                  ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800' 
                  : 'bg-white border-slate-200 hover:border-amber-300 hover:shadow-md cursor-pointer dark:bg-slate-800 dark:border-slate-700'
              }`}
            >
              <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 mb-2">{note.concept}</h3>
              {revealed.includes(i) ? (
                <p className="text-slate-600 dark:text-slate-300 animate-in fade-in duration-300">{note.explanation}</p>
              ) : (
                <p className="text-slate-400 dark:text-slate-500 text-sm flex items-center gap-1">Click to reveal <ChevronRight className="w-4 h-4" /></p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function RulesSlide({ slide }: { slide: any }) {
  const [expandedRule, setExpandedRule] = useState<number | null>(null);

  return (
    <div className="space-y-4 max-w-2xl mx-auto w-full">
      {slide.rules?.map((rule: any, i: number) => (
        <div key={i} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          <button 
            className="w-full text-left px-6 py-4 flex justify-between items-center hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors"
            onClick={() => setExpandedRule(expandedRule === i ? null : i)}
          >
            <div className="flex items-center gap-3">
              <span className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs font-bold rounded">
                {rule.type || 'Rule'}
              </span>
              <span className="font-medium text-slate-800 dark:text-slate-200">{rule.rule}</span>
            </div>
            <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform ${expandedRule === i ? 'rotate-90' : ''}`} />
          </button>
          
          {expandedRule === i && (
            <div className="px-6 pb-5 pt-2 animate-in slide-in-from-top-2 fade-in duration-200">
              <div className="p-4 bg-emerald-50 dark:bg-emerald-900/20 border-l-4 border-emerald-500 rounded-r-lg">
                <p className="text-emerald-800 dark:text-emerald-200"><span className="font-semibold">Example:</span> {rule.example}</p>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function FlashcardsSlide({ slide }: { slide: any }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  if (!slide.flashcards || slide.flashcards.length === 0) return null;

  const card = slide.flashcards[currentIndex];

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((curr) => (curr + 1) % slide.flashcards.length);
    }, 150);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFlipped(false);
    setTimeout(() => {
      setCurrentIndex((curr) => curr === 0 ? slide.flashcards.length - 1 : curr - 1);
    }, 150);
  };

  return (
    <div className="flex flex-col items-center">
      <div 
        className="w-full max-w-lg aspect-video perspective-1000 cursor-pointer"
        onClick={() => setIsFlipped(!isFlipped)}
      >
        <div className={`relative w-full h-full transition-transform duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
          {/* Front */}
          <div className="absolute w-full h-full backface-hidden bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-lg border border-indigo-400">
            <h3 className="text-4xl font-bold text-white mb-2">{card.term}</h3>
            {card.phonetic && <p className="text-indigo-100 font-mono">{card.phonetic}</p>}
            <p className="absolute bottom-4 text-indigo-200 text-sm">Click to reveal</p>
          </div>
          
          {/* Back */}
          <div className="absolute w-full h-full backface-hidden bg-white dark:bg-slate-800 rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-lg border border-slate-200 dark:border-slate-700 rotate-y-180">
            <h4 className="text-2xl font-semibold text-slate-800 dark:text-slate-100 mb-4">{card.definition}</h4>
            {card.example && (
              <p className="text-slate-500 dark:text-slate-400 italic">"{card.example}"</p>
            )}
            <p className="absolute bottom-4 text-slate-400 text-sm">Click to flip back</p>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-6 mt-8">
        <button onClick={handlePrev} className="p-2 bg-slate-100 dark:bg-slate-700 rounded-full hover:bg-slate-200 transition-colors text-slate-700 dark:text-slate-300">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <span className="font-medium text-slate-500 dark:text-slate-400">
          {currentIndex + 1} / {slide.flashcards.length}
        </span>
        <button onClick={handleNext} className="p-2 bg-slate-100 dark:bg-slate-700 rounded-full hover:bg-slate-200 transition-colors text-slate-700 dark:text-slate-300">
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}

function ReadingSlide({ slide }: { slide: any }) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [synonymAnswers, setSynonymAnswers] = useState<Record<number, string>>({});
  const [showResults, setShowResults] = useState(false);

  const checkAnswers = () => {
    setShowResults(true);
    let correct = 0;
    let totalQuestions = (slide.readingQuestions?.length || 0) + (slide.synonymMatch?.length || 0);
    
    slide.readingQuestions?.forEach((q: any, i: number) => {
      if (answers[i] === q.answer) correct++;
    });
    
    slide.synonymMatch?.forEach((syn: any, i: number) => {
      if (synonymAnswers[i] === syn.synonymToMatch) correct++;
    });
    
    if (correct === totalQuestions && totalQuestions > 0) {
      playSound('correct');
    }
  };

  const isAllAnswered = Object.keys(answers).length === (slide.readingQuestions?.length || 0) &&
                        Object.keys(synonymAnswers).length === (slide.synonymMatch?.length || 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl mx-auto">
      <div className="bg-slate-50 dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-700 prose dark:prose-invert max-w-none text-sm h-[400px] overflow-y-auto">
        <p className="whitespace-pre-wrap leading-relaxed">{slide.passage}</p>
      </div>
      
      <div className="space-y-6 h-[400px] overflow-y-auto pr-2">
        {/* MCQ Questions */}
        {slide.readingQuestions?.map((q: any, i: number) => {
          const isCorrect = answers[i] === q.answer;
          const isWrong = showResults && !isCorrect && answers[i];
          
          return (
            <div key={i} className={`p-4 rounded-xl border transition-colors ${
              showResults && isCorrect ? 'bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20' : 
              isWrong ? 'bg-red-50 border-red-200 dark:bg-red-900/20' : 'bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700'
            }`}>
              <p className="font-medium mb-3 text-slate-800 dark:text-slate-200">{i + 1}. {q.question}</p>
              <div className="space-y-2">
                {q.options?.map((opt: string, optIdx: number) => (
                  <label key={optIdx} className="flex items-center gap-3 p-2 rounded hover:bg-slate-50 dark:hover:bg-slate-750 cursor-pointer">
                    <input
                      type="radio"
                      name={`question-${i}`}
                      value={opt}
                      checked={answers[i] === opt}
                      onChange={() => setAnswers(prev => ({ ...prev, [i]: opt }))}
                      disabled={showResults}
                      className="w-4 h-4 text-teal-600 border-slate-300 focus:ring-teal-500"
                    />
                    <span className="text-sm text-slate-700 dark:text-slate-300">{opt}</span>
                  </label>
                ))}
              </div>
              {showResults && isCorrect && <p className="mt-2 text-sm text-emerald-600 font-medium flex items-center gap-1"><Check className="w-4 h-4"/> Correct</p>}
              {showResults && !isCorrect && <p className="mt-2 text-sm text-red-500 font-medium">Correct answer: {q.answer}</p>}
            </div>
          )
        })}

        {/* Synonym Matching */}
        {slide.synonymMatch && slide.synonymMatch.length > 0 && (
          <div className="p-4 rounded-xl border bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700">
             <p className="font-bold mb-3 text-slate-800 dark:text-slate-200">Match the synonyms</p>
             {slide.synonymMatch.map((syn: any, i: number) => {
                const isCorrect = synonymAnswers[i] === syn.synonymToMatch;
                const isWrong = showResults && !isCorrect && synonymAnswers[i];
                return (
                  <div key={i} className="mb-4">
                    <div className="flex flex-col gap-2">
                      <span className="text-sm font-medium">"{syn.wordInText}"</span>
                      <select 
                        className={`p-2 text-sm border rounded ${
                           showResults && isCorrect ? 'border-emerald-500 bg-emerald-50 text-emerald-800' :
                           isWrong ? 'border-red-500 bg-red-50 text-red-800' : 'border-slate-300 dark:border-slate-600 dark:bg-slate-700'
                        }`}
                        value={synonymAnswers[i] || ''}
                        onChange={(e) => setSynonymAnswers(prev => ({...prev, [i]: e.target.value}))}
                        disabled={showResults}
                      >
                         <option value="" disabled>Select synonym...</option>
                         {/* We shuffle synonyms normally but for simplicity, we show all available options sorted or unsorted */}
                         {slide.synonymMatch.map((s: any) => s.synonymToMatch).sort().map((opt: string, idx: number) => (
                           <option key={idx} value={opt}>{opt}</option>
                         ))}
                      </select>
                      {showResults && isCorrect && <p className="text-xs text-emerald-600 font-medium flex items-center gap-1"><Check className="w-3 h-3"/> Correct</p>}
                      {showResults && !isCorrect && <p className="text-xs text-red-500 font-medium">Correct answer: {syn.synonymToMatch}</p>}
                    </div>
                  </div>
                )
             })}
          </div>
        )}
        
        <button 
          onClick={checkAnswers}
          disabled={!isAllAnswered || showResults}
          className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium disabled:opacity-50 transition-colors"
        >
          {showResults ? 'Completed' : 'Check Answers'}
        </button>
      </div>
    </div>
  );
}

// Minimal Drag and Drop Simulation (Click to select, click category to place)
function DragDropSlide({ slide }: { slide: any }) {
  const [placedItems, setPlacedItems] = useState<Record<string, string>>({}); // itemId -> category
  const [selectedItem, setSelectedItem] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);

  const items = slide.dragItems || [];
  const categories = slide.categories || [];

  const handleCategoryClick = (category: string) => {
    if (selectedItem && !checked) {
      setPlacedItems(prev => ({ ...prev, [selectedItem]: category }));
      setSelectedItem(null);
    }
  };

  const handleCheck = () => {
    setChecked(true);
    const isAllCorrect = items.every((item: any) => placedItems[item.id || item.content] === item.category);
    playSound(isAllCorrect ? 'correct' : 'incorrect');
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col h-full">
      <div className="flex flex-wrap gap-2 mb-8 p-4 bg-slate-50 dark:bg-slate-900 rounded-xl min-h-[100px] border border-slate-200 dark:border-slate-700">
        {items.filter((i: any) => !placedItems[i.id || i.content]).map((item: any, idx: number) => (
          <button
            key={idx}
            onClick={() => !checked && setSelectedItem(selectedItem === (item.id || item.content) ? null : (item.id || item.content))}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all transform active:scale-95 shadow-sm border ${
              selectedItem === (item.id || item.content) 
                ? 'bg-purple-600 text-white border-purple-600 ring-2 ring-purple-300 ring-offset-1' 
                : 'bg-white text-slate-700 border-slate-200 hover:border-purple-300 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-600'
            }`}
          >
            <GripVertical className="w-3 h-3 inline-block mr-1 opacity-50" />
            {item.content}
          </button>
        ))}
        {items.filter((i: any) => !placedItems[i.id || i.content]).length === 0 && (
          <p className="text-slate-400 italic m-auto">All items placed.</p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 flex-1">
        {categories.map((cat: string, idx: number) => (
          <div 
            key={idx} 
            onClick={() => handleCategoryClick(cat)}
            className={`bg-slate-50 dark:bg-slate-900 rounded-xl border-2 p-4 min-h-[200px] flex flex-col transition-colors ${
              selectedItem && !checked ? 'border-purple-400 bg-purple-50/50 cursor-pointer dark:bg-purple-900/10' : 'border-slate-200 dark:border-slate-700'
            }`}
          >
            <h4 className="font-bold text-slate-700 dark:text-slate-200 mb-3 text-center border-b border-slate-200 dark:border-slate-700 pb-2">{cat}</h4>
            <div className="flex-1 flex flex-col gap-2">
              {items.filter((i: any) => placedItems[i.id || i.content] === cat).map((item: any, i: number) => {
                const isCorrect = item.category === cat;
                return (
                  <div 
                    key={i} 
                    onClick={(e) => {
                      if(!checked) {
                        e.stopPropagation();
                        setPlacedItems(prev => {
                          const next = {...prev};
                          delete next[item.id || item.content];
                          return next;
                        });
                      }
                    }}
                    className={`px-3 py-2 bg-white dark:bg-slate-800 rounded shadow-sm text-sm flex items-center justify-between border ${
                      checked 
                        ? (isCorrect ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20' : 'border-red-400 bg-red-50 dark:bg-red-900/20')
                        : 'border-slate-200 dark:border-slate-700 cursor-pointer hover:border-red-300 hover:line-through'
                    }`}
                  >
                    <span>{item.content}</span>
                    {checked && isCorrect && <Check className="w-4 h-4 text-emerald-500" />}
                    {checked && !isCorrect && <X className="w-4 h-4 text-red-500" />}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-6 flex justify-center">
        <button
          onClick={handleCheck}
          disabled={Object.keys(placedItems).length !== items.length || checked}
          className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors disabled:opacity-50"
        >
          {checked ? 'Completed' : 'Check Answers'}
        </button>
      </div>
    </div>
  );
}

function QuizSlide({ slide, onComplete, isLast }: { slide: any, onComplete: () => void, isLast: boolean }) {
  const [currentQ, setCurrentQ] = useState(0);
  const [score, setScore] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  
  const questions = slide.quizQuestions || [];
  
  if (showResults) {
    return (
      <div className="text-center space-y-6 animate-in zoom-in duration-500">
        <div className="w-32 h-32 mx-auto bg-yellow-100 rounded-full flex items-center justify-center border-4 border-yellow-400 shadow-xl">
          <span className="text-5xl">🏆</span>
        </div>
        <h2 className="text-3xl font-extrabold text-slate-800 dark:text-slate-100">Quiz Completed!</h2>
        <p className="text-2xl text-slate-600 dark:text-slate-300">
          You scored <span className="font-bold text-purple-600">{score}</span> out of {questions.length}
        </p>
        
        {score === questions.length ? (
          <p className="text-emerald-500 font-medium text-lg">Perfect score! Outstanding job.</p>
        ) : (
          <p className="text-amber-500 font-medium text-lg">Good effort! Review the lesson and try again.</p>
        )}
        
        {!isLast && (
          <button onClick={onComplete} className="mt-4 px-8 py-3 bg-teal-600 text-white font-bold rounded-xl hover:bg-teal-700 transition-colors">
            Continue Course
          </button>
        )}
      </div>
    );
  }

  const q = questions[currentQ];
  
  const handleAnswer = (opt: string) => {
    if (selected) return;
    setSelected(opt);
    
    const isCorrect = opt === q.answer;
    playSound(isCorrect ? 'correct' : 'incorrect');
    
    if (isCorrect) setScore(s => s + 1);
    
    setTimeout(() => {
      if (currentQ < questions.length - 1) {
        setCurrentQ(curr => curr + 1);
        setSelected(null);
      } else {
        setShowResults(true);
      }
    }, 1500);
  };

  return (
    <div className="max-w-2xl mx-auto w-full text-center">
      <div className="mb-8 flex justify-center gap-2">
        {questions.map((_: any, i: number) => (
          <div key={i} className={`w-3 h-3 rounded-full ${i === currentQ ? 'bg-purple-600' : i < currentQ ? 'bg-purple-300' : 'bg-slate-200'}`} />
        ))}
      </div>
      
      <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-8">{q?.question}</h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {q?.options?.map((opt: string, i: number) => {
          let stateClass = "bg-white border-slate-200 hover:border-purple-400 hover:bg-purple-50 dark:bg-slate-800 dark:border-slate-700 dark:hover:bg-slate-700";
          if (selected) {
            if (opt === q.answer) {
              stateClass = "bg-emerald-100 border-emerald-500 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200 font-bold scale-105";
            } else if (opt === selected) {
              stateClass = "bg-red-100 border-red-500 text-red-800 dark:bg-red-900/40 dark:text-red-200 opacity-50";
            } else {
              stateClass = "opacity-50 bg-white border-slate-200 dark:bg-slate-800 dark:border-slate-700";
            }
          }
          
          return (
            <button
              key={i}
              onClick={() => handleAnswer(opt)}
              disabled={!!selected}
              className={`p-6 rounded-2xl border-2 transition-all duration-300 text-lg shadow-sm ${stateClass}`}
            >
              {opt}
            </button>
          )
        })}
      </div>
    </div>
  );
}

// Simple X icon for DragDropSlide
function X(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>;
}


function PresentationSlide({ slide }: { slide: any }) {
  const [currentPresSlide, setCurrentPresSlide] = useState(0);
  const slides = slide.slides || [];
  const presSlide = slides[currentPresSlide];

  return (
    <div className="max-w-3xl mx-auto w-full flex flex-col items-center">
      <div className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-8 min-h-[300px] shadow-sm relative">
        <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-6 text-center">{presSlide?.heading}</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
           <div>
             <ul className="space-y-4 text-left">
               {presSlide?.bulletPoints?.map((bp: string, i: number) => (
                 <li key={i} className="flex items-start gap-3">
                   <div className="w-2 h-2 mt-2 bg-purple-500 rounded-full flex-shrink-0" />
                   <span className="text-slate-700 dark:text-slate-300 text-lg leading-relaxed">{bp}</span>
                 </li>
               ))}
             </ul>
           </div>
           
           {presSlide?.visualIdea && (
             <div className="bg-indigo-50 dark:bg-indigo-900/30 p-6 rounded-xl flex flex-col items-center justify-center border border-indigo-100 dark:border-indigo-800/50 min-h-[200px]">
               <Sparkles className="w-8 h-8 text-indigo-400 mb-3" />
               <p className="text-sm text-center text-indigo-800 dark:text-indigo-200 font-medium italic">
                 {presSlide.visualIdea}
               </p>
             </div>
           )}
        </div>
      </div>
      
      <div className="mt-6 flex items-center justify-center gap-4">
        <button 
          onClick={() => setCurrentPresSlide(c => Math.max(0, c - 1))}
          disabled={currentPresSlide === 0}
          className="p-2 bg-white dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 disabled:opacity-50"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
          Slide {currentPresSlide + 1} of {slides.length}
        </span>
        <button 
          onClick={() => setCurrentPresSlide(c => Math.min(slides.length - 1, c + 1))}
          disabled={currentPresSlide === slides.length - 1}
          className="p-2 bg-white dark:bg-slate-800 rounded-full border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-750 disabled:opacity-50"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

function FillInBlanksSlide({ slide }: { slide: any }) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showResults, setShowResults] = useState(false);

  const sentences = slide.sentences || [];

  const checkAnswers = () => {
    setShowResults(true);
    let correct = 0;
    sentences.forEach((s: any, i: number) => {
      if (answers[i]?.trim().toLowerCase() === s.answer?.trim().toLowerCase()) correct++;
    });
    if (correct === sentences.length && sentences.length > 0) {
      playSound('correct');
    }
  };

  const allFilled = Object.keys(answers).length === sentences.length && (Object.values(answers) as string[]).every(v => v.trim() !== '');

  return (
    <div className="max-w-2xl mx-auto w-full">
      <div className="space-y-6 mb-8">
        {sentences.map((s: any, i: number) => {
          const isCorrect = showResults && answers[i]?.trim().toLowerCase() === s.answer?.trim().toLowerCase();
          const isWrong = showResults && !isCorrect;
          
          return (
            <div key={i} className={`p-4 bg-white dark:bg-slate-800 rounded-xl border shadow-sm ${
              isCorrect ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20' :
              isWrong ? 'border-red-400 bg-red-50 dark:bg-red-900/20' : 'border-slate-200 dark:border-slate-700'
            }`}>
              <div className="text-lg text-slate-800 dark:text-slate-200 leading-relaxed flex flex-wrap items-center gap-2">
                <span>{s.textBeforeBlank}</span>
                <input
                  type="text"
                  value={answers[i] || ''}
                  onChange={(e) => setAnswers(prev => ({...prev, [i]: e.target.value}))}
                  disabled={showResults}
                  className={`px-3 py-1 w-32 border-b-2 bg-transparent text-center focus:outline-none focus:border-purple-500 font-bold ${
                     isCorrect ? 'text-emerald-600 border-emerald-500' :
                     isWrong ? 'text-red-500 border-red-500' : 'text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600'
                  }`}
                />
                <span>{s.textAfterBlank}</span>
              </div>
              {showResults && isCorrect && <p className="mt-2 text-sm text-emerald-600 font-medium flex items-center gap-1"><Check className="w-4 h-4"/> Correct</p>}
              {showResults && !isCorrect && <p className="mt-2 text-sm text-red-500 font-medium">Correct answer: {s.answer}</p>}
            </div>
          );
        })}
      </div>
      
      <button 
        onClick={checkAnswers}
        disabled={!allFilled || showResults}
        className="w-full py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold disabled:opacity-50 transition-colors"
      >
        {showResults ? 'Completed' : 'Check Answers'}
      </button>
    </div>
  );
}

function SentenceBuilderSlide({ slide }: { slide: any }) {
  const [currentExercise, setCurrentExercise] = useState(0);
  const [constructed, setConstructed] = useState<string[]>([]);
  const [showResults, setShowResults] = useState(false);
  
  const exercises = slide.exercises || [];
  const exercise = exercises[currentExercise];
  
  if (!exercise) return null;

  const handleWordClick = (word: string, index: number) => {
    if (showResults) return;
    setConstructed(prev => [...prev, word]);
  };

  const handleRemoveWord = (index: number) => {
    if (showResults) return;
    setConstructed(prev => prev.filter((_, i) => i !== index));
  };

  const checkAnswer = () => {
    setShowResults(true);
    const isCorrect = constructed.join(' ') === exercise.correctSentence;
    playSound(isCorrect ? 'correct' : 'incorrect');
  };

  const nextExercise = () => {
    setConstructed([]);
    setShowResults(false);
    setCurrentExercise(c => c + 1);
  };
  
  const isCorrect = constructed.join(' ') === exercise.correctSentence;

  return (
    <div className="max-w-2xl mx-auto w-full text-center">
      <div className="mb-6 flex justify-center gap-2">
        {exercises.map((_: any, i: number) => (
          <div key={i} className={`w-2 h-2 rounded-full ${i === currentExercise ? 'bg-indigo-600' : i < currentExercise ? 'bg-indigo-300' : 'bg-slate-200'}`} />
        ))}
      </div>
      
      <p className="text-lg text-slate-600 dark:text-slate-300 mb-8 italic">"{exercise.hint || exercise.translation}"</p>
      
      <div className="min-h-[80px] bg-white dark:bg-slate-800 border-2 border-dashed border-slate-300 dark:border-slate-600 rounded-xl p-4 flex flex-wrap gap-2 items-center justify-center mb-8">
        {constructed.length === 0 ? (
          <span className="text-slate-400">Construct the sentence here...</span>
        ) : (
          constructed.map((word, i) => (
            <button
              key={i}
              onClick={() => handleRemoveWord(i)}
              className={`px-4 py-2 rounded-lg font-bold text-sm transition-transform hover:scale-105 ${
                 showResults && isCorrect ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                 showResults && !isCorrect ? 'bg-red-100 text-red-800 border border-red-300' :
                 'bg-indigo-100 text-indigo-800 border border-indigo-200 dark:bg-indigo-900/50 dark:text-indigo-200 dark:border-indigo-800'
              }`}
            >
              {word}
            </button>
          ))
        )}
      </div>
      
      <div className="flex flex-wrap gap-3 justify-center mb-8">
        {exercise.scrambledWords.map((word: string, i: number) => {
           // We can allow duplicate words if they exist in scrambledWords
           const countInScrambled = exercise.scrambledWords.filter((w: string) => w === word).length;
           const countInConstructed = constructed.filter((w: string) => w === word).length;
           const isUsed = countInConstructed >= countInScrambled;
           
           return (
             <button
               key={i}
               onClick={() => handleWordClick(word, i)}
               disabled={isUsed || showResults}
               className={`px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg font-medium shadow-sm transition-all ${
                 isUsed ? 'opacity-30 scale-95' : 'hover:-translate-y-1 hover:shadow-md active:scale-95'
               }`}
             >
               {word}
             </button>
           )
        })}
      </div>
      
      {showResults && !isCorrect && (
         <div className="mb-6 p-4 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-300 rounded-xl border border-amber-200 dark:border-amber-800/50">
           <p className="font-bold mb-1">Correct sentence:</p>
           <p>{exercise.correctSentence}</p>
         </div>
      )}
      
      {!showResults ? (
        <button
          onClick={checkAnswer}
          disabled={constructed.length === 0}
          className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold disabled:opacity-50 transition-colors"
        >
          Check Answer
        </button>
      ) : currentExercise < exercises.length - 1 ? (
        <button
          onClick={nextExercise}
          className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors"
        >
          Next Sentence
        </button>
      ) : (
        <button
          disabled
          className="px-8 py-3 bg-emerald-500 text-white rounded-xl font-bold opacity-80 cursor-default"
        >
          Completed
        </button>
      )}
    </div>
  );
}
