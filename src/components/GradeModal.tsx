import React, { useState } from 'react';
import { Attempt } from '../types';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { X, Check } from 'lucide-react';

interface GradeModalProps {
  submission: Attempt;
  onClose: () => void;
}

export function GradeModal({ submission, onClose }: GradeModalProps) {
  const [score, setScore] = useState(submission.score?.toString() || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateDoc(doc(db, 'attempts', submission.id!), {
        score: Number(score)
      });
      onClose();
    } catch (e) {
      console.error(e);
      alert('Failed to save score');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Grade Submission</h2>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        
        <div className="p-6 overflow-y-auto space-y-4 max-h-[70vh]">
          <div className="grid grid-cols-2 gap-4 text-sm mb-4">
            <div><span className="text-slate-500">Student:</span> <span className="font-medium text-slate-900 dark:text-slate-100">{submission.userId}</span></div>
            <div><span className="text-slate-500">Type:</span> <span className="font-medium text-slate-900 dark:text-slate-100 capitalize">{submission.type}</span></div>
            <div><span className="text-slate-500">Date:</span> <span className="font-medium text-slate-900 dark:text-slate-100">{new Date(submission.completedAt).toLocaleString()}</span></div>
          </div>
          
          {submission.type === 'pronunciation' && submission.aiFeedback && (
            <div className="bg-teal-50 dark:bg-teal-900/20 p-4 rounded-lg border border-teal-100 dark:border-teal-800 space-y-2">
              <h4 className="font-semibold text-teal-900 dark:text-teal-200">AI Evaluation</h4>
              <p className="text-sm font-medium text-teal-800 dark:text-teal-300">Suggested Score: {submission.aiScore}/100</p>
              <p className="text-sm text-teal-700 dark:text-teal-400 whitespace-pre-wrap">{submission.aiFeedback}</p>
            </div>
          )}

          {submission.type === 'pronunciation' && submission.audioUrl && (
             <div className="mt-4">
               <h4 className="font-medium text-slate-700 dark:text-slate-300 mb-2">Student Recording:</h4>
               <audio src={submission.audioUrl} controls className="w-full" />
             </div>
          )}

          <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Final Score (out of {submission.totalQuestions})</label>
            <input 
              type="number" 
              min="0" 
              max={submission.totalQuestions}
              value={score} 
              onChange={e => setScore(e.target.value)}
              className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-transparent"
            />
          </div>
        </div>

        <div className="p-4 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3 bg-slate-50 dark:bg-slate-900/50">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-slate-600 dark:text-slate-400 font-medium hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Grade'}
          </button>
        </div>
      </div>
    </div>
  );
}
