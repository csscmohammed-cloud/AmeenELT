import React, { useState, useEffect } from 'react';
import { Attempt, SharedFile, UserProfile, Material } from '../types';
import { collection, query, getDocs, doc, updateDoc, addDoc, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Link } from 'react-router-dom';
import { 
  FileText, CheckCircle, Clock, AlertCircle, Download, MessageSquare, 
  Award, RefreshCw, Eye, Star, X, Check, ArrowLeft, User, IdCard, ExternalLink,
  BookOpen, Filter, ArrowUpDown, SlidersHorizontal
} from 'lucide-react';

interface SubmissionManagerProps {
  attempts: Attempt[];
  students?: UserProfile[];
  materials?: Material[];
  onGradeAttempt?: (attemptId: string, score: number, feedback: string) => Promise<void>;
}

export function SubmissionManager({ attempts, students: propStudents, materials = [], onGradeAttempt }: SubmissionManagerProps) {
  const [selectedAttempt, setSelectedAttempt] = useState<Attempt | null>(null);
  const [gradingScore, setGradingScore] = useState<string>('');
  const [teacherFeedback, setTeacherFeedback] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('newest');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [fetchedStudents, setFetchedStudents] = useState<UserProfile[]>([]);

  useEffect(() => {
    if (propStudents && propStudents.length > 0) return;

    try {
      const q = query(collection(db, 'users'), where('role', '==', 'student'));
      const unsub = onSnapshot(q, (snap) => {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as UserProfile));
        setFetchedStudents(list);
      }, (err) => {
        console.error("Error fetching students in SubmissionManager:", err);
      });
      return () => unsub();
    } catch (e) {
      console.error(e);
    }
  }, [propStudents]);

  const studentsList = (propStudents && propStudents.length > 0) ? propStudents : fetchedStudents;

  const getStudentInfo = (att: Attempt) => {
    const student = studentsList.find(s => 
      (s.uid && s.uid === att.userId) || 
      (s.id && s.id === att.userId) || 
      (s.email && att.userEmail && s.email.toLowerCase() === att.userEmail.toLowerCase())
    );

    const name = student?.name || att.userName || att.userEmail || 'Student';
    const universityId = student?.universityId || (att as any).userUniversityId || 'N/A';
    const email = student?.email || att.userEmail || '';

    return { name, universityId, email, student };
  };

  const getMaterialInfo = (att: Attempt) => {
    const mat = materials.find(m => m.id === att.materialId);
    return {
      title: mat?.title || `${att.type.toUpperCase()} Assessment`,
      topic: mat?.topic || '',
      id: att.materialId
    };
  };

  const getAttemptStatus = (att: Attempt): string => {
    const rawStatus = (att as any).status;
    if (rawStatus) return rawStatus;
    if (att.score !== null && att.score !== undefined) return 'graded';
    return 'pending';
  };

  const statusCounts = {
    all: attempts.length,
    pending: attempts.filter(a => {
      const st = getAttemptStatus(a);
      return st === 'pending' || st === 'submitted';
    }).length,
    graded: attempts.filter(a => getAttemptStatus(a) === 'graded').length,
    'in-progress': attempts.filter(a => getAttemptStatus(a) === 'in-progress').length,
    returned: attempts.filter(a => getAttemptStatus(a) === 'returned').length,
    overdue: attempts.filter(a => getAttemptStatus(a) === 'overdue').length,
  };

  const filteredAttempts = attempts.filter(att => {
    const info = getStudentInfo(att);
    const matInfo = getMaterialInfo(att);
    const searchLower = searchTerm.toLowerCase();

    const matchesSearch = 
      info.name.toLowerCase().includes(searchLower) ||
      info.universityId.toLowerCase().includes(searchLower) ||
      info.email.toLowerCase().includes(searchLower) ||
      matInfo.title.toLowerCase().includes(searchLower) ||
      att.userId.toLowerCase().includes(searchLower) ||
      att.type.toLowerCase().includes(searchLower);

    const status = getAttemptStatus(att);
    let matchesStatus = true;
    if (filterStatus === 'all') {
      matchesStatus = true;
    } else if (filterStatus === 'pending') {
      matchesStatus = status === 'pending' || status === 'submitted';
    } else {
      matchesStatus = status === filterStatus;
    }

    return matchesSearch && matchesStatus;
  }).sort((a, b) => {
    if (sortBy === 'newest') {
      return (b.completedAt || 0) - (a.completedAt || 0);
    }
    if (sortBy === 'oldest') {
      return (a.completedAt || 0) - (b.completedAt || 0);
    }
    if (sortBy === 'score-desc') {
      return (b.score ?? -1) - (a.score ?? -1);
    }
    if (sortBy === 'score-asc') {
      return (a.score ?? 9999) - (b.score ?? 9999);
    }
    if (sortBy === 'name-asc') {
      const nameA = getStudentInfo(a).name.toLowerCase();
      const nameB = getStudentInfo(b).name.toLowerCase();
      return nameA.localeCompare(nameB);
    }
    return 0;
  });

  const handleGradeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAttempt || !selectedAttempt.id) return;

    const scoreNum = parseFloat(gradingScore);
    if (isNaN(scoreNum)) {
      alert('Please enter a valid numeric score');
      return;
    }

    try {
      await updateDoc(doc(db, 'attempts', selectedAttempt.id), {
        score: scoreNum,
        teacherFeedback: teacherFeedback,
        status: 'graded'
      });

      // Also send notification to student
      await addDoc(collection(db, 'notifications'), {
        userId: selectedAttempt.userId,
        title: 'Assignment Graded',
        message: `Your assignment submission has been graded: ${scoreNum}/${selectedAttempt.totalQuestions}. Feedback: ${teacherFeedback}`,
        createdAt: Date.now(),
        read: false,
        type: 'grade'
      });

      alert('Submission graded successfully!');
      setSelectedAttempt(null);
      setGradingScore('');
      setTeacherFeedback('');
    } catch (err) {
      console.error(err);
      alert('Failed to save grade');
    }
  };

  const handleReturnForRevision = async (attempt: Attempt) => {
    if (!attempt.id) return;
    if (!confirm('Return this submission to the student for revision?')) return;
    try {
      await updateDoc(doc(db, 'attempts', attempt.id), {
        status: 'returned'
      });
      await addDoc(collection(db, 'notifications'), {
        userId: attempt.userId,
        title: 'Revision Requested',
        message: 'Your teacher has returned your submission for revision. Please review feedback and resubmit.',
        createdAt: Date.now(),
        read: false,
        type: 'revision'
      });
      alert('Marked as returned for revision.');
    } catch (e) {
      console.error(e);
      alert('Failed to update submission status');
    }
  };

  const handleDownloadCSV = () => {
    if (filteredAttempts.length === 0) {
      alert('No submissions available to export.');
      return;
    }

    const headers = ['Student Name', 'University ID', 'Email', 'Assignment Title', 'Type', 'Score', 'Total Questions', 'Status', 'Submission Date'];

    const rows = filteredAttempts.map(att => {
      const info = getStudentInfo(att);
      const matInfo = getMaterialInfo(att);
      const status = (att as any).status || (att.score !== null ? 'graded' : 'submitted');
      const scoreText = att.score !== null ? att.score : 'Pending';
      const totalText = att.totalQuestions || 100;
      const dateText = new Date(att.completedAt).toLocaleString();

      return [
        `"${(info.name || '').replace(/"/g, '""')}"`,
        `"${(info.universityId || '').replace(/"/g, '""')}"`,
        `"${(info.email || '').replace(/"/g, '""')}"`,
        `"${(matInfo.title || '').replace(/"/g, '""')}"`,
        `"${(att.type || '').replace(/"/g, '""')}"`,
        `"${scoreText}"`,
        `"${totalText}"`,
        `"${status}"`,
        `"${dateText.replace(/"/g, '""')}"`
      ];
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `student_submissions_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 space-y-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <FileText className="w-6 h-6 text-teal-600" /> Student Submissions & Review
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Filter, sort, review student work, auto-evaluations, and post grades or request revisions.</p>
          </div>
          
          <button
            onClick={handleDownloadCSV}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm cursor-pointer self-start lg:self-auto"
            title="Export current visible submissions to CSV"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>

        {/* Status Filter Quick Tabs / Pills */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 dark:border-slate-700/60 pb-4">
          {[
            { id: 'all', label: 'All Submissions', count: statusCounts.all, color: 'text-slate-600 dark:text-slate-300' },
            { id: 'pending', label: 'Pending Review', count: statusCounts.pending, color: 'text-amber-600 dark:text-amber-400' },
            { id: 'graded', label: 'Graded', count: statusCounts.graded, color: 'text-teal-600 dark:text-teal-400' },
            { id: 'in-progress', label: 'In-Progress', count: statusCounts['in-progress'], color: 'text-blue-600 dark:text-blue-400' },
            { id: 'returned', label: 'Returned', count: statusCounts.returned, color: 'text-purple-600 dark:text-purple-400' },
            { id: 'overdue', label: 'Overdue', count: statusCounts.overdue, color: 'text-rose-600 dark:text-rose-400' },
          ].map((tab) => {
            const isActive = filterStatus === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                  isActive ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search, Status Dropdown & Sorting Toolbar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Search */}
          <div className="relative flex-1">
            <input 
              type="text" 
              placeholder="Search student name, university ID, email, or assignment..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-4 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <div className="flex items-center gap-2">
            {/* Filter Dropdown */}
            <div className="relative flex items-center">
              <Filter className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <select 
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
              >
                <option value="all">Filter: All Statuses</option>
                <option value="pending">Filter: Pending / Needs Review</option>
                <option value="graded">Filter: Graded</option>
                <option value="in-progress">Filter: In-Progress</option>
                <option value="returned">Filter: Returned for Revision</option>
                <option value="overdue">Filter: Overdue</option>
              </select>
            </div>

            {/* Sort Dropdown */}
            <div className="relative flex items-center">
              <ArrowUpDown className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
              <select 
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500 cursor-pointer"
              >
                <option value="newest">Sort: Newest First</option>
                <option value="oldest">Sort: Oldest First</option>
                <option value="score-desc">Sort: Highest Score</option>
                <option value="score-asc">Sort: Lowest Score</option>
                <option value="name-asc">Sort: Student Name (A-Z)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Submissions Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-medium">
                <th className="pb-3 px-4">Student Name & University ID</th>
                <th className="pb-3 px-4">Assignment / Course Title</th>
                <th className="pb-3 px-4">Status</th>
                <th className="pb-3 px-4">Submission Date</th>
                <th className="pb-3 px-4">Time Spent</th>
                <th className="pb-3 px-4">Score & AI Eval</th>
                <th className="pb-3 px-4">Teacher Feedback</th>
                <th className="pb-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {filteredAttempts.map((att) => {
                const status = (att as any).status || (att.score !== null ? 'graded' : 'submitted');
                const info = getStudentInfo(att);
                return (
                  <tr key={att.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900 dark:text-slate-100">{info.name}</div>
                      <div className="text-xs font-semibold text-teal-700 dark:text-teal-400 font-mono flex items-center gap-1 mt-0.5">
                        <IdCard className="w-3.5 h-3.5 text-teal-600" /> Univ ID: {info.universityId}
                      </div>
                      {info.email && <div className="text-[11px] text-slate-400 mt-0.5">{info.email}</div>}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900 dark:text-slate-100 capitalize">
                        {getMaterialInfo(att).title}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[11px] font-medium text-slate-500 capitalize bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                          {att.type}
                        </span>
                        {att.materialId && att.materialId !== 'General' && (
                          <Link 
                            to={`/material/${att.materialId}`} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="inline-flex items-center gap-1 text-xs text-teal-600 dark:text-teal-400 hover:text-teal-700 font-semibold hover:underline"
                          >
                            <ExternalLink className="w-3 h-3" /> View Work
                          </Link>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {(() => {
                        const st = getAttemptStatus(att);
                        const isGraded = st === 'graded';
                        const isReturned = st === 'returned';
                        const isInProgress = st === 'in-progress';
                        const isOverdue = st === 'overdue';
                        const isPending = st === 'pending' || st === 'submitted';

                        return (
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                            isGraded ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' :
                            isReturned ? 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border border-purple-200 dark:border-purple-800' :
                            isInProgress ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800' :
                            isOverdue ? 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border border-rose-200 dark:border-rose-800' :
                            'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${
                              isGraded ? 'bg-emerald-500' : 
                              isReturned ? 'bg-purple-500' : 
                              isInProgress ? 'bg-blue-500' : 
                              isOverdue ? 'bg-rose-500' : 
                              'bg-amber-500'
                            }`}></span>
                            {isPending ? 'PENDING REVIEW' : st.toUpperCase()}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400 text-xs">
                      {new Date(att.completedAt).toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-slate-600 dark:text-slate-400 text-xs">
                      {(att as any).timeSpent || '15 mins'}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-teal-600 dark:text-teal-400">
                        {att.score !== null ? `${att.score} / ${att.totalQuestions}` : 'Pending'}
                      </div>
                      {att.aiFeedback && (
                        <div className="text-[10px] text-slate-400 truncate max-w-[150px]" title={att.aiFeedback}>
                          AI: {att.aiFeedback}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs text-slate-600 dark:text-slate-400">
                      {(att as any).teacherFeedback ? (
                        <span className="text-slate-800 dark:text-slate-200 font-medium" title={(att as any).teacherFeedback}>
                          {(att as any).teacherFeedback.substring(0, 30)}...
                        </span>
                      ) : (
                        <span className="text-slate-400 italic">No feedback yet</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          onClick={() => setSelectedAttempt(att)}
                          className="p-1.5 bg-teal-50 text-teal-600 hover:bg-teal-100 rounded-lg transition-colors"
                          title="View & Grade Submission"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => {
                            setSelectedAttempt(att);
                            setGradingScore(att.score !== null ? att.score.toString() : '');
                            setTeacherFeedback((att as any).teacherFeedback || '');
                          }}
                          className="px-2.5 py-1 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm"
                        >
                          Grade
                        </button>
                        <button 
                          onClick={() => handleReturnForRevision(att)}
                          className="p-1.5 bg-amber-50 text-amber-600 hover:bg-amber-100 rounded-lg transition-colors"
                          title="Return for Revision"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredAttempts.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500 dark:text-slate-400">
                    No submissions found matching criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Grade / View Modal */}
      {selectedAttempt && (() => {
        const modalInfo = getStudentInfo(selectedAttempt);
        const matInfo = getMaterialInfo(selectedAttempt);
        return (
          <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-200">
              <div className="p-5 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                <div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <User className="w-5 h-5 text-teal-600" /> {modalInfo.name}'s Submission
                  </h3>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-400 mt-1">
                    <span className="font-semibold text-teal-700 dark:text-teal-400 font-mono flex items-center gap-1">
                      <IdCard className="w-3.5 h-3.5" /> University ID: {modalInfo.universityId}
                    </span>
                    {modalInfo.email && <span>• Email: {modalInfo.email}</span>}
                    <span className="text-[11px] text-slate-400 font-mono">• System UID: {selectedAttempt.userId}</span>
                  </div>
                </div>
                <button onClick={() => setSelectedAttempt(null)} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-full">
                  <X className="w-5 h-5 text-slate-500" />
                </button>
              </div>

              <form onSubmit={handleGradeSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
              {/* Assignment Banner & Direct Link */}
              <div className="bg-slate-50 dark:bg-slate-800/80 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400 block font-medium">Assignment Title</span>
                  <h4 className="font-bold text-slate-900 dark:text-slate-100 text-base flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-teal-600" /> {matInfo.title}
                  </h4>
                  <p className="text-xs text-slate-500 capitalize mt-0.5">Type: {selectedAttempt.type} Assessment</p>
                </div>
                {selectedAttempt.materialId && selectedAttempt.materialId !== 'General' && (
                  <Link
                    to={`/material/${selectedAttempt.materialId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold transition-colors shadow-sm whitespace-nowrap"
                  >
                    View Specific Work <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-xs text-slate-500 block">Auto / Given Score</span>
                  <span className="font-bold text-teal-600">{selectedAttempt.score !== null ? `${selectedAttempt.score} / ${selectedAttempt.totalQuestions}` : 'Pending'}</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-xs text-slate-500 block">Status</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100 capitalize">{(selectedAttempt as any).status || 'Submitted'}</span>
                </div>
                <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                  <span className="text-xs text-slate-500 block">Completed At</span>
                  <span className="font-semibold text-xs text-slate-700 dark:text-slate-300">{new Date(selectedAttempt.completedAt).toLocaleString()}</span>
                </div>
              </div>

              {selectedAttempt.audioUrl && (
                <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-2">
                  <h4 className="font-semibold text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    Audio Recording Submission
                  </h4>
                  <audio src={selectedAttempt.audioUrl} controls className="w-full h-10" />
                </div>
              )}

              {selectedAttempt.aiFeedback && (
                <div className="bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900/50 p-4 rounded-xl space-y-1">
                  <h4 className="font-semibold text-xs text-teal-900 dark:text-teal-300 flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-teal-600" /> AI Evaluation & Feedback
                  </h4>
                  <p className="text-sm text-slate-700 dark:text-slate-300">{selectedAttempt.aiFeedback}</p>
                </div>
              )}

              <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-800">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Final Score / Grade ({selectedAttempt.totalQuestions} max)</label>
                  <input 
                    type="number" 
                    step="0.5"
                    required
                    value={gradingScore}
                    onChange={(e) => setGradingScore(e.target.value)}
                    placeholder="e.g. 9"
                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Teacher Feedback & Comments</label>
                  <textarea 
                    rows={4}
                    value={teacherFeedback}
                    onChange={(e) => setTeacherFeedback(e.target.value)}
                    placeholder="Provide constructive feedback for the student..."
                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                  ></textarea>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-800">
                <button 
                  type="button"
                  onClick={() => setSelectedAttempt(null)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-semibold hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-6 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold shadow-sm shadow-teal-500/20 transition-colors flex items-center gap-2"
                >
                  <Check className="w-4 h-4" /> Save Grade & Send Feedback
                </button>
              </div>
            </form>
          </div>
        </div>
        );
      })()}
    </div>
  );
}
