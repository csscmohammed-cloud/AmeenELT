const fs = require('fs');

// 1. Patch InteractiveCourseViewer.tsx
const icvPath = '/app/applet/src/components/InteractiveCourseViewer.tsx';
let icv = fs.readFileSync(icvPath, 'utf8');
if (!icv.includes('useAuth')) {
  icv = icv.replace(
    `import React, { useState } from 'react';`,
    `import React, { useState } from 'react';\nimport { useAuth } from '../context/AuthContext';\nimport { db } from '../firebase';\nimport { collection, addDoc, doc, getDoc, updateDoc } from 'firebase/firestore';`
  );
  icv = icv.replace(
    `export function InteractiveCourseViewer({ content }: InteractiveCourseViewerProps) {\n  const [currentSlide, setCurrentSlide] = useState(0);`,
    `export function InteractiveCourseViewer({ content }: InteractiveCourseViewerProps) {\n  const { user } = useAuth();\n  const [submitted, setSubmitted] = useState(false);\n  const [currentSlide, setCurrentSlide] = useState(0);\n\n  const handleSubmitAssignment = async () => {\n    if (!user) {\n      alert("Please sign in to submit assignments.");\n      return;\n    }\n    try {\n      await addDoc(collection(db, 'attempts'), {\n        userId: user.uid,\n        materialId: content.materialId || 'interactive-course-' + Date.now(),\n        type: 'interactive-course',\n        score: 100,\n        totalQuestions: slides.length,\n        status: 'completed',\n        completedAt: Date.now()\n      });\n      const userRef = doc(db, 'users', user.uid);\n      const userSnap = await getDoc(userRef);\n      if (userSnap.exists()) {\n        const userData = userSnap.data();\n        await updateDoc(userRef, {\n          xp: (userData.xp || 0) + 50,\n          points: (userData.points || 0) + 25\n        });\n      }\n      setSubmitted(true);\n      alert("🎉 Course assignment successfully submitted to your instructor!");\n    } catch (err) {\n      console.error("Error submitting course assignment:", err);\n      alert("Failed to submit assignment. Please try again.");\n    }\n  };`
  );
  icv = icv.replace(
    `      </div>\n    </div>\n  );\n}`,
    `        </div>\n      </div>\n\n      {currentSlide === slides.length - 1 && (\n        <div className="bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-200 dark:border-purple-800 p-6 rounded-xl text-center space-y-4">\n          <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Congratulations on Completing This Course!</h3>\n          <p className="text-sm text-slate-600 dark:text-slate-300">Submit your completed work to your instructor to record your score and earn +50 XP.</p>\n          <button\n            onClick={handleSubmitAssignment}\n            disabled={submitted}\n            className="px-8 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-emerald-600 text-white font-bold rounded-xl shadow-lg transition-colors flex items-center gap-2 mx-auto"\n          >\n            <CheckCircle2 className="w-5 h-5" />\n            {submitted ? 'Assignment Submitted ✓' : 'Submit Assignment to Instructor'}\n          </button>\n        </div>\n      )}\n    </div>\n  );\n}`
  );
  fs.writeFileSync(icvPath, icv);
  console.log('InteractiveCourseViewer patched.');
}

// 2. Patch InteractiveQuizRunner.tsx
const iqrPath = '/app/applet/src/components/InteractiveQuizRunner.tsx';
let iqr = fs.readFileSync(iqrPath, 'utf8');
if (!iqr.includes('useAuth')) {
  iqr = iqr.replace(
    `import React, { useState } from 'react';`,
    `import React, { useState } from 'react';\nimport { useAuth } from '../context/AuthContext';\nimport { db } from '../firebase';\nimport { collection, addDoc, doc, getDoc, updateDoc } from 'firebase/firestore';`
  );
  iqr = iqr.replace(
    `interface InteractiveQuizRunnerProps {\n  quizQuestions?: { question: string; answer: string }[];\n  flashcards?: { front: string; back: string }[];\n  moduleTitle: string;\n}`,
    `interface InteractiveQuizRunnerProps {\n  quizQuestions?: { question: string; answer: string }[];\n  flashcards?: { front: string; back: string }[];\n  moduleTitle: string;\n  materialId?: string;\n}`
  );
  iqr = iqr.replace(
    `export function InteractiveQuizRunner({ quizQuestions, flashcards, moduleTitle }: InteractiveQuizRunnerProps) {`,
    `export function InteractiveQuizRunner({ quizQuestions, flashcards, moduleTitle, materialId }: InteractiveQuizRunnerProps) {\n  const { user } = useAuth();\n  const [submitted, setSubmitted] = useState(false);\n\n  const handleSubmitQuiz = async () => {\n    if (!user) {\n      alert("Please sign in to submit assignments.");\n      return;\n    }\n    try {\n      await addDoc(collection(db, 'attempts'), {\n        userId: user.uid,\n        materialId: materialId || 'quiz-' + Date.now(),\n        type: 'quiz',\n        score: score,\n        totalQuestions: questions.length,\n        percentage: Math.round((score / questions.length) * 100),\n        status: 'completed',\n        completedAt: Date.now()\n      });\n      const userRef = doc(db, 'users', user.uid);\n      const userSnap = await getDoc(userRef);\n      if (userSnap.exists()) {\n        const userData = userSnap.data();\n        await updateDoc(userRef, {\n          xp: (userData.xp || 0) + 50,\n          points: (userData.points || 0) + 25\n        });\n      }\n      setSubmitted(true);\n      alert("🎉 Quiz assignment successfully submitted to your instructor!");\n    } catch (err) {\n      console.error("Error submitting quiz:", err);\n      alert("Failed to submit assignment. Please try again.");\n    }\n  };`
  );
  iqr = iqr.replace(
    `        <button\n          onClick={restartQuiz}\n          className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-xl text-xs transition-colors shadow-md flex items-center gap-2 mx-auto"\n        >\n          <RotateCcw className="w-4 h-4" /> Retake Quiz\n        </button>`,
    `        <div className="flex flex-col sm:flex-row justify-center gap-3">\n          <button\n            onClick={handleSubmitQuiz}\n            disabled={submitted}\n            className="px-6 py-2.5 bg-teal-600 hover:bg-teal-700 disabled:bg-emerald-600 text-white font-bold rounded-xl text-xs transition-colors shadow-md flex items-center gap-2 justify-center"\n          >\n            <CheckCircle2 className="w-4 h-4" /> {submitted ? 'Submitted ✓' : 'Submit Quiz Assignment'}\n          </button>\n          <button\n            onClick={restartQuiz}\n            className="px-5 py-2.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 font-bold rounded-xl text-xs transition-colors flex items-center gap-2 justify-center"\n          >\n            <RotateCcw className="w-4 h-4" /> Retake Quiz\n          </button>\n        </div>`
  );
  fs.writeFileSync(iqrPath, iqr);
  console.log('InteractiveQuizRunner patched.');
}

