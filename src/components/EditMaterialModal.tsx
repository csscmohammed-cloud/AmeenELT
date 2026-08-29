import React, { useState } from 'react';
import { updateDoc, doc } from 'firebase/firestore';
import { db, sanitizeForFirestore } from '../firebase';
import { Material, QuizQuestion } from '../types';
import { X, Plus, Trash2, Sparkles, Wand2, Award, CheckCircle, LayoutTemplate, ListFilter } from 'lucide-react';

interface EditMaterialModalProps {
  material: Material;
  onClose: () => void;
  onUpdated: (updatedMaterial: Material) => void;
}

export function EditMaterialModal({ material, onClose, onUpdated }: EditMaterialModalProps) {
  const [title, setTitle] = useState(material.title);
  const [topic, setTopic] = useState(material.topic);
  const [content, setContent] = useState<any>(JSON.parse(JSON.stringify(material.content)));
  const [isSaving, setIsSaving] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const [aiLoadingKey, setAiLoadingKey] = useState<string | null>(null);

  const handleSave = async () => {
    if (!material.id) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'materials', material.id), sanitizeForFirestore({
        title,
        topic,
        content
      }));
      onUpdated({ ...material, title, topic, content });
      onClose();
    } catch (error) {
      console.error("Error updating material:", error);
      alert("Failed to update material.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAiEditSection = async (text: string, action: string, callback: (newText: string) => void) => {
    if (!text) return alert('No text to edit.');
    setAiLoadingKey(action);
    try {
      const res = await fetch('/api/ai-edit-section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, action })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.result) {
        callback(data.result);
      } else {
        alert(data.error || 'AI edit failed');
      }
    } catch (e) {
      console.error(e);
      alert('Failed to connect to AI edit service');
    } finally {
      setAiLoadingKey(null);
    }
  };

  const renderCourseEditor = () => {
    const modules = content.modules || [];
    return (
      <div className="space-y-6 mt-4">
        <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100 border-b pb-2 dark:border-slate-700">Course Content</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">Course Description</label>
            <textarea
              value={content.description || ''}
              onChange={(e) => setContent({ ...content, description: e.target.value })}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-sm"
              rows={3}
            />
          </div>
          
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">Modules</h4>
            {modules.map((m: any, idx: number) => (
              <div key={idx} className="p-4 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800/50 space-y-3 relative">
                <button
                  onClick={() => {
                    const newM = [...modules];
                    newM.splice(idx, 1);
                    setContent({ ...content, modules: newM });
                  }}
                  className="absolute top-3 right-3 text-red-500 hover:bg-red-50 p-1.5 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="pr-10">
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Module {idx + 1} Title</label>
                  <input
                    value={m.title}
                    onChange={(e) => {
                      const newM = [...modules];
                      newM[idx].title = e.target.value;
                      setContent({ ...content, modules: newM });
                    }}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-sm font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Content</label>
                  <textarea
                    value={m.content}
                    onChange={(e) => {
                      const newM = [...modules];
                      newM[idx].content = e.target.value;
                      setContent({ ...content, modules: newM });
                    }}
                    className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-sm"
                    rows={4}
                  />
                </div>
              </div>
            ))}
            <button
              onClick={() => setContent({ ...content, modules: [...modules, { title: '', content: '' }] })}
              className="flex items-center gap-2 px-4 py-2 bg-teal-50 text-teal-600 rounded-lg hover:bg-teal-100 text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Module
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderQuizEditor = () => {
    const questions: QuizQuestion[] = content.questions || [];
    return (
      <div className="space-y-6 mt-4">
        <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100 border-b pb-2 dark:border-slate-700">Quiz Questions</h3>
        {questions.map((q, idx) => (
          <div key={q.id || idx} className="p-4 border border-slate-200 dark:border-slate-700 rounded-lg bg-slate-50 dark:bg-slate-800/50 space-y-4">
            <div className="flex justify-between items-start">
              <h4 className="font-medium">Question {idx + 1}</h4>
              <button 
                onClick={() => {
                  const newQuestions = [...questions];
                  newQuestions.splice(idx, 1);
                  setContent({ ...content, questions: newQuestions });
                }}
                className="text-red-500 hover:text-red-700 p-1"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            
            <input 
              type="text" 
              value={q.question}
              onChange={(e) => {
                const newQuestions = [...questions];
                newQuestions[idx].question = e.target.value;
                setContent({ ...content, questions: newQuestions });
              }}
              placeholder="Question text"
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none"
            />
          </div>
        ))}
        <button 
          onClick={() => {
            setContent({
              ...content,
              questions: [...questions, {
                id: Date.now().toString(),
                question: 'New Question',
                options: ['Option 1', 'Option 2'],
                correctAnswer: 'Option 1',
                questionType: 'multiple-choice'
              }]
            });
          }}
          className="flex items-center gap-2 px-4 py-2 bg-teal-50 text-teal-600 rounded-lg hover:bg-teal-100 text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Question
        </button>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800">
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
          <div>
            <h3 className="font-bold text-xl text-slate-900 dark:text-slate-100">Edit & Enhance Material</h3>
            <p className="text-xs text-slate-500">Type: <span className="uppercase font-semibold text-teal-600">{material.type}</span></p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">Title</label>
              <input 
                type="text" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1">Topic / Subject</label>
              <input 
                type="text" 
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-sm"
              />
            </div>
          </div>

          {material.type === 'quiz' && renderQuizEditor()}
          {material.type === 'course' && renderCourseEditor()}
          {material.type === 'pronunciation' && (
            <div className="space-y-4 mt-4">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">Pronunciation Passage</label>
              <textarea 
                value={content.passage || ''}
                onChange={(e) => setContent({ ...content, passage: e.target.value })}
                rows={6}
                className="w-full p-3 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl text-sm"
              />
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-3 bg-slate-50 dark:bg-slate-800/50">
          <button 
            type="button" 
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-semibold hover:bg-slate-300 transition-colors"
          >
            Cancel
          </button>
          <button 
            type="button" 
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold shadow-sm shadow-teal-500/20 transition-colors disabled:opacity-50"
          >
            {isSaving ? 'Saving Changes...' : 'Save & Publish Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
