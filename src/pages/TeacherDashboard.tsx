import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, addDoc, getDocs, where } from 'firebase/firestore';
import { db, sanitizeForFirestore } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Activity, BookOpen, Users, BarChartIcon, Layers, Trash2, Edit, CheckCircle, XCircle, File, Sparkles, Cpu, Key } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { Material, Group } from '../types';
import { ManualCreator } from '../components/ManualCreator';
import { deleteResource } from '../services/libraryService';
import { AssignModal } from '../components/AssignModal';
import { EditMaterialModal } from '../components/EditMaterialModal';
import { GradeModal } from '../components/GradeModal';
import { AIQuizGeneratorModal } from '../components/AIQuizGeneratorModal';
import { AIApiKeySettings } from '../components/AIApiKeySettings';

import { GroupManager } from '../components/GroupManager';
import { FileManager } from '../components/FileManager';
import { StudentManager } from '../components/StudentManager';
import { SubmissionManager } from '../components/SubmissionManager';

import { AICourseGeneratorModal } from '../components/AICourseGeneratorModal';

export function TeacherDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('overview');
  
  const [materials, setMaterials] = useState<Material[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [pendingStudents, setPendingStudents] = useState<any[]>([]);
  const [approvedStudents, setApprovedStudents] = useState<any[]>([]);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [attemptsCount, setAttemptsCount] = useState(0);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  
  const [assigningMaterial, setAssigningMaterial] = useState<Material | null>(null);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [materialToDelete, setMaterialToDelete] = useState<Material | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [gradingSubmission, setGradingSubmission] = useState<any | null>(null);
  const [showAiQuizModal, setShowAiQuizModal] = useState(false);
  const [showAiCourseModal, setShowAiCourseModal] = useState(false);
  const [selectedFolderFilter, setSelectedFolderFilter] = useState('all');
  const [librarySearchQuery, setLibrarySearchQuery] = useState('');

  useEffect(() => {
    if (!user) return;
    
    try {
      const matQ = query(collection(db, 'materials'));
      const unsubMat = onSnapshot(matQ, (snap) => {
        setMaterials(snap.docs.map(d => ({ id: d.id, ...d.data() } as Material)).sort((a, b) => b.createdAt - a.createdAt));
      }, (error) => {
        console.error("Error fetching materials:", error);
        setFetchError("Database error (Quota exceeded or permissions).");
      });

      const grpQ = query(collection(db, 'groups'));
      const unsubGrp = onSnapshot(grpQ, (snap) => {
        setGroups(snap.docs.map(d => ({ id: d.id, ...d.data() } as Group)));
      }, (error) => {
        console.error("Error fetching groups:", error);
        setFetchError("Database error (Quota exceeded or permissions).");
      });

      const usersQ = query(collection(db, 'users'), where('role', '==', 'student'));
      const unsubUsers = onSnapshot(usersQ, (snap) => {
        const allStudents = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
        setPendingStudents(allStudents.filter(s => s.status !== 'approved' && !s.approved));
        setApprovedStudents(allStudents.filter(s => s.status === 'approved' || s.approved));
      }, (error) => {
        console.error("Error fetching users:", error);
        setFetchError("Database error (Quota exceeded or permissions).");
      });

      const attemptsQ = query(collection(db, 'attempts'));
      const unsubAttempts = onSnapshot(attemptsQ, (snap) => {
        const allAttempts = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
        setAttempts(allAttempts.sort((a, b) => b.completedAt - a.completedAt));
        setAttemptsCount(snap.size);
      }, (error) => {
        console.error("Error fetching attempts:", error);
        setFetchError("Database error (Quota exceeded or permissions).");
      });

      return () => {
        unsubMat();
        unsubGrp();
        unsubUsers();
        unsubAttempts();
      };
    } catch (error) {
      console.error("Error setting up listeners:", error);
      setFetchError("Database error (Quota exceeded or permissions).");
    }
  }, [user?.uid]);

  const handleSaveManual = async (material: Omit<Material, 'id' | 'createdAt' | 'createdBy'>) => {
    try {
      const docRef = await addDoc(collection(db, 'materials'), sanitizeForFirestore({
        ...material,
        createdAt: Date.now(),
        createdBy: user!.uid,
        assignedGroups: [],
        assignedUsers: []
      }));
      navigate(`/dashboard/materials/${docRef.id}`);
    } catch (err) {
      console.error(err);
      alert('Failed to save material');
    }
  };

  const handleDeleteMaterial = async (id: string | undefined) => {
    if (!id) {
      alert('Error: Material ID is missing');
      return;
    }
    if (!confirm('Are you sure you want to delete this material?')) return;
    try {
      await deleteResource(id);
    } catch (err) {
      console.error(err);
      alert('Failed to delete material: ' + (err as Error).message);
    }
  };

  const approveStudent = async (id: string) => {
    if (!id) return;
    try {
      await updateDoc(doc(db, 'users', id), { status: 'approved', approved: true });
    } catch (err) {
      console.error(err);
      alert('Failed to approve student');
    }
  };

  const rejectStudent = async (id: string) => {
    if (!id) return;
    if (!confirm('Are you sure you want to reject/delete this student? This action cannot be undone.')) return;
    try {
      await deleteDoc(doc(db, 'users', id));
    } catch (err) {
      console.error(err);
      alert('Failed to reject student');
    }
  };

  
  const handleNotifClick = async (notif: any) => {
    if (!notif.read && notif.id) {
      await updateDoc(doc(db, 'notifications', notif.id), { read: true });
    }
  };
  return (
    <div className="space-y-6">
      {toastMessage && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 p-4 rounded-xl flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-emerald-600 hover:text-emerald-800 p-1">
            <XCircle className="w-4 h-4" />
          </button>
        </div>
      )}
      {fetchError && (
        <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-lg flex items-center gap-3">
          <XCircle className="w-5 h-5 flex-shrink-0" />
          <p>{fetchError}</p>
        </div>
      )}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">Instructor Dashboard</h1>
          <p className="mt-1 text-slate-600 dark:text-slate-400">Manage courses, monitor student progress, and create content.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setActiveTab('ai-settings')}
            className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-xl border transition-all shadow-2xs ${
              activeTab === 'ai-settings'
                ? 'bg-teal-600 text-white border-teal-600'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            <Cpu className="w-4 h-4 text-teal-500" />
            <span>AI Engine & Key Settings</span>
          </button>
        </div>
      </div>

      <div className="border-b border-slate-200 dark:border-slate-700">
        <nav className="-mb-px flex space-x-8 overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'overview'
                ? 'border-teal-500 text-teal-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            <Activity className="w-4 h-4" /> Overview
          </button>
          <button
            onClick={() => setActiveTab('content')}
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'content'
                ? 'border-teal-500 text-teal-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            <BookOpen className="w-4 h-4" /> Content Studio
          </button>
          <button
            onClick={() => setActiveTab('students')}
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'students'
                ? 'border-teal-500 text-teal-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            <Users className="w-4 h-4" /> Students
            {pendingStudents.length > 0 && (
              <span className="bg-yellow-100 text-yellow-800 py-0.5 px-2 rounded-full text-xs">
                {pendingStudents.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('submissions')}
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'submissions'
                ? 'border-teal-500 text-teal-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            <BarChartIcon className="w-4 h-4" /> Submission Review
          </button>
          <button
            onClick={() => setActiveTab('groups')}
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'groups'
                ? 'border-teal-500 text-teal-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            <Layers className="w-4 h-4" /> Groups
          </button>
          <button
            onClick={() => setActiveTab('files')}
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'files'
                ? 'border-teal-500 text-teal-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            <File className="w-4 h-4" /> Files
          </button>
          <button
            onClick={() => setActiveTab('ai-settings')}
            className={`whitespace-nowrap pb-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === 'ai-settings'
                ? 'border-teal-500 text-teal-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
            }`}
          >
            <Cpu className="w-4 h-4 text-teal-600" /> AI Engine & API Keys
            <span className="bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300 py-0.5 px-2 rounded-full text-[10px] font-bold uppercase">
              Config
            </span>
          </button>
        </nav>
      </div>

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Active Students</p>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{approvedStudents.length}</p>
              <div className="p-2 bg-teal-50 text-teal-600 rounded-lg">
                <Users className="w-5 h-5" />
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Materials</p>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{materials.length}</p>
              <div className="p-2 bg-teal-50 text-teal-600 rounded-lg">
                <BookOpen className="w-5 h-5" />
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm">
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Quiz Attempts</p>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{attemptsCount}</p>
              <div className="p-2 bg-teal-50 text-teal-600 rounded-lg">
                <Activity className="w-5 h-5" />
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'content' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div className="space-y-6">
            <section className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-teal-600" />
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Content Studio</h2>
                </div>
              </div>
              
              <div className="mb-8 p-6 bg-gradient-to-br from-purple-50 to-indigo-50 dark:from-purple-900/10 dark:to-indigo-900/10 border border-purple-100 dark:border-purple-800/30 rounded-xl flex flex-col sm:flex-row items-center gap-6 justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-purple-600" />
                    AI Interactive Course
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">Generate complete interactive lessons with slides, flashcards, and drag-and-drop activities automatically.</p>
                </div>
                <button
                  onClick={() => setShowAiCourseModal(true)}
                  className="whitespace-nowrap px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg shadow-sm transition-colors"
                >
                  Create Course
                </button>
              </div>

              <ManualCreator onSave={handleSaveManual} onCancel={() => {}} groups={groups} />
            </section>
          </div>

          <div className="space-y-6">
            <section className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Published Library ({materials.length})</h2>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={librarySearchQuery}
                    onChange={e => setLibrarySearchQuery(e.target.value)}
                    placeholder="Search library..."
                    className="px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg"
                  />
                  <select
                    value={selectedFolderFilter}
                    onChange={e => setSelectedFolderFilter(e.target.value)}
                    className="px-3 py-1.5 text-xs border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 rounded-lg"
                  >
                    <option value="all">All Folders</option>
                    {Array.from(new Set(materials.map(m => m.folder || 'General English'))).map(f => (
                      <option key={f} value={f}>{f}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 max-h-[600px] overflow-y-auto pr-1">
                {materials
                  .filter(m => {
                    const matchesFolder = selectedFolderFilter === 'all' || (m.folder || 'General English') === selectedFolderFilter;
                    const matchesSearch = !librarySearchQuery || m.title.toLowerCase().includes(librarySearchQuery.toLowerCase()) || m.topic.toLowerCase().includes(librarySearchQuery.toLowerCase());
                    return matchesFolder && matchesSearch;
                  })
                  .map(mat => (
                  <div key={mat.id} className="flex flex-col sm:flex-row sm:items-center justify-between border border-slate-200 dark:border-slate-700 rounded-lg p-4 hover:border-teal-300 hover:shadow-sm transition-all bg-slate-50 dark:bg-slate-800/50 hover:bg-white dark:bg-slate-800">
                    <Link to={`/dashboard/materials/${mat.id}`} className="block group flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-900 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider">
                          {mat.type}
                        </span>
                        {mat.cefrLevel && (
                          <span className="bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-900 px-2 py-0.5 rounded text-[10px] font-bold">
                            CEFR {mat.cefrLevel}
                          </span>
                        )}
                        <span className="bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded text-[10px] font-medium">
                          📁 {mat.folder || 'General English'}
                        </span>
                      </div>
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-teal-600 line-clamp-1 mt-1">{mat.title}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">{mat.topic}</p>
                      {mat.tags && mat.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {mat.tags.map((tag, ti) => (
                            <span key={ti} className="text-[10px] bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </Link>
                    <div className="mt-4 sm:mt-0 sm:ml-4 flex items-center shrink-0 gap-2">
                      <button 
                        onClick={() => setAssigningMaterial(mat)}
                        className="px-3 py-1.5 bg-teal-50 text-teal-600 hover:bg-teal-100 rounded-md text-xs font-bold transition-colors"
                      >
                        Assign
                      </button>
                      <button 
                        onClick={() => setEditingMaterial(mat)}
                        className="p-1.5 text-slate-400 hover:text-teal-600 rounded transition-colors"
                        title="Edit published resource"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setMaterialToDelete(mat);
                        }}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-lg transition-colors cursor-pointer"
                        title="Delete published item"
                      >
                        <Trash2 className="w-5 h-5 pointer-events-none" />
                      </button>
                    </div>
                  </div>
                ))}
                {materials.length === 0 && (
                  <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-8">No materials created yet.</p>
                )}
              </div>
            </section>
          </div>
        </div>
      )}

      {activeTab === 'students' && (
        <StudentManager 
          students={approvedStudents} 
          pendingStudents={pendingStudents} 
          onApprove={approveStudent} 
          onReject={rejectStudent} 
        />
      )}

      {activeTab === 'submissions' && (
        <SubmissionManager attempts={attempts} students={[...approvedStudents, ...pendingStudents]} materials={materials} />
      )}
      {activeTab === 'groups' && (
        <GroupManager groups={groups} students={approvedStudents} />
      )}
      {activeTab === 'files' && (
        <FileManager role="teacher" />
      )}

      {activeTab === 'ai-settings' && (
        <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
          <AIApiKeySettings standalone={true} />
        </div>
      )}

      {assigningMaterial && (
        <AssignModal 
          material={assigningMaterial} 
          onClose={() => setAssigningMaterial(null)}
          onAssigned={(groups, users, date) => {
            setAssigningMaterial(null);
            alert('Assigned successfully!');
          }}
        />
      )}

      {editingMaterial && (
        <EditMaterialModal
          material={editingMaterial}
          onClose={() => setEditingMaterial(null)}
          onUpdated={(mat) => {
            setEditingMaterial(null);
          }}
        />
      )}
      
      {gradingSubmission && (
        <GradeModal
          submission={gradingSubmission}
          onClose={() => setGradingSubmission(null)}
        />
      )}

      {showAiCourseModal && (
        <AICourseGeneratorModal
          isOpen={showAiCourseModal}
          onClose={() => setShowAiCourseModal(false)}
          onCourseGenerated={async (courseData, title, cefrLevel) => {
            setShowAiCourseModal(false);
            const newMaterial = {
              type: 'interactive-course' as const,
              title,
              topic: title,
              cefrLevel,
              folder: 'AI Generated Courses',
              content: courseData,
              tags: ['AI', cefrLevel]
            };
            await handleSaveManual(newMaterial);
          }}
        />
      )}

      {materialToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <div className="p-3 bg-red-100 dark:bg-red-950/50 rounded-full shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Delete Published Resource</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">This action will remove it from the library.</p>
              </div>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300">
              Are you sure you want to delete <span className="font-semibold text-slate-900 dark:text-slate-100">"{materialToDelete.title}"</span>?
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setMaterialToDelete(null)}
                className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 text-sm font-semibold rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  if (!materialToDelete.id) return;
                  setIsDeleting(true);
                  try {
                    await deleteResource(materialToDelete.id);
                    setToastMessage(`Deleted "${materialToDelete.title}" successfully.`);
                    setMaterialToDelete(null);
                    setTimeout(() => setToastMessage(null), 3000);
                  } catch (err) {
                    console.error("Delete error:", err);
                    alert('Failed to delete material: ' + (err as Error).message);
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm flex items-center gap-2"
              >
                {isDeleting ? 'Deleting...' : 'Delete Material'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
