import React, { useState } from 'react';
import { Material, QuizQuestion, Group } from '../types';
import { HelpCircle, Sparkles, Plus, Trash2, Save, X, BookOpen } from 'lucide-react';
import { AIQuizGeneratorModal } from './AIQuizGeneratorModal';

interface ManualCreatorProps {
  onSave: (material: Omit<Material, 'id' | 'createdAt' | 'createdBy'>) => Promise<void>;
  onCancel: () => void;
  groups: Group[];
}

export function ManualCreator({ onSave, onCancel, groups }: ManualCreatorProps) {
  const [type, setType] = useState<'quiz' | 'pronunciation' | 'course'>('quiz');
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [cefrLevel, setCefrLevel] = useState('B1');
  const [folder, setFolder] = useState('General English');
  const [tagsInput, setTagsInput] = useState('EFL, Undergraduate, Interactive');
  const [assignedGroups, setAssignedGroups] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Quiz state
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [showAiQuizModal, setShowAiQuizModal] = useState(false);
  
  // Pronunciation state
  const [pronunciationPassage, setPronunciationPassage] = useState('');
  
  // Course state
  const [modules, setModules] = useState<any[]>([]);
  const [courseDesc, setCourseDesc] = useState('');
  
  const [generatingAudioFor, setGeneratingAudioFor] = useState<number | null>(null);

  const handleGenerateAudio = async (qIdx: number, text: string) => {
    if (!text) return alert("Please enter some text in the Question field to generate audio for.");
    setGeneratingAudioFor(qIdx);
    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        updateQuestion(qIdx, 'mediaUrl', data.audioData);
        updateQuestion(qIdx, 'mediaType', 'audio');
      } else {
        alert(data.error || "Failed to generate audio");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to generate audio");
    } finally {
      setGeneratingAudioFor(null);
    }
  };

  const [isGeneratingItem, setIsGeneratingItem] = useState(false);
  const [autoGenerateAudio, setAutoGenerateAudio] = useState(false);
  const handleGenerateItem = async (itemType: 'quiz') => {
    if (!topic) return alert('Please enter a Topic before generating content.');
    setIsGeneratingItem(true);
    try {
      const res = await fetch('/api/generate-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: itemType, topic, context: title, generateAudio: autoGenerateAudio })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        if (itemType === 'quiz' && data.question) {
          setQuestions([...questions, { ...data, id: Date.now().toString() }]);
        }
      } else {
        alert(data.error || "Failed to generate content");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to generate content");
    } finally {
      setIsGeneratingItem(false);
    }
  };

  const handleSave = async () => {
    if (!title || !topic) return alert('Please fill title and topic');
    
    let content: any = {};
    if (type === 'quiz') {
      if (questions.length === 0) return alert('Add at least one question');
      content = { questions };
    } else if (type === 'pronunciation') {
      if (!pronunciationPassage.trim()) return alert('Add a passage to read');
      content = { passage: pronunciationPassage };
    } else if (type === 'course') {
      if (modules.length === 0) return alert('Add at least one module');
      content = { title, description: courseDesc, cefrLevel, modules };
    }

    setIsSaving(true);
    try {
      await onSave({ 
        type, 
        title, 
        topic, 
        cefrLevel, 
        folder, 
        tags: tagsInput.split(',').map(t => t.trim()).filter(Boolean),
        content, 

        assignedGroups 
      });
    } finally {
      setIsSaving(false);
    }
  };

  const addQuestion = () => setQuestions([...questions, { id: Date.now().toString(), question: '', options: ['', '', '', ''], correctAnswer: '', questionType: 'multiple-choice', mediaType: 'none', mediaUrl: '' }]);
  const updateQuestion = (idx: number, field: string, val: string) => {
    const newQ = [...questions];
    (newQ[idx] as any)[field] = val;
    
    // Auto-adjust options if type changes
    if (field === 'questionType') {
      if (val === 'true-false') {
        newQ[idx].options = ['True', 'False'];
        newQ[idx].correctAnswer = 'True';
      } else if (val === 'short-answer') {
        newQ[idx].options = [];
        newQ[idx].correctAnswer = '';
      } else if (val === 'multiple-choice') {
        newQ[idx].options = ['', '', '', ''];
        newQ[idx].correctAnswer = '';
      }
    }
    
    setQuestions(newQ);
  };
  const updateOption = (qIdx: number, optIdx: number, val: string) => {
    const newQ = [...questions];
    newQ[qIdx].options[optIdx] = val;
    setQuestions(newQ);
  };

  return (
    <div className="space-y-6 bg-white p-6 rounded-xl border border-slate-200">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-900">Manual Creation</h3>
        <button onClick={onCancel} className="text-slate-500 hover:text-slate-700">Cancel</button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-4">
        <button
          type="button"
          onClick={() => setType('quiz')}
          className={`flex flex-col items-center p-3 rounded-lg border-2 transition-colors ${type === 'quiz' ? 'border-teal-600 bg-teal-50 text-teal-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
        >
          <HelpCircle className="w-5 h-5 mb-1" />
          <span className="font-medium text-sm">Quiz</span>
        </button>
        <button
          type="button"
          onClick={() => setType('pronunciation')}
          className={`flex flex-col items-center p-3 rounded-lg border-2 transition-colors ${type === 'pronunciation' ? 'border-teal-600 bg-teal-50 text-teal-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
        >
          <Sparkles className="w-5 h-5 mb-1" />
          <span className="font-medium text-sm">Pronounce</span>
        </button>
        <button
          type="button"
          onClick={() => setType('course')}
          className={`flex flex-col items-center p-3 rounded-lg border-2 transition-colors ${type === 'course' ? 'border-teal-600 bg-teal-50 text-teal-700' : 'border-slate-200 text-slate-600 hover:border-slate-300'}`}
        >
          <BookOpen className="w-5 h-5 mb-1" />
          <span className="font-medium text-sm">Course</span>
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Title</label>
          <input value={title} onChange={e => setTitle(e.target.value)} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-md" placeholder="Material Title" />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Topic</label>
          <input value={topic} onChange={e => setTopic(e.target.value)} className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-md" placeholder="General Topic" />
        </div>
        <div className="col-span-2">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Assign to Groups (Optional)</label>
          {groups.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400 italic">No groups created yet. Material will be available to all students.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {groups.map(group => (
                <label key={group.id} className="inline-flex items-center gap-2 px-3 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                  <input 
                    type="checkbox"
                    checked={assignedGroups.includes(group.id!)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setAssignedGroups(prev => [...prev, group.id!]);
                      } else {
                        setAssignedGroups(prev => prev.filter(id => id !== group.id));
                      }
                    }}
                    className="rounded text-teal-600 focus:ring-teal-500"
                  />
                  <span className="text-sm text-slate-700 dark:text-slate-300">{group.name}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="border-t border-slate-200 pt-6 mt-6">
        {type === 'quiz' && (
          <div className="space-y-4">
            {questions.map((q, qIdx) => (
              <div key={q.id} className="p-4 border border-slate-200 rounded-lg space-y-3 relative">
                <button onClick={() => setQuestions(questions.filter((_, i) => i !== qIdx))} className="absolute top-2 right-2 text-red-500 hover:bg-red-50 p-1 rounded"><Trash2 className="w-4 h-4"/></button>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Question Type</label>
                    <select value={q.questionType || 'multiple-choice'} onChange={e => updateQuestion(qIdx, 'questionType', e.target.value)} className="w-full text-sm px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md">
                      <option value="multiple-choice">Multiple Choice</option>
                      <option value="true-false">True/False</option>
                      <option value="short-answer">Short Answer</option>
                    </select>
                  </div>
                </div>
                
                <input value={q.question} onChange={e => updateQuestion(qIdx, 'question', e.target.value)} placeholder="Question Text" className="w-full font-medium px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md" />
                
                <div className="grid grid-cols-3 gap-2 border border-slate-100 dark:border-slate-700 p-3 rounded bg-slate-50 dark:bg-slate-800">
                  <div className="col-span-1">
                    <label className="block text-xs font-medium text-slate-500 mb-1">Media Type (Optional)</label>
                    <select value={q.mediaType || 'none'} onChange={e => updateQuestion(qIdx, 'mediaType', e.target.value === 'none' ? undefined : e.target.value)} className="w-full text-sm px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md">
                      <option value="none">None</option>
                      <option value="image">Image</option>
                      <option value="audio">Audio</option>
                      <option value="video">Video</option>
                    </select>
                  </div>
                  <div className="col-span-2 space-y-2">
                    {q.mediaType === 'audio' && (
                      <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1 flex justify-between items-center">
                          <span>TTS Text to Convert (Optional)</span>
                          <button 
                            type="button"
                            onClick={() => handleGenerateAudio(qIdx, q.ttsText || q.question)}
                            disabled={generatingAudioFor === qIdx || (!q.ttsText && !q.question)}
                            className="text-teal-600 hover:text-teal-700 disabled:opacity-50 text-[10px] uppercase font-bold"
                          >
                            {generatingAudioFor === qIdx ? 'Generating...' : 'Generate TTS'}
                          </button>
                        </label>
                        <input value={q.ttsText || ''} onChange={e => updateQuestion(qIdx, 'ttsText', e.target.value)} placeholder="Enter text for AI to read out loud..." className="w-full text-sm px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md mb-2" />
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-1">Media URL (or generated base64 audio)</label>
                      <input value={q.mediaUrl || ''} onChange={e => updateQuestion(qIdx, 'mediaUrl', e.target.value)} placeholder="https://example.com/media..." className="w-full text-sm px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-md" />
                    </div>
                  </div>
                </div>

                {(!q.questionType || q.questionType === 'multiple-choice') && (
                  <div className="grid grid-cols-2 gap-2">
                    {q.options.map((opt, optIdx) => (
                      <input key={optIdx} value={opt} onChange={e => updateOption(qIdx, optIdx, e.target.value)} placeholder={`Option ${optIdx + 1}`} className="w-full text-sm px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-md" />
                    ))}
                  </div>
                )}

                {q.questionType === 'true-false' && (
                  <div className="flex gap-4">
                    <span className="text-sm text-slate-500">True/False options selected.</span>
                  </div>
                )}

                <input value={q.correctAnswer} onChange={e => updateQuestion(qIdx, 'correctAnswer', e.target.value)} placeholder={q.questionType === 'short-answer' ? "Correct Answer" : "Exact text of correct option"} className="w-full text-sm px-3 py-2 border border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-900/30 text-slate-900 dark:text-slate-100 rounded-md" />
              </div>
            ))}
            <div className="flex flex-wrap items-center gap-3">
              <button onClick={addQuestion} className="flex items-center gap-2 text-teal-600 font-medium hover:text-teal-700"><Plus className="w-4 h-4" /> Add Question</button>
              <div className="flex items-center gap-2 mb-2">
                <input type="checkbox" id="autoAudioSingle" checked={autoGenerateAudio} onChange={(e) => setAutoGenerateAudio(e.target.checked)} className="rounded border-slate-300 text-teal-600 focus:ring-teal-500" />
                <label htmlFor="autoAudioSingle" className="text-sm text-slate-700 dark:text-slate-300">Auto-generate audio for question</label>
              </div>
              <button 
                onClick={() => handleGenerateItem('quiz')} disabled={isGeneratingItem} className="flex items-center gap-2 text-slate-600 font-medium hover:text-slate-700 disabled:opacity-50 text-xs"><Sparkles className="w-4 h-4 text-slate-400" /> {isGeneratingItem ? 'Generating...' : 'Quick AI Question'}</button>
            </div>
          </div>
        )}

        {type === 'pronunciation' && (
          <div className="space-y-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Passage to Read</label>
            <textarea value={pronunciationPassage} onChange={e => setPronunciationPassage(e.target.value)} placeholder="Enter the text that the student should read out loud..." className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-md" rows={6} />
          </div>
        )}
        {type === 'course' && (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <button onClick={() => setModules([...modules, { title: '', content: '' }])} className="flex items-center gap-2 text-teal-600 font-medium hover:text-teal-700">
                <Plus className="w-4 h-4" /> Add Module
              </button>
            </div>
            
            {modules.map((m, idx) => (
              <div key={idx} className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl space-y-4 relative bg-slate-50 dark:bg-slate-800/40">
                <button 
                  onClick={() => setModules(modules.filter((_, i) => i !== idx))} 
                  className="absolute top-3 right-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 p-1.5 rounded-lg"
                >
                  <Trash2 className="w-4 h-4"/>
                </button>
                <div className="pr-10">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Module {idx + 1} Title</label>
                  <input 
                    value={m.title} 
                    onChange={e => {
                      const newM = [...modules];
                      newM[idx].title = e.target.value;
                      setModules(newM);
                    }} 
                    placeholder="Module Title" 
                    className="w-full font-semibold px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg text-sm" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">Content</label>
                  <textarea 
                    value={m.content} 
                    onChange={e => {
                      const newM = [...modules];
                      newM[idx].content = e.target.value;
                      setModules(newM);
                    }} 
                    placeholder="Lesson text..." 
                    className="w-full text-sm px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-lg" 
                    rows={4} 
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <button onClick={handleSave} disabled={isSaving} className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-teal-600 text-white rounded-md font-medium hover:bg-teal-700 disabled:opacity-50 mt-6">
        <Save className="w-4 h-4" /> Save Material
      </button>
    </div>
  );
}
