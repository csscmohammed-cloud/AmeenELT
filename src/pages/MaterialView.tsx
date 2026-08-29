import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, addDoc, updateDoc, deleteDoc, query, where, getDocs } from 'firebase/firestore';
import { db, sanitizeForFirestore } from '../firebase';
import { Material, QuizQuestion, UserProfile } from '../types';
import { ArrowLeft, CheckCircle2, XCircle, RotateCcw, Share2, Edit, Trash2, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { playSound } from '../utils/audio';
import { AudioRecorder } from '../components/AudioRecorder';
import { AssignModal } from '../components/AssignModal';
import { EditMaterialModal } from '../components/EditMaterialModal';
import { AIQuizGeneratorModal } from '../components/AIQuizGeneratorModal';
import { TeacherWorkspace } from '../components/workspace/TeacherWorkspace';
import { InteractiveCourseViewer } from '../components/InteractiveCourseViewer';

export function MaterialView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { soundEffects } = useSettings();
  const [material, setMaterial] = useState<Material | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAiQuizModal, setShowAiQuizModal] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  // Quiz state
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [score, setScore] = useState(0);
  const [showResults, setShowResults] = useState(false);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);

  const [currentCard, setCurrentCard] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [pronunciationResult, setPronunciationResult] = useState<any>(null);

  useEffect(() => {
    const fetchMaterial = async () => {
      if (!id) return;
      try {
        const docRef = doc(db, 'materials', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setMaterial({ id: docSnap.id, ...docSnap.data() } as Material);
        } else {
          setFetchError("Material not found");
        }
      } catch (error: any) {
        console.error("Error fetching material:", error);
        setFetchError("Database error (Quota exceeded or permissions).");
      } finally {
        setLoading(false);
      }
    };
    fetchMaterial();
  }, [id]);

  useEffect(() => {
    const checkSubmission = async () => {
      if (!id || !user) return;
      try {
        const q = query(collection(db, 'attempts'), where('materialId', '==', id), where('userId', '==', user.uid));
        const snap = await getDocs(q);
        if (!snap.empty) {
          setHasSubmitted(true);
        }
      } catch (e) {
        console.error("Error checking submission:", e);
      }
    };
    checkSubmission();
  }, [id, user]);

  if (loading) return <div className="p-8 text-center text-slate-500 dark:text-slate-400">Loading material...</div>;
  if (fetchError) return <div className="p-8 text-center text-red-500">{fetchError}</div>;
  if (!material) return <div className="p-8 text-center text-red-500">Material not found.</div>;

  const handleUpdate = async (updatedFields: Partial<Material>) => {
    if (!id) return;
    try {
      await updateDoc(doc(db, 'materials', id), sanitizeForFirestore(updatedFields));
      setMaterial({ ...material, ...updatedFields } as Material);
    } catch (e) {
      console.error(e);
      alert('Failed to update material');
    }
  };

  
  const handleDuplicate = async () => {
    if (!material) return;
    try {
      const newMaterial = { ...material, title: material.title + ' (Copy)', createdAt: Date.now() };
      delete newMaterial.id;
      const docRef = await addDoc(collection(db, 'materials'), sanitizeForFirestore(newMaterial));
      navigate(`/dashboard/materials/${docRef.id}`);
    } catch (e) {
      console.error(e);
      alert('Failed to duplicate material');
    }
  };

  const handleDelete = async () => {
    if (!id || !confirm('Are you sure you want to delete this resource?')) return;
    try {
      await deleteDoc(doc(db, 'materials', id));
      navigate('/dashboard');
    } catch (e) {
      console.error(e);
      alert('Failed to delete');
    }
  };

  if (profile?.role === 'teacher' && !previewMode) {
    return (
      <TeacherWorkspace 
        material={material} 
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        onDuplicate={handleDuplicate}
        onPreview={() => setPreviewMode(true)}
        onBack={() => navigate('/dashboard')}
      />
    );
  }

  const renderTeacherPreview = () => {
    const questions: QuizQuestion[] = material?.content?.questions || [];
    if (!questions || questions.length === 0) return <div>No questions available.</div>;

    return (
      <div className="max-w-4xl mx-auto space-y-8 pb-12">
        <div className="mb-4 flex items-center justify-between hide-print">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Teacher Full Preview (Answer Key)</h2>
        </div>
        {questions.map((q, idx) => (
          <div key={idx} className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 break-inside-avoid">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">{idx + 1}. {q.question}</h3>
            {q.mediaUrl && (
              <div className="mb-4 rounded-lg overflow-hidden flex justify-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2">
                {q.mediaType === 'image' && <img src={q.mediaUrl} alt="Question Media" className="max-h-48 object-contain" />}
                {q.mediaType === 'audio' && <audio controls src={q.mediaUrl} className="w-full max-w-md" />}
                {q.mediaType === 'video' && <video controls src={q.mediaUrl} className="max-h-48 w-full object-contain" />}
              </div>
            )}
            
            <div className="space-y-2">
              {q.options?.filter(opt => opt && opt.trim() !== "").map((opt, oIdx) => {
                const isCorrect = opt === q.correctAnswer || 
                                  (q.correctAnswer === 'A' && oIdx === 0) ||
                                  (q.correctAnswer === 'B' && oIdx === 1) ||
                                  (q.correctAnswer === 'C' && oIdx === 2) ||
                                  (q.correctAnswer === 'D' && oIdx === 3);
                
                return (
                  <div key={oIdx} className={`p-3 rounded-lg border-2 flex justify-between items-center ${isCorrect ? 'border-green-500 bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300 font-bold' : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'}`}>
                    <span>{String.fromCharCode(65 + oIdx)}. {opt}</span>
                    {isCorrect && <CheckCircle2 className="w-5 h-5 text-green-500" />}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderQuiz = () => {
    const questions: QuizQuestion[] = material?.content?.questions || [];
    if (!questions || questions.length === 0) return <div>No questions available.</div>;

    if (hasSubmitted && material?.allowRetakes === false && !showResults) {
      return (
        <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 text-center max-w-2xl mx-auto space-y-4">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Quiz Already Completed</h2>
          <p className="text-slate-600 dark:text-slate-400">
            You have already submitted this quiz. Retakes have been disabled by your instructor.
          </p>
          <button 
            onClick={() => navigate('/dashboard')}
            className="px-6 py-2.5 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors"
          >
            Return to Dashboard
          </button>
        </div>
      );
    }

    if (showResults) {
      return (
        <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 text-center max-w-2xl mx-auto space-y-6">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-4">Quiz Completed!</h2>
          <div className="text-5xl font-extrabold text-teal-600 mb-6">
            {score} <span className="text-2xl text-slate-400">/ {questions.length}</span>
          </div>
          <p className="text-slate-600 dark:text-slate-400 mb-4">
            {score === questions.length ? 'Perfect score! Outstanding job.' : 'Good effort! Keep practicing.'}
          </p>
          <div className="mt-2 mb-8 p-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg border border-green-200 dark:border-green-800 flex items-center justify-center gap-2">
            <CheckCircle2 className="w-5 h-5" />
            Your score has been submitted to your teacher!
          </div>
          {material?.allowRetakes === false ? (
            <p className="text-sm font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 p-3 rounded-lg">
              Quiz retakes have been disabled by your instructor.
            </p>
          ) : (
            <button 
              onClick={() => {
                setScore(0);
                setCurrentQuestion(0);
                setShowResults(false);
                setSelectedAnswer(null);
              }}
              className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors"
            >
              <RotateCcw className="w-5 h-5" />
              Retake Quiz
            </button>
          )}
        </div>
      );
    }

    const question = questions[currentQuestion];
    const isAnswered = selectedAnswer !== null;

    const handleAnswerClick = (option: string) => {
      if (isAnswered) return;
      setSelectedAnswer(option);
      
      let isCorrect = option === question.correctAnswer;
      if (question.questionType === 'short-answer') {
        isCorrect = option.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase();
      }

      if (soundEffects) {
        playSound(isCorrect ? 'correct' : 'incorrect');
      }
      
      if (isCorrect) {
        setScore(score + 1);
      }
    };

    const nextQuestion = async () => {
      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
        setSelectedAnswer(null);
      } else {
        setShowResults(true);
        if (user && material) {
          try {
            await addDoc(collection(db, 'attempts'), {
              userId: user.uid,
              userEmail: user.email || '',
              userName: profile?.name || user.displayName || user.email || 'Student',
              userUniversityId: profile?.universityId || '',
              materialId: material.id,
              type: 'quiz',
              score,
              totalQuestions: questions.length,
              completedAt: Date.now()
            });

            // Update user XP and points
            const userRef = doc(db, 'users', user.uid);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
              const userData = userSnap.data() as UserProfile;
              const currentXp = userData.xp || 0;
              const currentPoints = userData.points || 0;
              
              const earnedXp = score * 10;
              const earnedPoints = score * 5;
              
              await updateDoc(userRef, {
                xp: currentXp + earnedXp,
                points: currentPoints + earnedPoints
              });
            }

          } catch (error) {
            console.error('Error saving quiz attempt or updating profile:', error);
          }
        }
      }
    };

    return (
      <div className="max-w-3xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-500 dark:text-slate-400">Question {currentQuestion + 1} of {questions.length}</span>
          <div className="flex gap-1">
            {questions.map((_, idx) => (
              <div key={idx} className={`h-2 w-8 rounded-full ${idx === currentQuestion ? 'bg-teal-600' : idx < currentQuestion ? 'bg-teal-200' : 'bg-slate-200'}`} />
            ))}
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <h3 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-6">{question.question}</h3>
          
          {question.mediaUrl && (
            <div className="mb-6 rounded-lg overflow-hidden flex justify-center bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 p-2">
              {question.mediaType === 'image' && (
                <img src={question.mediaUrl} alt="Question Media" className="max-h-64 object-contain" />
              )}
              {question.mediaType === 'audio' && (
                <audio controls src={question.mediaUrl} className="w-full max-w-md" />
              )}
              {question.mediaType === 'video' && (
                <video controls src={question.mediaUrl} className="max-h-64 w-full object-contain" />
              )}
            </div>
          )}

          {(!question.questionType || question.questionType === 'multiple-choice' || question.questionType === 'true-false') && (
            <div className="space-y-3">
              {question.options.filter(opt => opt && opt.trim() !== "").map((option, idx) => {
                const isSelected = selectedAnswer === option;
                
                const isCorrect = option === question.correctAnswer || 
                                  (question.correctAnswer === 'A' && idx === 0) ||
                                  (question.correctAnswer === 'B' && idx === 1) ||
                                  (question.correctAnswer === 'C' && idx === 2) ||
                                  (question.correctAnswer === 'D' && idx === 3);

                
                let btnClass = "w-full text-left p-4 rounded-lg border-2 transition-all font-medium flex justify-between items-center ";
                
                if (!isAnswered) {
                  btnClass += "border-slate-200 dark:border-slate-700 hover:border-teal-600 hover:bg-teal-50 text-slate-700 dark:text-slate-300";
                } else {
                  if (isCorrect) {
                    btnClass += "border-green-500 bg-green-50 text-green-700";
                  } else if (isSelected && !isCorrect) {
                    btnClass += "border-red-500 bg-red-50 text-red-700";
                  } else {
                    btnClass += "border-slate-200 dark:border-slate-700 text-slate-400 opacity-50";
                  }
                }

                return (
                  <button
                    key={idx}
                    disabled={isAnswered}
                    onClick={() => handleAnswerClick(option)}
                    className={btnClass}
                  >
                    <span>{option}</span>
                    {isAnswered && isCorrect && <CheckCircle2 className="w-5 h-5 text-green-600" />}
                    {isAnswered && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-red-600" />}
                  </button>
                );
              })}
            </div>
          )}

          {question.questionType === 'fill-in-the-blank' && (
            <div className="space-y-6">
              <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl text-amber-900 dark:text-amber-200 text-lg font-medium leading-relaxed">
                {question.question.split('___').map((part, idx, arr) => (
                  <span key={idx}>
                    {part}
                    {idx < arr.length - 1 && (
                      <span className={`inline-block mx-1 px-3 py-1 rounded-lg border-2 font-bold min-w-[100px] text-center transition-all ${
                        isAnswered
                          ? selectedAnswer?.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase()
                            ? 'bg-green-100 border-green-500 text-green-800 dark:bg-green-900/60 dark:text-green-200'
                            : 'bg-red-100 border-red-500 text-red-800 dark:bg-red-900/60 dark:text-red-200'
                          : selectedAnswer
                          ? 'bg-purple-100 border-purple-500 text-purple-900 dark:bg-purple-900/40 dark:text-purple-200'
                          : 'bg-white dark:bg-slate-800 border-dashed border-amber-400 text-amber-600 dark:text-amber-400'
                      }`}>
                        {selectedAnswer || '___'}
                      </span>
                    )}
                  </span>
                ))}
              </div>

              {/* Option Word Bank if available */}
              {question.options && question.options.filter(o => o && o.trim() !== "").length > 0 ? (
                <div className="space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Choose the word that fills the blank:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {question.options.filter(opt => opt && opt.trim() !== "").map((option, idx) => {
                      const isSelected = selectedAnswer === option;
                      const isCorrect = option === question.correctAnswer;
                      let btnClass = "w-full text-left p-4 rounded-xl border-2 transition-all font-medium flex justify-between items-center ";
                      
                      if (!isAnswered) {
                        btnClass += isSelected 
                          ? "border-purple-600 bg-purple-50 text-purple-800 dark:bg-purple-950/40 dark:text-purple-200 font-bold"
                          : "border-slate-200 dark:border-slate-700 hover:border-purple-400 hover:bg-purple-50/50 text-slate-700 dark:text-slate-300";
                      } else {
                        if (isCorrect) {
                          btnClass += "border-green-500 bg-green-50 text-green-700 font-bold";
                        } else if (isSelected && !isCorrect) {
                          btnClass += "border-red-500 bg-red-50 text-red-700";
                        } else {
                          btnClass += "border-slate-200 dark:border-slate-700 text-slate-400 opacity-50";
                        }
                      }

                      return (
                        <button
                          key={idx}
                          disabled={isAnswered}
                          onClick={() => handleAnswerClick(option)}
                          className={btnClass}
                        >
                          <span>{option}</span>
                          {isAnswered && isCorrect && <CheckCircle2 className="w-5 h-5 text-green-600" />}
                          {isAnswered && isSelected && !isCorrect && <XCircle className="w-5 h-5 text-red-600" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <input 
                    type="text"
                    placeholder="Type the missing word/phrase here..."
                    disabled={isAnswered}
                    value={selectedAnswer || ''}
                    onChange={e => setSelectedAnswer(e.target.value)}
                    className={`w-full p-4 text-lg border-2 rounded-xl font-medium outline-none transition-all ${
                      isAnswered 
                        ? selectedAnswer?.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase()
                          ? 'border-green-500 bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-200'
                          : 'border-red-500 bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-200'
                        : 'border-slate-300 dark:border-slate-600 focus:border-purple-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                    }`}
                  />
                  {!isAnswered && (
                    <button 
                      onClick={() => {
                        if (!selectedAnswer) return;
                        handleAnswerClick(selectedAnswer);
                      }}
                      className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700 disabled:opacity-50"
                      disabled={!selectedAnswer}
                    >
                      Submit Answer
                    </button>
                  )}
                </div>
              )}

              {isAnswered && (
                <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-300">
                  <span className="font-bold text-slate-900 dark:text-slate-100">Correct Blank:</span> {question.correctAnswer}
                  {question.explanation && <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 italic">💡 {question.explanation}</p>}
                </div>
              )}
            </div>
          )}

          {question.questionType === 'short-answer' && (
            <div className="space-y-4">
              <input 
                type="text"
                placeholder="Type your answer here..."
                disabled={isAnswered}
                value={selectedAnswer || ''}
                onChange={e => setSelectedAnswer(e.target.value)}
                className={`w-full p-4 text-lg border-2 rounded-lg font-medium outline-none transition-all ${
                  isAnswered 
                    ? selectedAnswer?.trim().toLowerCase() === question.correctAnswer.trim().toLowerCase()
                      ? 'border-green-500 bg-green-50 text-green-800 dark:bg-green-900/30 dark:text-green-200'
                      : 'border-red-500 bg-red-50 text-red-800 dark:bg-red-900/30 dark:text-red-200'
                    : 'border-slate-300 dark:border-slate-600 focus:border-teal-600 dark:focus:border-teal-400 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100'
                }`}
              />
              {!isAnswered ? (
                <button 
                  onClick={() => {
                    if (!selectedAnswer) return;
                    handleAnswerClick(selectedAnswer);
                  }}
                  className="w-full py-3 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 disabled:opacity-50"
                  disabled={!selectedAnswer}
                >
                  Submit Answer
                </button>
              ) : (
                <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-700 dark:text-slate-300">
                  <span className="font-semibold text-slate-900 dark:text-slate-100">Correct Answer:</span> {question.correctAnswer}
                </div>
              )}
            </div>
          )}

          {isAnswered && (
            <div className="mt-8 flex justify-end">
              <button 
                onClick={nextQuestion}
                className="px-6 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors"
              >
                {currentQuestion < questions.length - 1 ? 'Next Question' : 'View Results'}
              </button>
            </div>
          )}
        </div>
        <div className="mt-8 flex justify-center hide-print">
          <button 
            onClick={async () => {
              if (user && material) {
                try {
                  await addDoc(collection(db, 'attempts'), {
                    userId: user.uid,
                    userEmail: user.email || '',
                    userName: profile?.name || user.displayName || user.email || 'Student',
                    userUniversityId: profile?.universityId || '',
                    materialId: material.id,
                    type: material.type,
                    score: 1,
                    totalQuestions: 1,
                    completedAt: Date.now()
                  });
                  // Update points
                  const userRef = doc(db, 'users', user.uid);
                  const userSnap = await getDoc(userRef);
                  if (userSnap.exists()) {
                    const userData = userSnap.data();
                    await updateDoc(userRef, {
                      xp: (userData.xp || 0) + 20,
                      points: (userData.points || 0) + 10
                    });
                  }
                  alert("Material marked as completed!");
                } catch(e) {
                  console.error("Error saving completion", e);
                }
              }
            }}
            className="px-8 py-3 bg-teal-600 text-white font-bold rounded-lg hover:bg-teal-700 transition-colors shadow-md flex items-center gap-2"
          >
            <CheckCircle2 className="w-5 h-5" /> Mark as Completed
          </button>
        </div>

      </div>
    );
  };

  const submitPronunciation = async () => {
    if (user && material && pronunciationResult) {
      try {
        await addDoc(collection(db, 'attempts'), {
          userId: user.uid,
          userEmail: user.email || '',
          userName: profile?.name || user.displayName || user.email || 'Student',
          userUniversityId: profile?.universityId || '',
          materialId: material.id,
          type: 'pronunciation',
          score: pronunciationResult.score,
          aiScore: pronunciationResult.score,
          aiFeedback: pronunciationResult.feedback,
          audioUrl: pronunciationResult.audioData,
          totalQuestions: 100,
          completedAt: Date.now()
        });
        
        // Update points
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.data();
          const currentXp = userData.xp || 0;
          const currentPoints = userData.points || 0;
          
          const earnedXp = Math.round(pronunciationResult.score / 2);
          const earnedPoints = Math.round(pronunciationResult.score / 4);
          
          await updateDoc(userRef, {
            xp: currentXp + earnedXp,
            points: currentPoints + earnedPoints
          });
        }
        setHasSubmitted(true);
      } catch(e) {
        console.error("Error saving pronunciation attempt", e);
        alert("Failed to submit assignment.");
      }
    }
  };

  const renderPronunciation = () => {
    const passage = material?.content?.passage;
    if (!passage) return <div>No pronunciation content available.</div>;

    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100 mb-6">Read the following passage:</h2>
          <div className="p-6 bg-teal-50 dark:bg-teal-900/20 rounded-lg border border-teal-100 dark:border-teal-800 mb-8">
            <p className="text-xl leading-relaxed text-slate-800 dark:text-slate-200 font-serif">
              {passage}
            </p>
          </div>
          
          <AudioRecorder 
            passage={passage} 
            measures={material.content.measures} 
            onEvaluate={setPronunciationResult}
            onRecordingStart={() => {
              setPronunciationResult(null);
              setHasSubmitted(false);
            }}
          />

          {pronunciationResult && !hasSubmitted && (
             <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-700 flex flex-col items-center animate-in slide-in-from-bottom-4 duration-500">
                <div className="text-center mb-6">
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Evaluation Complete</h3>
                  <p className="text-slate-600 dark:text-slate-400 max-w-lg mx-auto">
                    Review your AI feedback above. If you are satisfied with this attempt, you can submit it to your teacher. Otherwise, record again to improve your score!
                  </p>
                </div>
                <button
                  onClick={submitPronunciation}
                  className="px-8 py-3 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-full shadow-lg transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  Submit Assignment
                </button>
             </div>
          )}
          {hasSubmitted && (
            <div className="mt-8 p-4 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg border border-green-200 dark:border-green-800 flex items-center justify-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              This assignment has been submitted!
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderCourse = () => {
    const modules = material.content.modules || [];
    return (
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="prose dark:prose-invert max-w-none bg-white dark:bg-slate-800 p-8 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
          <h2 className="text-2xl font-bold mb-4">{material.title}</h2>
          <p className="text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{material.content.description}</p>
        </div>
        
        {modules.map((m: any, idx: number) => (
          <div key={idx} className="bg-white dark:bg-slate-800 p-8 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-4">Module {idx + 1}: {m.title}</h3>
            <div className="prose dark:prose-invert max-w-none text-slate-700 dark:text-slate-300">
              <p className="whitespace-pre-wrap">{m.content}</p>
            </div>
          </div>
        ))}
        
        {profile?.role === 'student' && (
          <div className="flex justify-center mt-12 hide-print">
            <button
              onClick={async () => {
                if (user && material) {
                  try {
                    await addDoc(collection(db, 'attempts'), {
                      userId: user.uid,
                      userEmail: user.email || '',
                      userName: user.displayName || user.email || 'Student',
                      materialId: material.id,
                      score: 100,
                      total: 100,
                      completedAt: Date.now()
                    });
                    const userRef = doc(db, 'users', user.uid);
                    const userSnap = await getDoc(userRef);
                    if (userSnap.exists()) {
                      const userData = userSnap.data();
                      await updateDoc(userRef, {
                        xp: (userData.xp || 0) + 20,
                        points: (userData.points || 0) + 10
                      });
                    }
                    alert("Material marked as completed!");
                  } catch(e) {
                    console.error("Error saving completion", e);
                  }
                }
              }}
              className="px-8 py-3 bg-teal-600 text-white font-bold rounded-lg hover:bg-teal-700 transition-colors shadow-md flex items-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5" /> Mark as Completed (+20 XP)
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="pb-16 px-4 sm:px-0 relative">
      <div className="flex items-center justify-between mb-8">
        <button 
          onClick={() => {
            if (previewMode && profile?.role === 'teacher') {
              setPreviewMode(false);
            } else {
              navigate('/dashboard');
            }
          }}
          className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-teal-600 transition-colors hide-print"
        >
          <ArrowLeft className="w-4 h-4" />
          {previewMode && profile?.role === 'teacher' ? 'Exit Preview' : 'Back to Dashboard'}
        </button>

        <div className="flex items-center gap-3">
          {profile?.role === 'teacher' && !previewMode && (
            <>
              <button
                onClick={() => setShowAiQuizModal(true)}
                className="flex items-center gap-2 text-sm font-semibold text-purple-700 bg-purple-50 hover:bg-purple-100 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800 px-3 py-1.5 rounded-md transition-colors hide-print shadow-sm"
              >
                <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                Generate AI Quiz
              </button>
              <button
                onClick={() => setShowEditModal(true)}
                className="flex items-center gap-2 text-sm font-medium text-slate-700 bg-slate-100 px-3 py-1.5 rounded-md hover:bg-slate-200 transition-colors hide-print"
              >
                <Edit className="w-4 h-4" />
                Edit
              </button>
              <button
                onClick={handleDelete}
                className="flex items-center gap-2 text-sm font-medium text-red-600 bg-red-50 px-3 py-1.5 rounded-md hover:bg-red-100 transition-colors hide-print"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
              <button
                onClick={() => setShowAssignModal(true)}
                className="flex items-center gap-2 text-sm font-medium text-white bg-teal-600 px-4 py-2 rounded-md hover:bg-teal-700 transition-colors hide-print shadow-sm"
              >
                <Share2 className="w-4 h-4" />
                Assign to Students
              </button>
            </>
          )}
        </div>
      </div>

      <div className="mb-10 text-center">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-2">{material.title}</h1>
        <p className="text-slate-500 dark:text-slate-400 uppercase tracking-wider text-sm font-semibold">{material.type} • {material.topic}</p>
      </div>

      {material.type === 'quiz' && (previewMode && profile?.role === 'teacher' ? renderTeacherPreview() : renderQuiz())}
      {material.type === 'pronunciation' && renderPronunciation()}
      {material.type === 'course' && renderCourse()}
      {material.type === 'interactive-course' && <InteractiveCourseViewer content={material.content} />}
      
      {showAssignModal && material && (
        <AssignModal 
          material={material} 
          onClose={() => setShowAssignModal(false)}
          onAssigned={(updatedGroups, updatedUsers, dueDate) => {
            setMaterial({ ...material, assignedGroups: updatedGroups, assignedUsers: updatedUsers, dueDate: dueDate || undefined });
            setShowAssignModal(false);
          }}
        />
      )}

      {showEditModal && material && (
        <EditMaterialModal
          material={material}
          onClose={() => setShowEditModal(false)}
          onUpdated={(updatedMaterial) => {
            setMaterial(updatedMaterial);
            setShowEditModal(false);
          }}
        />
      )}

      {showAiQuizModal && (
        <AIQuizGeneratorModal
          isOpen={showAiQuizModal}
          onClose={() => setShowAiQuizModal(false)}
          initialMaterial={material}
          onQuestionsGenerated={(questions, title) => {
            setShowAiQuizModal(false);
          }}
        />
      )}
    </div>
  );
}
