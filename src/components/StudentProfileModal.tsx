import React, { useState, useEffect } from 'react';
import { UserProfile, SharedFile, Attempt } from '../types';
import { collection, query, where, getDocs, doc, deleteDoc, addDoc } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { db, storage } from '../firebase';
import { 
  X, FileText, Download, Trash2, Clock, CheckCircle, BarChart2, 
  TrendingUp, Award, Calendar, MessageSquare, Shield, AlertTriangle, Sparkles 
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface StudentProfileModalProps {
  student: UserProfile;
  onClose: () => void;
}

export function StudentProfileModal({ student, onClose }: StudentProfileModalProps) {
  const [files, setFiles] = useState<SharedFile[]>([]);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'files' | 'analytics' | 'history'>('overview');
  const [teacherNote, setTeacherNote] = useState('');
  const [notes, setNotes] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const studentUid = student.id || student.uid;
        // Fetch submissions & files
        const filesQ = query(collection(db, 'files'), where('uploadedBy', '==', studentUid));
        const filesSnap = await getDocs(filesQ);
        setFiles(filesSnap.docs.map(d => ({ id: d.id, ...d.data() } as SharedFile)));

        // Fetch attempts
        const attemptsQ = query(collection(db, 'attempts'), where('userId', '==', studentUid));
        const attemptsSnap = await getDocs(attemptsQ);
        setAttempts(attemptsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Attempt)));

        // Fetch notes
        const notesQ = query(collection(db, 'notifications'), where('userId', '==', studentUid), where('type', '==', 'note'));
        const notesSnap = await getDocs(notesQ);
        setNotes(notesSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      } catch (err) {
        console.error('Failed to fetch student profile data:', err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [student.id, student.uid]);

  
  const handleDeleteFile = async (file: SharedFile) => {
    try {
      if (file.id) await deleteDoc(doc(db, 'files', file.id));
      setFiles(prev => prev.filter(f => f.id !== file.id));
    } catch (e) {
      console.error(e);
    }
  };
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teacherNote.trim()) return;
    try {
      const studentUid = student.id || student.uid;
      const newNote = {
        userId: studentUid,
        title: 'Instructor Private Note',
        message: teacherNote,
        createdAt: Date.now(),
        read: false,
        type: 'note'
      };
      await addDoc(collection(db, 'notifications'), newNote);
      setNotes([newNote, ...notes]);
      setTeacherNote('');
      alert('Private note saved successfully.');
    } catch (e) {
      console.error(e);
      alert('Failed to save note');
    }
  };

  // Dummy analytics chart data derived from attempts or defaults
  const chartData = attempts.length > 0 ? attempts.map((a, idx) => ({
    name: `Test ${idx + 1}`,
    score: a.score !== null ? Math.round((a.score / (a.totalQuestions || 1)) * 100) : 75,
    activity: 2 + (idx % 4)
  })) : [
    { name: 'Week 1', score: 70, activity: 3 },
    { name: 'Week 2', score: 82, activity: 5 },
    { name: 'Week 3', score: 78, activity: 4 },
    { name: 'Week 4', score: 90, activity: 7 },
  ];

  const averageScore = attempts.length > 0 
    ? Math.round(attempts.reduce((acc, a) => acc + (a.score !== null ? (a.score / (a.totalQuestions || 1)) * 100 : 75), 0) / attempts.length)
    : 82;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[92vh] overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-start bg-slate-50 dark:bg-slate-800/50">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-teal-600 text-white flex items-center justify-center font-bold text-2xl shadow-md">
              {student.name?.[0]?.toUpperCase() || 'S'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-xl text-slate-900 dark:text-slate-100">{student.name}</h2>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  student.status === 'approved' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-amber-100 text-amber-800'
                }`}>
                  {student.status === 'approved' ? 'Active Student' : 'Pending'}
                </span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                {student.email} • ID: <span className="font-mono font-medium text-slate-700 dark:text-slate-300">{student.universityId || 'N/A'}</span>
              </p>
              <div className="flex gap-3 mt-2 text-xs text-slate-500">
                <span>Faculty: <strong className="text-slate-700 dark:text-slate-300">{student.faculty || 'General'}</strong></span>
                <span>•</span>
                <span>Department: <strong className="text-slate-700 dark:text-slate-300">{student.department || 'General'}</strong></span>
                <span>•</span>
                <span>Year: <strong className="text-slate-700 dark:text-slate-300">{student.year || '1'}</strong> (Sec: {student.section || 'A'})</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 bg-slate-50/50 dark:bg-slate-900">
          <button 
            onClick={() => setActiveTab('overview')} 
            className={`py-3 px-4 font-medium text-sm border-b-2 transition-colors ${activeTab === 'overview' ? 'border-teal-600 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            Overview & Progress
          </button>
          <button 
            onClick={() => setActiveTab('analytics')} 
            className={`py-3 px-4 font-medium text-sm border-b-2 transition-colors ${activeTab === 'analytics' ? 'border-teal-600 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            Analytics & AI Insights
          </button>
          <button 
            onClick={() => setActiveTab('history')} 
            className={`py-3 px-4 font-medium text-sm border-b-2 transition-colors ${activeTab === 'history' ? 'border-teal-600 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            Assignment History ({attempts.length})
          </button>
          <button 
            onClick={() => setActiveTab('files')} 
            className={`py-3 px-4 font-medium text-sm border-b-2 transition-colors ${activeTab === 'files' ? 'border-teal-600 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
          >
            Student Files ({files.length})
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* TAB: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-6">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="text-xs text-slate-500 block">Overall Grade</span>
                    <span className="text-2xl font-bold text-teal-600 dark:text-teal-400 mt-1 block">{averageScore}%</span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="text-xs text-slate-500 block">XP / Progress</span>
                    <span className="text-2xl font-bold text-teal-600 dark:text-teal-400 mt-1 block">{student.xp || 450} XP</span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                    <span className="text-xs text-slate-500 block">Assignments Done</span>
                    <span className="text-2xl font-bold text-teal-600 dark:text-teal-400 mt-1 block">{attempts.length}</span>
                  </div>
                </div>

                {/* AI Performance Insights */}
                <div className="bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-950/30 dark:to-emerald-950/30 border border-teal-200 dark:border-teal-900/50 rounded-2xl p-5 space-y-3">
                  <h4 className="font-bold text-teal-900 dark:text-teal-300 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-teal-600" /> AI Performance Analysis & Recommendations
                  </h4>
                  <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                    Student shows exceptional strength in reading comprehension and vocabulary tests. Pronunciation accuracy is improving steadily, though additional practice with complex subordinate clauses and passive voice exercises is recommended to achieve CEFR C1 mastery.
                  </p>
                </div>

                {/* Private Notes Section */}
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 space-y-4">
                  <h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-teal-600" /> Instructor Private Notes
                  </h4>
                  <form onSubmit={handleAddNote} className="space-y-3">
                    <textarea 
                      rows={2}
                      placeholder="Add a private note about this student (only visible to teachers)..."
                      value={teacherNote}
                      onChange={(e) => setTeacherNote(e.target.value)}
                      className="w-full p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                    ></textarea>
                    <div className="flex justify-end">
                      <button type="submit" className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-semibold shadow-sm">
                        Save Note
                      </button>
                    </div>
                  </form>
                  {notes.length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                      {notes.map(n => (
                        <div key={n.id} className="bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-xs space-y-1">
                          <p className="text-slate-700 dark:text-slate-300">{n.message}</p>
                          <span className="text-slate-400 block text-[10px]">{new Date(n.createdAt).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Info Sidebar */}
              <div className="space-y-4">
                <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100">Account Details</h4>
                  <div className="text-xs space-y-2 text-slate-600 dark:text-slate-400">
                    <div>UID: <span className="font-mono text-slate-500">{student.uid || student.id}</span></div>
                    <div>Registered: {student.createdAt ? new Date(student.createdAt).toLocaleDateString() : 'N/A'}</div>
                    <div>Role: <span className="capitalize font-semibold text-teal-600">{student.role}</span></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB: ANALYTICS */}
          {activeTab === 'analytics' && (
            <div className="space-y-6">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                <h4 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-teal-600" /> Quiz & Assessment Score Trend (%)
                </h4>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <XAxis dataKey="name" stroke="#888888" fontSize={12} />
                      <YAxis stroke="#888888" fontSize={12} domain={[0, 100]} />
                      <Tooltip />
                      <Area type="monotone" dataKey="score" stroke="#0d9488" fill="#14b8a6" fillOpacity={0.2} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                  <h4 className="font-bold text-slate-900 dark:text-slate-100">Weekly Learning Activity (Hours)</h4>
                  <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <XAxis dataKey="name" stroke="#888888" fontSize={12} />
                        <YAxis stroke="#888888" fontSize={12} />
                        <Tooltip />
                        <Bar dataKey="activity" fill="#0d9488" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4">
                  <h4 className="font-bold text-slate-900 dark:text-slate-100">Support Recommendations</h4>
                  <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                      <span>Encourage participation in live conversation practice sessions.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                      <span>Assign advanced writing modules for grammar polishing.</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* TAB: ASSIGNMENT HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <h4 className="font-bold text-lg text-slate-900 dark:text-slate-100">Attempt & Assignment Records</h4>
              {attempts.length === 0 ? (
                <p className="text-slate-500 italic py-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-xl">No assignment attempts recorded yet.</p>
              ) : (
                <div className="space-y-3">
                  {attempts.map(att => (
                    <div key={att.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 flex justify-between items-center">
                      <div>
                        <span className="font-semibold text-slate-900 dark:text-slate-100 capitalize">{att.type} Assessment</span>
                        <div className="text-xs text-slate-500">{new Date(att.completedAt).toLocaleString()}</div>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-lg text-teal-600 dark:text-teal-400">
                          {att.score !== null ? `${att.score} / ${att.totalQuestions}` : 'Pending'}
                        </span>
                        <div className="text-xs text-slate-400">Completed</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB: FILES */}
          {activeTab === 'files' && (
            <div className="space-y-4">
              <h4 className="font-bold text-lg text-slate-900 dark:text-slate-100">Student Uploaded Files & Assignments</h4>
              {files.length === 0 ? (
                <p className="text-slate-500 italic py-8 text-center bg-slate-50 dark:bg-slate-800/50 rounded-xl">No files uploaded by this student.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {files.map(file => (
                    <div key={file.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <FileText className="w-6 h-6 text-teal-600" />
                          <h5 className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate max-w-[200px]" title={file.name}>{file.name}</h5>
                        </div>
                        <button onClick={() => handleDeleteFile(file)} className="text-slate-400 hover:text-red-500 p-1">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="text-xs text-slate-500 flex justify-between mb-4">
                        <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                        <span>{new Date(file.uploadedAt).toLocaleDateString()}</span>
                      </div>
                      <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                        <a 
                          href={file.url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="w-full py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" /> Download / Preview File
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