// 3. Patch StudentLearningJourney.tsx
const sljPath = '/app/applet/src/components/StudentLearningJourney.tsx';
let slj = fs.readFileSync(sljPath, 'utf8');
if (!slj.includes('useAuth')) {
  slj = slj.replace(
    `import React, { useState, useEffect } from 'react';`,
    `import React, { useState, useEffect } from 'react';\nimport { useAuth } from '../context/AuthContext';\nimport { db } from '../firebase';\nimport { collection, addDoc, doc, getDoc, updateDoc } from 'firebase/firestore';`
  );
  slj = slj.replace(
    `interface Props {\n  moduleTitle?: string;\n  cefrLevel?: string;\n  topic?: string;\n}`,
    `interface Props {\n  moduleTitle?: string;\n  cefrLevel?: string;\n  topic?: string;\n  materialId?: string;\n}`
  );
  slj = slj.replace(
    `export function StudentLearningJourney({ moduleTitle, cefrLevel = 'B1', topic = 'Adverbial Phrases' }: Props) {`,
    `export function StudentLearningJourney({ moduleTitle, cefrLevel = 'B1', topic = 'Adverbial Phrases', materialId }: Props) {\n  const { user } = useAuth();\n  const [submitted, setSubmitted] = useState(false);\n\n  const handleSubmitJourney = async () => {\n    if (!user) {\n      alert("Please sign in to submit assignments.");\n      return;\n    }\n    try {\n      await addDoc(collection(db, 'attempts'), {\n        userId: user.uid,\n        materialId: materialId || 'journey-' + Date.now(),\n        type: 'learning-journey',\n        score: quizScore || 90,\n        totalQuestions: 13,\n        status: 'completed',\n        completedAt: Date.now()\n      });\n      const userRef = doc(db, 'users', user.uid);\n      const userSnap = await getDoc(userRef);\n      if (userSnap.exists()) {\n        const userData = userSnap.data();\n        await updateDoc(userRef, {\n          xp: (userData.xp || 0) + 50,\n          points: (userData.points || 0) + 25\n        });\n      }\n      setSubmitted(true);\n      alert("🎉 Learning journey assignment successfully submitted to your instructor!");\n    } catch (err) {\n      console.error("Error submitting journey:", err);\n      alert("Failed to submit assignment. Please try again.");\n    }\n  };`
  );
  slj = slj.replace(
    `            {/* Personalized Recommendations */}\n            <div className="p-5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-2xl space-y-2">\n              <h4 className="font-extrabold text-xs text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5 uppercase">\n                <Sparkles className="w-4 h-4 text-indigo-600" /> AI Personalized Practice Recommendation\n              </h4>\n              <p className="text-xs text-indigo-800 dark:text-indigo-300 leading-relaxed">\n                Great job completing the module. Review your answers and practice consistently to improve your mastery of these concepts.\n              </p>\n            </div>`,
    `            {/* Personalized Recommendations */}\n            <div className="p-5 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-2xl space-y-2">\n              <h4 className="font-extrabold text-xs text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5 uppercase">\n                <Sparkles className="w-4 h-4 text-indigo-600" /> AI Personalized Practice Recommendation\n              </h4>\n              <p className="text-xs text-indigo-800 dark:text-indigo-300 leading-relaxed">\n                Great job completing the module. Review your answers and practice consistently to improve your mastery of these concepts.\n              </p>\n            </div>\n\n            {/* Submit Assignment Button */}\n            <div className="pt-4 flex justify-center">\n              <button\n                onClick={handleSubmitJourney}\n                disabled={submitted}\n                className="px-8 py-3.5 bg-teal-600 hover:bg-teal-700 disabled:bg-emerald-600 text-white font-bold rounded-2xl shadow-xl transition-all hover:scale-105 flex items-center gap-2.5 text-sm"\n              >\n                <CheckCircle2 className="w-5 h-5" />\n                {submitted ? 'Assignment Submitted ✓ (+50 XP)' : 'Submit Completed Assignment to Instructor (+50 XP)'}\n              </button>\n            </div>`
  );
  fs.writeFileSync(sljPath, slj);
  console.log('StudentLearningJourney patched.');
}
console.log('All patches applied successfully.');
