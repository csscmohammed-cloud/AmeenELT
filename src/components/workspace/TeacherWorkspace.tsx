import React, { useState, useEffect } from 'react';
import { Material, Attempt } from '../../types';
import { Edit, Eye, Users, BarChart2, Settings, History, Save, CornerUpLeft, BookOpen, Clock, FileText, ChevronRight, Check, Sparkles } from 'lucide-react';
import { AssignModal } from '../AssignModal';
import { ContentEditor } from './ContentEditor';
import { AIQuizGeneratorModal } from '../AIQuizGeneratorModal';
import { SubmissionManager } from '../SubmissionManager';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';

interface Props {
  material: Material;
  onUpdate: (updated: Partial<Material>) => void;
  onDelete: () => void;
  onDuplicate?: () => void;
  onPreview: () => void;
  onBack: () => void;
}

export function TeacherWorkspace({ material, onUpdate, onDelete, onPreview, onBack, onDuplicate }: Props) {
  const [activeTab, setActiveTab] = useState<'edit' | 'preview' | 'assign' | 'analytics' | 'history' | 'settings'>('edit');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [attempts, setAttempts] = useState<Attempt[]>([]);

  useEffect(() => {
    const fetchAttempts = async () => {
      try {
        const snap = await getDocs(collection(db, 'attempts'));
        const allAttempts = snap.docs.map(d => ({ id: d.id, ...d.data() } as Attempt));
        setAttempts(allAttempts.filter(a => a.materialId === material.id));
      } catch (e) {
        console.error("Error fetching attempts:", e);
      }
    };
    fetchAttempts();
  }, [material.id]);
  
  // Local edit state
  const [title, setTitle] = useState(material.title);
  const [topic, setTopic] = useState(material.topic);
  const [content, setContent] = useState(material.content);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isAILoading, setIsAILoading] = useState(false);
  const [showAiQuizModal, setShowAiQuizModal] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    await onUpdate({ title, topic, content });
    setIsSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleAIImprove = async () => {
    setIsAILoading(true);
    try {
      const res = await fetch('/api/improve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, type: material.type })
      });
      const data = await res.json();
      if (res.ok) {
        setContent(data.content);
        alert("Content improved by AI!");
      } else {
        alert(data.error || "Failed to improve content.");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to improve content.");
    } finally {
      setIsAILoading(false);
    }
  };

  const [showCourseGenModal, setShowCourseGenModal] = useState(false);
  const [courseGenOptions, setCourseGenOptions] = useState({
    photos: true,
    diagrams: true,
    tables: true,
    drawings: true,
    flashcards: true,
    charts: true,
    audio: true
  });

  const handleGenerateCourse = async () => {
    setIsAILoading(true);
    setShowCourseGenModal(false);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'course', topic, context: title + " - " + topic, options: courseGenOptions })
      });
      const data = await res.json();
      if (res.ok) {
        if (material.type === 'course') {
           setContent(data);
           alert("AI generated course content successfully!");
        }
      } else {
        alert("Failed to generate course.");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to generate course.");
    } finally {
      setIsAILoading(false);
    }
  };

  const handleGenerateQuiz = async () => {
    setIsAILoading(true);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'quiz', topic, context: title + " - " + topic })
      });
      const data = await res.json();
      if (res.ok) {
        if (material.type === 'quiz') {
           const existingQuestions = content.questions || [];
           setContent({ ...content, questions: [...existingQuestions, ...(data.questions || [])] });
           alert("Added AI generated questions!");
        } else {
           alert("Material must be a quiz to add questions. Create a new quiz material first.");
        }
      } else {
        alert("Failed to generate quiz.");
      }
    } catch (e) {
      console.error(e);
      alert("Failed to generate quiz.");
    } finally {
      setIsAILoading(false);
    }
  };

  return (
    <div className="bg-slate-50 dark:bg-slate-900 min-h-[calc(100vh-4rem)] flex flex-col -mx-4 sm:-mx-6 lg:-mx-8 -my-8">
      {/* Workspace Header */}
      <div className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <button 
            onClick={onBack}
            className="p-2 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 rounded-lg transition-colors mr-2"
          >
            <CornerUpLeft className="w-5 h-5" />
          </button>
          <div className="w-10 h-10 bg-teal-100 dark:bg-teal-900/50 rounded-lg flex items-center justify-center text-teal-600 dark:text-teal-400">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">{title}</h1>
              <span className="px-2 py-0.5 text-xs font-semibold uppercase tracking-wider bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded">
                {material.type}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-400 mt-1">
              <span className="flex items-center gap-1"><FileText className="w-4 h-4"/> {topic}</span>
              <span className="flex items-center gap-1"><Clock className="w-4 h-4"/> Last edited just now</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={async () => {
              if (title !== material.title || topic !== material.topic || content !== material.content) {
                await handleSave();
              }
              onPreview();
            }}
            className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
          >
            <Eye className="w-4 h-4" /> Preview
          </button>
          <button 
            onClick={() => setShowAssignModal(true)}
            className="px-4 py-2 text-sm font-medium text-white bg-purple-600 border border-transparent rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
          >
            <Users className="w-4 h-4" /> Assign
          </button>
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 text-sm font-medium text-white bg-teal-600 border border-transparent rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-2 min-w-24 justify-center"
          >
            {isSaving ? (
              <span className="flex items-center gap-2"><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/> Saving...</span>
            ) : saved ? (
              <span className="flex items-center gap-2"><Check className="w-4 h-4"/> Saved</span>
            ) : (
              <span className="flex items-center gap-2"><Save className="w-4 h-4"/> Save</span>
            )}
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Nav */}
        <div className="w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 p-4 flex flex-col gap-2 overflow-y-auto">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 px-3">Workspace</h3>
          
          <button onClick={() => setActiveTab('edit')} className={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'edit' ? 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
            <div className="flex items-center gap-3"><Edit className="w-4 h-4" /> Content Editor</div>
            {activeTab === 'edit' && <ChevronRight className="w-4 h-4 opacity-50" />}
          </button>
          
          <button onClick={() => setActiveTab('analytics')} className={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'analytics' ? 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
            <div className="flex items-center gap-3"><BarChart2 className="w-4 h-4" /> Analytics & Results</div>
            {activeTab === 'analytics' && <ChevronRight className="w-4 h-4 opacity-50" />}
          </button>
          
          <button onClick={() => setActiveTab('history')} className={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'history' ? 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
            <div className="flex items-center gap-3"><History className="w-4 h-4" /> Version History</div>
            {activeTab === 'history' && <ChevronRight className="w-4 h-4 opacity-50" />}
          </button>

          <button onClick={() => setActiveTab('settings')} className={`flex items-center justify-between w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'settings' ? 'bg-teal-50 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'}`}>
            <div className="flex items-center gap-3"><Settings className="w-4 h-4" /> Resource Settings</div>
            {activeTab === 'settings' && <ChevronRight className="w-4 h-4 opacity-50" />}
          </button>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900 p-8">
          <div className="max-w-4xl mx-auto">
            {activeTab === 'edit' && (
              <div className="space-y-6 animate-in fade-in">
                <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
                  <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Document Editor</h2>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => setShowAiQuizModal(true)} 
                        className="px-3 py-1.5 text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white rounded-md shadow-sm transition-colors flex items-center gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-purple-200" /> AI Quiz Generator
                      </button>
                      <button onClick={handleAIImprove} disabled={isAILoading} className="px-3 py-1.5 text-xs font-medium bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400 rounded-md hover:bg-teal-200 transition-colors disabled:opacity-50">✨ {isAILoading ? 'Working...' : 'AI Improve'}</button>
                      {material.type === 'course' && (
                        <button onClick={() => setShowCourseGenModal(true)} disabled={isAILoading} className="px-3 py-1.5 text-xs font-medium bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400 rounded-md hover:bg-indigo-200 transition-colors disabled:opacity-50">🪄 {isAILoading ? 'Working...' : 'AI Course Generator'}</button>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Title</label>
                      <input 
                        type="text" 
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Topic / Category</label>
                      <input 
                        type="text" 
                        value={topic}
                        onChange={e => setTopic(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-teal-500 outline-none"
                      />
                    </div>
                    
                    <div className="pt-6 mt-6 border-t border-slate-200 dark:border-slate-700">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">Content Configuration</h3>
                      <ContentEditor type={material.type} content={content} onChange={setContent} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'analytics' && (
              <div className="space-y-6 animate-in fade-in">
                <SubmissionManager attempts={attempts} materials={[material]} />
              </div>
            )}

            {activeTab === 'history' && (
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 animate-in fade-in">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-6">Version History</h3>
                <div className="p-8 text-center text-slate-500">
                  No version history available yet.
                </div>
              </div>
            )}
            
            {activeTab === 'settings' && (
              <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 animate-in fade-in space-y-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-1">Publishing Settings</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mb-4">Control how and when students can access this material.</p>
                  
                  <div className="space-y-4">
                    <label className="flex items-start gap-3 p-4 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <input 
                        type="checkbox" 
                        checked={material.allowRetakes ?? true}
                        onChange={(e) => onUpdate({ allowRetakes: e.target.checked })}
                        className="mt-1 rounded text-teal-600" 
                      />
                      <div>
                        <div className="font-medium text-slate-900 dark:text-slate-100">Allow Quiz Retakes</div>
                        <div className="text-sm text-slate-500">Students are allowed to retake quizzes after viewing their score.</div>
                      </div>
                    </label>
                    <label className="flex items-start gap-3 p-4 border border-slate-200 dark:border-slate-700 rounded-lg cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700/50">
                      <input type="checkbox" className="mt-1 rounded text-teal-600" defaultChecked />
                      <div>
                        <div className="font-medium text-slate-900 dark:text-slate-100">Show AI Tutor</div>
                        <div className="text-sm text-slate-500">Allow students to use the AI tutor while completing this material.</div>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showAssignModal && (
        <AssignModal 
          material={material} 
          onClose={() => setShowAssignModal(false)}
          onAssigned={(groups, users) => {
            onUpdate({ assignedGroups: groups, assignedUsers: users });
            setShowAssignModal(false);
          }}
        />
      )}
      {showCourseGenModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl max-w-md w-full shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-700">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700/50">
              <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">AI Course Options</h3>
              <p className="text-sm text-slate-500 mt-1">Select the rich media elements you want AI to generate.</p>
            </div>
            <div className="p-6 space-y-3">
              {[
                { id: 'photos', label: '📸 AI Photos & Visual Illustrations', desc: 'Photorealistic AI generated topic photos with captions' },
                { id: 'tables', label: '📋 AI Data Tables & Matrices', desc: 'Structured comparison tables for key terms and concepts' },
                { id: 'flashcards', label: '🃏 Study Flashcards', desc: 'Interactive flip cards for self-testing' },
                { id: 'audio', label: '🔊 Audio Narration (TTS)', desc: 'Pronunciation and speech audio' }
              ].map((opt) => (
                <label key={opt.id} className="flex items-start gap-3 cursor-pointer p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 border border-slate-100 dark:border-slate-700 transition-colors">
                  <input
                    type="checkbox"
                    checked={courseGenOptions[opt.id as keyof typeof courseGenOptions]}
                    onChange={(e) => setCourseGenOptions({ ...courseGenOptions, [opt.id]: e.target.checked })}
                    className="w-5 h-5 mt-0.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
                  />
                  <div>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-200 block">{opt.label}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{opt.desc}</span>
                  </div>
                </label>
              ))}
            </div>
            <div className="p-6 bg-slate-50 dark:bg-slate-900 flex justify-end gap-3 border-t border-slate-100 dark:border-slate-700/50">
              <button onClick={() => setShowCourseGenModal(false)} className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors">Cancel</button>
              <button onClick={handleGenerateCourse} className="px-6 py-2 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-colors shadow-sm">Generate</button>
            </div>
          </div>
        </div>
      )}

      {showAiQuizModal && (
        <AIQuizGeneratorModal
          isOpen={showAiQuizModal}
          onClose={() => setShowAiQuizModal(false)}
          initialMaterial={material}
          onQuestionsGenerated={(questions) => {
            const existingQuestions = content.questions || [];
            setContent({ ...content, questions: [...existingQuestions, ...questions] });
            setShowAiQuizModal(false);
          }}
        />
      )}
    </div>
  );
}
