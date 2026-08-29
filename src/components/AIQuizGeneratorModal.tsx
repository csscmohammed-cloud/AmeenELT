import React, { useState, useEffect } from 'react';
import { collection, getDocs, addDoc, query, where } from 'firebase/firestore';
import { db, sanitizeForFirestore } from '../firebase';
import { Material, QuizQuestion } from '../types';
import { useAuth } from '../context/AuthContext';
import { 
  Sparkles, 
  BookOpen, 
  HelpCircle, 
  CheckCircle2, 
  X, 
  Plus, 
  Trash2, 
  Edit3, 
  FileText, 
  BrainCircuit, 
  Layers, 
  ArrowRight,
  RefreshCw,
  Check,
  AlertCircle
} from 'lucide-react';

interface AIQuizGeneratorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMaterial?: Material | null;
  initialContent?: string;
  initialTitle?: string;
  onQuestionsGenerated?: (questions: QuizQuestion[], title?: string) => void;
}

export function AIQuizGeneratorModal({
  isOpen,
  onClose,
  initialMaterial,
  initialContent = '',
  initialTitle = '',
  onQuestionsGenerated
}: AIQuizGeneratorModalProps) {
  const { user, profile } = useAuth();
  
  // Available course materials for selection
  const [courseMaterials, setCourseMaterials] = useState<Material[]>([]);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  
  // Selection mode: 'select' (existing material) | 'custom' (pasted text)
  const [sourceMode, setSourceMode] = useState<'select' | 'custom'>('select');
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('');
  const [customTitle, setCustomTitle] = useState(initialTitle);
  const [customContent, setCustomContent] = useState(initialContent);
  
  // Generation Settings
  const [questionType, setQuestionType] = useState<'multiple-choice' | 'fill-in-the-blank' | 'mixed'>('mixed');
  const [count, setCount] = useState<number>(5);
  const [difficulty, setDifficulty] = useState<'Easy' | 'Medium' | 'Hard'>('Medium');
  const [focus, setFocus] = useState<string>('');
  const [autoGenerateAudio, setAutoGenerateAudio] = useState<boolean>(false);
  
  // Status & Output
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [generatedQuizTitle, setGeneratedQuizTitle] = useState<string>('');
  const [generatedQuestions, setGeneratedQuestions] = useState<QuizQuestion[]>([]);
  
  // Edit mode for generated questions
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [isSavedToDb, setIsSavedToDb] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch materials on modal open
  useEffect(() => {
    if (!isOpen) return;
    
    // Reset state
    setError(null);
    setIsSavedToDb(false);
    
    if (initialMaterial) {
      setSelectedMaterialId(initialMaterial.id || '');
      setSourceMode('select');
      setCourseMaterials([initialMaterial]);
    } else {
      fetchCourseMaterials();
    }
  }, [isOpen, initialMaterial?.id]);

  const fetchCourseMaterials = async () => {
    setLoadingMaterials(true);
    try {
      const q = query(collection(db, 'materials'));
      const querySnapshot = await getDocs(q);
      const list: Material[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data() as Material;
        // Include course materials or materials with readable content
        if (data.type === 'course' || data.type === 'pronunciation' || data.content) {
          list.push({ id: doc.id, ...data });
        }
      });
      setCourseMaterials(list);
      if (list.length > 0 && !selectedMaterialId) {
        setSelectedMaterialId(list[0].id || '');
      }
    } catch (err) {
      console.error("Error fetching course materials:", err);
    } finally {
      setLoadingMaterials(false);
    }
  };

  if (!isOpen) return null;

  // Selected material helper
  const selectedMaterial = courseMaterials.find(m => m.id === selectedMaterialId);

  // Extract readable text from selected material
  const getSelectedContentString = (): { title: string; contentText: string } => {
    if (sourceMode === 'custom') {
      return {
        title: customTitle || 'Custom Material',
        contentText: customContent
      };
    }

    if (!selectedMaterial) {
      return { title: 'Selected Course Material', contentText: '' };
    }

    const title = selectedMaterial.title;
    let text = `${selectedMaterial.title}\n${selectedMaterial.topic}\n`;

    if (selectedMaterial.type === 'course' && selectedMaterial.content?.modules) {
      text += selectedMaterial.content.modules
        .map((m: any, idx: number) => `Module ${idx + 1}: ${m.title}\n${m.content || ''}`)
        .join('\n\n');
    } else if (selectedMaterial.type === 'pronunciation' && selectedMaterial.content?.passage) {
      text += selectedMaterial.content.passage;
    } else if (typeof selectedMaterial.content === 'string') {
      text += selectedMaterial.content;
    } else {
      text += JSON.stringify(selectedMaterial.content);
    }

    return { title, contentText: text };
  };

  const handleGenerate = async () => {
    const { title, contentText } = getSelectedContentString();
    
    if (!contentText || contentText.trim().length < 10) {
      setError('Please select a course material with content or paste at least 10 characters of course text.');
      return;
    }

    setError(null);
    setIsGenerating(true);
    setGenerationStep('Analyzing course material text & extracting key concepts...');

    try {
      setTimeout(() => setGenerationStep('Drafting questions & plausible distractors...'), 1200);
      
      const response = await fetch('/api/generate-quiz-from-material', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          materialTitle: title,
          materialContent: contentText,
          questionType,
          count,
          difficulty,
          focus,
          generateAudio: autoGenerateAudio
        })
      });

      if (!response.ok) {
        let errMsg = `Server returned status ${response.status}`;
        try {
          const errData = await response.json();
          if (errData.error) errMsg = errData.error;
        } catch (_) {}
        throw new Error(errMsg);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      setGeneratedQuizTitle(data.title || `Quiz: ${title}`);
      setGeneratedQuestions(data.questions || []);
      setIsSavedToDb(false);
    } catch (err: any) {
      console.error("Generation error:", err);
      setError(err.message || "Failed to generate quiz. Please check your network connection and try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUpdateQuestion = (index: number, updated: QuizQuestion) => {
    const newQuestions = [...generatedQuestions];
    newQuestions[index] = updated;
    setGeneratedQuestions(newQuestions);
  };

  const handleDeleteQuestion = (index: number) => {
    setGeneratedQuestions(generatedQuestions.filter((_, i) => i !== index));
  };

  const handleAddQuestion = () => {
    const newQ: QuizQuestion = {
      id: `q-${Date.now()}-${generatedQuestions.length}`,
      questionType: questionType === 'fill-in-the-blank' ? 'fill-in-the-blank' : 'multiple-choice',
      question: questionType === 'fill-in-the-blank' ? 'Fill in the blank: The primary process in plants is ___.' : 'New Question Text?',
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctAnswer: 'Option A',
      explanation: 'Explanation of the correct answer.'
    };
    setGeneratedQuestions([...generatedQuestions, newQ]);
  };

  const handleSaveToFirestore = async () => {
    if (!generatedQuestions || generatedQuestions.length === 0) return;
    
    setIsSaving(true);
    try {
      const newMaterial: Partial<Material> = {
        type: 'quiz',
        title: generatedQuizTitle || 'AI Generated Quiz',
        topic: selectedMaterial?.topic || 'Course Review',
        content: {
          questions: generatedQuestions
        },
        createdAt: Date.now(),
        createdBy: user?.uid || 'teacher'
      };

      await addDoc(collection(db, 'materials'), sanitizeForFirestore(newMaterial));
      setIsSavedToDb(true);
      
      if (onQuestionsGenerated) {
        onQuestionsGenerated(generatedQuestions, generatedQuizTitle);
      }
    } catch (err: any) {
      console.error("Failed to save quiz:", err);
      alert("Failed to save quiz to database: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleInsertIntoEditor = () => {
    if (onQuestionsGenerated) {
      onQuestionsGenerated(generatedQuestions, generatedQuizTitle);
    }
    onClose();
  };

  const currentContentInfo = getSelectedContentString();

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col border border-slate-200 dark:border-slate-800 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-purple-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-xl text-slate-900 dark:text-slate-100 flex items-center gap-2">
                AI Quiz Generator
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 font-semibold border border-purple-200 dark:border-purple-800">
                  Powered by Gemini 3.6
                </span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Automatically create multiple-choice or fill-in-the-blank questions from course materials
              </p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 rounded-xl text-red-700 dark:text-red-300 text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-600 dark:text-red-400" />
              <div>
                <p className="font-semibold">Generation Notice</p>
                <p>{error}</p>
              </div>
            </div>
          )}

          {/* SECTION 1: Source Material Selection */}
          <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-5 space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                1. Select Course Material Source
              </label>
              
              <div className="flex bg-slate-200 dark:bg-slate-700 p-1 rounded-xl text-xs font-semibold">
                <button
                  onClick={() => setSourceMode('select')}
                  className={`px-3 py-1 rounded-lg transition-all ${sourceMode === 'select' ? 'bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-300 shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}
                >
                  Existing Course
                </button>
                <button
                  onClick={() => setSourceMode('custom')}
                  className={`px-3 py-1 rounded-lg transition-all ${sourceMode === 'custom' ? 'bg-white dark:bg-slate-800 text-purple-600 dark:text-purple-300 shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}
                >
                  Custom Text Passage
                </button>
              </div>
            </div>

            {sourceMode === 'select' ? (
              <div className="space-y-3">
                {loadingMaterials ? (
                  <div className="p-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-purple-600" />
                    Loading available course materials...
                  </div>
                ) : courseMaterials.length === 0 ? (
                  <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-xl text-xs text-amber-800 dark:text-amber-300">
                    No course materials found in your database. Switch to <strong>Custom Text Passage</strong> to paste your text directly!
                  </div>
                ) : (
                  <div>
                    <select
                      value={selectedMaterialId}
                      onChange={(e) => setSelectedMaterialId(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl text-sm font-medium text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-purple-500 outline-none"
                    >
                      {courseMaterials.map((mat) => (
                        <option key={mat.id} value={mat.id}>
                          {mat.title} ({mat.type.toUpperCase()} • {mat.topic || 'General'})
                        </option>
                      ))}
                    </select>

                    {selectedMaterial && (
                      <div className="mt-3 p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs space-y-1">
                        <div className="flex justify-between text-slate-500 font-semibold">
                          <span>Topic: {selectedMaterial.topic}</span>
                          <span>Modules/Sections: {selectedMaterial.content?.modules?.length || 1}</span>
                        </div>
                        <p className="text-slate-700 dark:text-slate-300 line-clamp-2 italic font-mono bg-slate-50 dark:bg-slate-900/50 p-2 rounded border border-slate-100 dark:border-slate-800">
                          "{currentContentInfo.contentText.substring(0, 220)}..."
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="Material Title (e.g. Photosynthesis & Cell Biology)"
                  value={customTitle}
                  onChange={(e) => setCustomTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl text-sm font-medium"
                />
                <textarea
                  rows={4}
                  placeholder="Paste textbook excerpt, lecture notes, or course text here..."
                  value={customContent}
                  onChange={(e) => setCustomContent(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl text-sm font-mono"
                />
              </div>
            )}
          </div>

          {/* SECTION 2: Quiz Generation Options */}
          <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700/80 rounded-2xl p-5 space-y-4">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-2">
              <BrainCircuit className="w-4 h-4 text-purple-600 dark:text-purple-400" />
              2. Quiz Configuration
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Question Format */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Question Format
                </label>
                <div className="space-y-1.5">
                  {[
                    { id: 'multiple-choice', label: 'Multiple Choice Only' },
                    { id: 'fill-in-the-blank', label: 'Fill-in-the-Blank Only (___)' },
                    { id: 'mixed', label: 'Mixed (MC & Fill-in)' }
                  ].map((fmt) => (
                    <label
                      key={fmt.id}
                      className={`flex items-center gap-2.5 p-2 rounded-xl border text-xs cursor-pointer transition-all ${
                        questionType === fmt.id
                          ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-500 text-purple-900 dark:text-purple-200 font-semibold'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="questionType"
                        value={fmt.id}
                        checked={questionType === fmt.id}
                        onChange={() => setQuestionType(fmt.id as any)}
                        className="text-purple-600 focus:ring-purple-500"
                      />
                      <span>{fmt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Number of Questions */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Question Count
                </label>
                <div className="grid grid-cols-4 gap-1.5 mb-2">
                  {[3, 5, 8, 10].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => setCount(num)}
                      className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                        count === num
                          ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                      }`}
                    >
                      {num} Qs
                    </button>
                  ))}
                </div>

                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Difficulty
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as any)}
                  className="w-full px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl text-xs font-medium"
                >
                  <option value="Easy">Easy / Beginner</option>
                  <option value="Medium">Medium / Intermediate</option>
                  <option value="Hard">Hard / Advanced</option>
                </select>
              </div>

              {/* Pedagogical Focus */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                  Optional Focus / Directives
                </label>
                <input
                  type="text"
                  placeholder="e.g. Focus on definitions, key dates, or grammar"
                  value={focus}
                  onChange={(e) => setFocus(e.target.value)}
                  className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-xl text-xs font-medium"
                />
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                  Gemini will extract exact statements from the material text and build accurate test questions.
                </p>
              </div>
            </div>

            {/* Generate Trigger Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-sm font-bold shadow-md shadow-purple-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" />
                    <span>{generationStep || 'Generating AI Quiz...'}</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    <span>Generate AI Quiz from Material</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* SECTION 3: Generated Questions Review & Customization */}
          {generatedQuestions.length > 0 && (
            <div className="space-y-4 pt-2">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3">
                <div>
                  <h4 className="font-bold text-lg text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                    Generated Questions ({generatedQuestions.length})
                  </h4>
                  <input
                    type="text"
                    value={generatedQuizTitle}
                    onChange={(e) => setGeneratedQuizTitle(e.target.value)}
                    className="mt-1 px-3 py-1 text-xs font-bold bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg w-full max-w-md text-slate-900 dark:text-slate-100"
                    placeholder="Quiz Title"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleAddQuestion}
                    className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Question
                  </button>
                </div>
              </div>

              {/* Questions List */}
              <div className="space-y-4">
                {generatedQuestions.map((q, qIdx) => (
                  <div 
                    key={q.id || qIdx} 
                    className="p-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm space-y-3 relative group"
                  >
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-bold text-xs flex items-center justify-center shrink-0">
                          {qIdx + 1}
                        </span>
                        
                        <span className={`text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-md border ${
                          q.questionType === 'fill-in-the-blank' 
                            ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900' 
                            : 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900'
                        }`}>
                          {q.questionType === 'fill-in-the-blank' ? 'Fill in the Blank' : 'Multiple Choice'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setEditingIndex(editingIndex === qIdx ? null : qIdx)}
                          className="p-1.5 text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                          title="Edit Question"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteQuestion(qIdx)}
                          className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                          title="Delete Question"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Question Content View / Inline Edit */}
                    {editingIndex === qIdx ? (
                      <div className="space-y-3 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                            Question Text
                          </label>
                          <textarea
                            value={q.question}
                            onChange={(e) => handleUpdateQuestion(qIdx, { ...q, question: e.target.value })}
                            className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-medium"
                            rows={2}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                              Question Format
                            </label>
                            <select
                              value={q.questionType || 'multiple-choice'}
                              onChange={(e) => handleUpdateQuestion(qIdx, { ...q, questionType: e.target.value as any })}
                              className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-medium"
                            >
                              <option value="multiple-choice">Multiple Choice</option>
                              <option value="fill-in-the-blank">Fill in the Blank</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                              Correct Answer
                            </label>
                            <input
                              type="text"
                              value={q.correctAnswer}
                              onChange={(e) => handleUpdateQuestion(qIdx, { ...q, correctAnswer: e.target.value })}
                              className="w-full p-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg text-xs font-bold text-emerald-600 dark:text-emerald-400"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">
                            Options (4 Choices)
                          </label>
                          <div className="grid grid-cols-2 gap-2">
                            {q.options.map((opt, oIdx) => (
                              <input
                                key={oIdx}
                                type="text"
                                value={opt}
                                onChange={(e) => {
                                  const newOpts = [...q.options];
                                  newOpts[oIdx] = e.target.value;
                                  handleUpdateQuestion(qIdx, { ...q, options: newOpts });
                                }}
                                className={`p-2 bg-white dark:bg-slate-800 border rounded-lg text-xs font-medium ${
                                  opt === q.correctAnswer ? 'border-emerald-500 text-emerald-600 font-bold' : 'border-slate-300 dark:border-slate-600'
                                }`}
                              />
                            ))}
                          </div>
                        </div>

                        <div className="flex justify-end">
                          <button
                            onClick={() => setEditingIndex(null)}
                            className="px-3 py-1 bg-purple-600 text-white rounded-lg text-xs font-semibold"
                          >
                            Done Editing
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          {q.questionType === 'fill-in-the-blank' ? (
                            <span>
                              {q.question.split('___').map((part, i, arr) => (
                                <React.Fragment key={i}>
                                  {part}
                                  {i < arr.length - 1 && (
                                    <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 border-b-2 border-amber-500 font-bold rounded">
                                      {q.correctAnswer || '___'}
                                    </span>
                                  )}
                                </React.Fragment>
                              ))}
                            </span>
                          ) : (
                            q.question
                          )}
                        </p>

                        {/* Options pills */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {q.options.map((option, oIdx) => {
                            const isCorrect = option === q.correctAnswer;
                            return (
                              <div
                                key={oIdx}
                                className={`p-2 rounded-xl text-xs font-medium border flex justify-between items-center ${
                                  isCorrect
                                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 text-emerald-800 dark:text-emerald-300 font-bold'
                                    : 'bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                                }`}
                              >
                                <span>{option}</span>
                                {isCorrect && <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />}
                              </div>
                            );
                          })}
                        </div>

                        {q.explanation && (
                          <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">
                            💡 Explanation: {q.explanation}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 flex flex-col sm:flex-row justify-between items-center gap-3">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {generatedQuestions.length > 0 ? (
              <span>Ready to save or export {generatedQuestions.length} AI generated questions.</span>
            ) : (
              <span>Select a course material and click <strong>Generate AI Quiz</strong> above.</span>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {generatedQuestions.length > 0 && (
              <>
                <button
                  onClick={handleSaveToFirestore}
                  disabled={isSaving || isSavedToDb}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    isSavedToDb
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-900/40 dark:text-emerald-300'
                      : 'bg-purple-600 hover:bg-purple-700 text-white shadow-sm'
                  }`}
                >
                  {isSavedToDb ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Saved as Quiz Material
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4" /> {isSaving ? 'Saving...' : 'Save as New Quiz Material'}
                    </>
                  )}
                </button>

                {onQuestionsGenerated && (
                  <button
                    onClick={handleInsertIntoEditor}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-sm"
                  >
                    <span>Insert into Editor</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}
              </>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
