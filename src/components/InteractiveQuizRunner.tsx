import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { db } from '../firebase';
import { collection, addDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import { CheckCircle2, XCircle, Award, ArrowRight, RotateCcw, HelpCircle } from 'lucide-react';

interface Question {
  question: string;
  options: string[];
  answer: string;
  explanation: string;
}

interface InteractiveQuizRunnerProps {
  quizQuestions?: { question: string; answer: string }[];
  flashcards?: { front: string; back: string }[];
  moduleTitle: string;
  materialId?: string;
}

export function InteractiveQuizRunner({ quizQuestions, flashcards, moduleTitle, materialId }: InteractiveQuizRunnerProps) {
  const { user, profile } = useAuth();
  const [submitted, setSubmitted] = useState(false);

  const handleSubmitQuiz = async () => {
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
        materialId: materialId || 'quiz-' + Date.now(),
        type: 'quiz',
        score: score,
        totalQuestions: questions.length,
        percentage: Math.round((score / questions.length) * 100),
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
      alert("🎉 Quiz assignment successfully submitted to your instructor!");
    } catch (err) {
      console.error("Error submitting quiz:", err);
      alert("Failed to submit assignment. Please try again.");
    }
  };
  // Generate robust questions if not fully provided
  const questions: Question[] = React.useMemo(() => {
    let base: { question: string; answer: string }[] = [];
    if (quizQuestions && quizQuestions.length > 0) {
      base = quizQuestions;
    } else if (flashcards && flashcards.length > 0) {
      base = flashcards.map(f => ({
        question: `What is the primary definition or significance of "${f.front}"?`,
        answer: f.back
      }));
    } else {
      base = [
        { question: `What is the main objective of ${moduleTitle}?`, answer: "To master core principles through structured practice." },
        { question: "Why is active practice essential in this module?", answer: "It reinforces long-term retention and practical fluency." }
      ];
    }

    // Generate multiple choice options
    const allAnswers = base.map(b => b.answer);
    return base.map((q, idx) => {
      // Create 3 distractors
      const distractors = allAnswers
        .filter(ans => ans !== q.answer)
        .sort(() => Math.random() - 0.5)
        .slice(0, 3);
      
      // If we don't have enough distractors, add generic academic ones
      while (distractors.length < 3) {
        distractors.push(`Alternative contextual interpretation ${distractors.length + 1}`);
      }

      const options = [q.answer, ...distractors].sort(() => Math.random() - 0.5);

      return {
        question: q.question,
        options,
        answer: q.answer,
        explanation: `Correct! "${q.answer}" is the precise academic and pedagogical answer for this concept.`
      };
    });
  }, [quizQuestions, flashcards, moduleTitle]);

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);

  const currentQ = questions[currentIndex];

  const handleSelect = (option: string) => {
    if (isAnswered) return;
    setSelectedOption(option);
    setIsAnswered(true);

    if (option === currentQ.answer) {
      setScore(prev => prev + 1);
    }
  };

  const nextQuestion = () => {
    if (currentIndex + 1 < questions.length) {
      setCurrentIndex(prev => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      setQuizFinished(true);
    }
  };

  const restartQuiz = () => {
    setCurrentIndex(0);
    setSelectedOption(null);
    setIsAnswered(false);
    setScore(0);
    setQuizFinished(false);
  };

  if (!questions || questions.length === 0) {
    return <div className="text-sm text-slate-500 p-4">No quiz questions available for this module.</div>;
  }

  if (quizFinished) {
    const percentage = Math.round((score / questions.length) * 100);
    return (
      <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-8 rounded-2xl shadow-sm text-center space-y-5">
        <Award className="w-16 h-16 text-teal-600 mx-auto animate-bounce" />
        <h4 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">Quiz Completed!</h4>
        <div className="inline-block px-4 py-2 bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 rounded-xl font-bold text-lg border border-teal-200 dark:border-teal-800">
          Score: {score} / {questions.length} ({percentage}%)
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto">
          {percentage >= 80 ? "Outstanding mastery! You have fully grasped the core lesson objectives." : "Good effort! Review the lesson presentation notes and try again to master all concepts."}
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-3">
          <button
            onClick={handleSubmitQuiz}
            disabled={submitted}
            className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:bg-emerald-600 text-white font-bold rounded-xl text-xs transition-colors shadow-md flex items-center gap-2 justify-center"
          >
            <CheckCircle2 className="w-4 h-4" /> {submitted ? 'Submitted ✓' : 'Submit Quiz Assignment'}
          </button>
          <button
            onClick={restartQuiz}
            className="px-5 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition-colors flex items-center gap-2 justify-center"
          >
            <RotateCcw className="w-4 h-4" /> Retake Quiz
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 rounded-2xl shadow-sm space-y-6">
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700 pb-3">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-teal-600" />
          <h4 className="font-extrabold text-slate-900 dark:text-slate-100 text-base">
            Formative Quiz Runner
          </h4>
        </div>
        <span className="text-xs font-bold px-3 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl">
          Question {currentIndex + 1} of {questions.length}
        </span>
      </div>

      <div className="space-y-4">
        <h5 className="font-bold text-slate-900 dark:text-slate-100 text-base">
          {currentQ.question}
        </h5>

        <div className="space-y-3">
          {currentQ.options.map((option, idx) => {
            const isSelected = selectedOption === option;
            const isCorrect = option === currentQ.answer;

            let btnStyle = "bg-slate-50 dark:bg-slate-900/60 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 hover:bg-slate-100";
            if (isAnswered) {
              if (isCorrect) {
                btnStyle = "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 font-bold shadow-sm";
              } else if (isSelected && !isCorrect) {
                btnStyle = "bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-700 text-rose-900 dark:text-rose-200 font-bold";
              } else {
                btnStyle = "bg-slate-50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800 text-slate-400 opacity-60";
              }
            }

            return (
              <button
                key={idx}
                onClick={() => handleSelect(option)}
                disabled={isAnswered}
                className={`w-full p-4 rounded-xl text-left text-sm transition-all border flex items-center justify-between ${btnStyle}`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-700 dark:text-slate-300">
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span>{option}</span>
                </div>
                {isAnswered && isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />}
                {isAnswered && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />}
              </button>
            );
          })}
        </div>

        {isAnswered && (
          <div className={`p-4 rounded-xl border animate-in fade-in duration-200 flex items-center justify-between ${
            selectedOption === currentQ.answer
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
          }`}>
            <div className="space-y-1">
              <p className="font-bold text-xs uppercase tracking-wider">
                {selectedOption === currentQ.answer ? '✓ Correct Answer!' : '✕ Incorrect'}
              </p>
              <p className="text-xs">{currentQ.explanation}</p>
            </div>
            <button
              onClick={nextQuestion}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs transition-colors shadow-md flex items-center gap-1.5 flex-shrink-0 ml-4"
            >
              <span>{currentIndex + 1 < questions.length ? 'Next Question' : 'View Results'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
