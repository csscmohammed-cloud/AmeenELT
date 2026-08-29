import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, deleteDoc, onSnapshot, orderBy } from 'firebase/firestore';

import { db, storage } from '../firebase';
import { SharedFile, UserProfile, Group } from '../types';
import { UploadCloud, File, FileText, FileVideo, FileAudio, FileImage, Download, Trash2, X, Search, CheckCircle, Clock } from 'lucide-react';

interface FileManagerProps {
  role: 'teacher' | 'student';
}

export function FileManager({ role }: FileManagerProps) {
  const { profile } = useAuth();
  const [files, setFiles] = useState<SharedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [searchTerm, setSearchTerm] = useState('');
  
  // For Teachers assigning files
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedFileToShare, setSelectedFileToShare] = useState<SharedFile | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [students, setStudents] = useState<UserProfile[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!profile?.uid) return;

    let q;
    if (role === 'teacher') {
      q = query(collection(db, 'files'), where('uploadedBy', '==', profile.uid));
    } else {
      q = query(collection(db, 'files'));
    }

    const unsub = onSnapshot(q, (snap) => {
      let fetchedFiles = snap.docs.map(d => ({ id: d.id, ...d.data() } as SharedFile));
      
      if (role === 'student') {
        fetchedFiles = fetchedFiles.filter(f => {
          if (f.uploadedBy === profile.uid) return true;
          if (f.targetType === 'student' && f.targetId === profile.uid) return true;
          if (f.targetType === 'group' && profile.groupIds?.includes(f.targetId || '')) return true;
          if (f.targetType === 'class') return true;
          return false;
        });
      }

      fetchedFiles.sort((a, b) => (b.uploadedAt || 0) - (a.uploadedAt || 0));
      
      setFiles(fetchedFiles);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching files:", error);
      setLoading(false);
    });
    
    if (role === 'teacher') {
      const fetchShareData = async () => {
        const groupsSnap = await getDocs(query(collection(db, 'groups')));
        setGroups(groupsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Group)));
        
        const usersSnap = await getDocs(query(collection(db, 'users'), where('role', '==', 'student')));
        setStudents(usersSnap.docs.map(d => ({ id: d.id, ...d.data() } as unknown as UserProfile)));
      };
      fetchShareData();
    }

    return () => unsub();
  }, [profile?.uid, role, profile?.groupIds?.join(',')]);

  
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [pendingUploadFiles, setPendingUploadFiles] = useState<File[]>([]);
  const [uploadDescription, setUploadDescription] = useState('');
  const [uploadTargetType, setUploadTargetType] = useState<'class' | 'group' | 'student'>('class');
  const [uploadTargetId, setUploadTargetId] = useState('');

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (!selectedFiles || selectedFiles.length === 0) return;
    
    if (role === 'teacher') {
      setPendingUploadFiles(Array.from(selectedFiles));
      setShowUploadModal(true);
      setUploadDescription('');
      setUploadTargetType('class');
      setUploadTargetId('');
    } else {
      // Direct upload for students
      Array.from(selectedFiles).forEach((file: any) => handleActualUpload(file, "class", ""));
    }
  };

  
  const handleActualUpload = async (file: File, targetType: string, targetId: string, description?: string) => {
    if (!profile) return;
    
    if (file.size > 700 * 1024) {
      alert(`File ${file.name} is too large. Due to demo constraints, files must be under 700KB.`);
      return;
    }

    setUploadProgress(prev => ({ ...prev, [file.name]: 10 }));

    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      setUploadProgress(prev => ({ ...prev, [file.name]: 50 }));

      const newFile: SharedFile = {
        name: file.name,
        url: dataUrl,
        type: file.type,
        size: file.size,
        uploadedBy: profile.uid,
        uploadedAt: Date.now(),
        isSubmission: role === 'student',
        targetType: targetType as any,
        targetId: targetId,
        description: description || ''
      };
      
      try {
        await addDoc(collection(db, 'files'), newFile);
        
        if (role === 'student') {
           await addDoc(collection(db, 'notifications'), {
              userId: profile.uid,
              title: 'Submission Successful',
              message: `Your file ${file.name} was successfully uploaded.`,
              createdAt: Date.now(),
              read: false
           });
        }
        
        setUploadProgress(prev => {
          const next = { ...prev };
          delete next[file.name];
          return next;
        });
      } catch (error) {
        console.error("Upload failed:", error);
        alert(`Failed to save ${file.name} to database. File might be too large.`);
        setUploadProgress(prev => {
          const next = { ...prev };
          delete next[file.name];
          return next;
        });
      }
    };
    reader.onerror = () => {
       alert('Error reading file');
       setUploadProgress(prev => {
          const next = { ...prev };
          delete next[file.name];
          return next;
        });
    }
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };


  
  const confirmUpload = () => {
    if (pendingUploadFiles.length > 0) {
      pendingUploadFiles.forEach(file => {
        handleActualUpload(file, uploadTargetType, uploadTargetId, uploadDescription);
      });
      setShowUploadModal(false);
      setPendingUploadFiles([]);
    }
  };


  
  const [fileToDelete, setFileToDelete] = useState<SharedFile | null>(null);

  const handleDelete = async () => {
    if (!fileToDelete) return;
    try {
      if (fileToDelete.id) {
        await deleteDoc(doc(db, 'files', fileToDelete.id));
      }
      setFileToDelete(null);
    } catch (e) {
      console.error(e);
      alert('Failed to delete file');
      setFileToDelete(null);
    }
  };


  const getFileIcon = (type: string) => {
    if (type.includes('image')) return <FileImage className="w-8 h-8 text-blue-500" />;
    if (type.includes('audio')) return <FileAudio className="w-8 h-8 text-yellow-500" />;
    if (type.includes('video')) return <FileVideo className="w-8 h-8 text-purple-500" />;
    if (type.includes('pdf') || type.includes('word') || type.includes('document')) return <FileText className="w-8 h-8 text-red-500" />;
    return <File className="w-8 h-8 text-slate-500" />;
  };

  const filteredFiles = files.filter(f => f.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex flex-col md:flex-row justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
            {role === 'teacher' ? 'Course Materials & Shared Files' : 'My Submissions & Course Files'}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {role === 'teacher' ? 'Upload and share resources with your students.' : 'Access materials from teachers and upload your assignments.'}
          </p>
        </div>
        <div className="flex gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search files..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm w-full md:w-64"
            />
          </div>
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
          >
            <UploadCloud className="w-4 h-4" />
            Upload File
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileSelect} 
            className="hidden" 
            multiple 
          />
        </div>
      </div>

      {Object.keys(uploadProgress).length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 space-y-3 shadow-sm">
          <h3 className="text-sm font-semibold">Uploading...</h3>
          {Object.entries(uploadProgress).map(([name, progress]) => (
            <div key={name} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="truncate max-w-[200px]">{name}</span>
                <span>{Math.round(progress as number)}%</span>
              </div>
              <div className="h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-teal-500 transition-all duration-300" style={{ width: `${progress as number}%` }}></div>
              </div>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      ) : filteredFiles.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-slate-800 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
          <File className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-slate-900 dark:text-slate-100">No files found</h3>
          <p className="text-slate-500 dark:text-slate-400">Get started by uploading a file.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredFiles.map(file => (
            <div key={file.id} className="bg-white dark:bg-slate-800 rounded-xl p-4 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow group relative flex flex-col">
              <div className="flex justify-between items-start mb-3">
                {getFileIcon(file.type)}
                {file.uploadedBy === profile?.uid && (
                  <button 
                    onClick={() => setFileToDelete(file)}
                    className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              <h4 className="font-semibold text-slate-900 dark:text-slate-100 line-clamp-2 mb-1 flex-1" title={file.name}>
                {file.name}
              </h4>
              
              {file.description && (
                <p className="text-sm text-slate-600 dark:text-slate-300 mb-3 line-clamp-2">
                  {file.description}
                </p>
              )}
              <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1 mb-4 mt-auto">
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(file.uploadedAt).toLocaleDateString()}
                </div>
                <div>{(file.size / (1024 * 1024)).toFixed(2)} MB</div>
                {role === 'teacher' && (
                  <div className="text-teal-600 dark:text-teal-400 font-medium">
                    {file.targetType === 'class' ? 'Shared with Class' : 
                     file.targetType === 'group' ? `Shared with Group` : 
                     file.targetType === 'student' ? 'Shared with Student' : 'Private'}
                  </div>
                )}
                {role === 'student' && file.isSubmission && (
                  <div className="text-teal-600 dark:text-teal-400 font-medium flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Submitted
                  </div>
                )}
              </div>
              
              <div className="flex gap-2 mt-2 pt-3 border-t border-slate-100 dark:border-slate-700">
                <a 
                  href={file.url}
                  download={file.name}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded text-sm font-medium transition-colors"
                >
                  <Download className="w-4 h-4" /> Download
                </a>
                {role === 'teacher' && file.uploadedBy === profile?.uid && (
                  <button
                    onClick={() => {
                      setSelectedFileToShare(file);
                      setShowShareModal(true);
                    }}
                    className="flex-1 py-1.5 border border-teal-500 text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-900/20 rounded text-sm font-medium transition-colors"
                  >
                    Share
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      
      {showUploadModal && pendingUploadFiles.length > 0 && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <h3 className="font-bold text-lg">Upload File</h3>
              <button onClick={() => setShowUploadModal(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Files: {pendingUploadFiles.map(f => f.name).join(", ")}</p>
              
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea 
                  value={uploadDescription}
                  onChange={(e) => setUploadDescription(e.target.value)}
                  placeholder="Enter file description..."
                  className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700"
                  rows={3}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Share With</label>
                <select 
                  value={uploadTargetType}
                  onChange={(e) => {
                    setUploadTargetType(e.target.value as any);
                    setUploadTargetId('');
                  }}
                  className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700 mb-2"
                >
                  <option value="class">Entire Class</option>
                  <option value="group">Specific Group</option>
                  <option value="student">Specific Student</option>
                </select>

                {uploadTargetType === 'group' && (
                  <select 
                    value={uploadTargetId}
                    onChange={(e) => setUploadTargetId(e.target.value)}
                    className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700"
                  >
                    <option value="" disabled>Select Group...</option>
                    {groups.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                )}

                {uploadTargetType === 'student' && (
                  <select 
                    value={uploadTargetId}
                    onChange={(e) => setUploadTargetId(e.target.value)}
                    className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-700"
                  >
                    <option value="" disabled>Select Student...</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.email})</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="pt-4 flex justify-end gap-2 border-t border-slate-200 dark:border-slate-700">
                <button 
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmUpload}
                  disabled={uploadTargetType !== 'class' && !uploadTargetId}
                  className="px-4 py-2 bg-teal-600 text-white hover:bg-teal-700 rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  Upload & Share
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      
      {fileToDelete && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-sm overflow-hidden p-6 text-center">
            <Trash2 className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-bold mb-2">Delete File?</h3>
            <p className="text-slate-500 dark:text-slate-400 mb-6 text-sm">
              Are you sure you want to delete "{fileToDelete.name}"? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-center">
              <button 
                onClick={() => setFileToDelete(null)}
                className="px-4 py-2 text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleDelete}
                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Delete File
              </button>
            </div>
          </div>
        </div>
      )}

      {showShareModal && selectedFileToShare && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
              <h3 className="font-bold text-lg">Share File</h3>
              <button onClick={() => setShowShareModal(false)} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-300">File: {selectedFileToShare.name}</p>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium">Share with Class (Everyone)</label>
                <button 
                  onClick={async () => {
                    await updateDoc(doc(db, 'files', selectedFileToShare.id!), { targetType: 'class', targetId: '' });
                    setShowShareModal(false);
                  }}
                  className="w-full py-2 bg-teal-50 text-teal-700 hover:bg-teal-100 rounded-lg text-sm font-medium border border-teal-200"
                >
                  Share with All Students
                </button>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                <label className="block text-sm font-medium">Share with a Group</label>
                <div className="grid grid-cols-2 gap-2">
                  {groups.map(g => (
                    <button 
                      key={g.id}
                      onClick={async () => {
                        await updateDoc(doc(db, 'files', selectedFileToShare.id!), { targetType: 'group', targetId: g.id });
                        setShowShareModal(false);
                      }}
                      className="py-1.5 px-3 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 rounded text-sm text-left truncate"
                    >
                      {g.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-700">
                <label className="block text-sm font-medium">Share with a Student</label>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {students.map(s => (
                    <button 
                      key={s.id}
                      onClick={async () => {
                        await updateDoc(doc(db, 'files', selectedFileToShare.id!), { targetType: 'student', targetId: s.id });
                        setShowShareModal(false);
                      }}
                      className="w-full py-1.5 px-3 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 rounded text-sm text-left flex justify-between"
                    >
                      <span>{s.name}</span>
                      <span className="text-slate-400 text-xs">{s.email}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
