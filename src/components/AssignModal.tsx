import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { UserProfile, Group, Material } from '../types';
import { X, Search, CheckCircle2 } from 'lucide-react';

interface AssignModalProps {
  material: Material;
  onClose: () => void;
  onAssigned: (updatedGroups: string[], updatedUsers: string[], dueDate: number | null) => void;
}

export function AssignModal({ material, onClose, onAssigned }: AssignModalProps) {
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedGroups, setSelectedGroups] = useState<string[]>(material.assignedGroups || []);
  const [selectedUsers, setSelectedUsers] = useState<string[]>(material.assignedUsers || []);
  const [dueDate, setDueDate] = useState<string>(material.dueDate ? new Date(material.dueDate).toISOString().slice(0, 16) : '');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'groups' | 'students'>('groups');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const usersQuery = query(collection(db, 'users'), where('role', '==', 'student'), where('status', '==', 'approved'));
        const usersSnap = await getDocs(usersQuery);
        setStudents(usersSnap.docs.map(d => d.data() as UserProfile));

        const groupsQuery = query(collection(db, 'groups'));
        const groupsSnap = await getDocs(groupsQuery);
        setGroups(groupsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Group)));
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSave = async () => {
    if (!material.id) return;
    setIsSaving(true);
    try {
      await updateDoc(doc(db, 'materials', material.id), {
        assignedGroups: selectedGroups,
        assignedUsers: selectedUsers,
        dueDate: dueDate ? new Date(dueDate).getTime() : null
      });
      onAssigned(selectedGroups, selectedUsers, dueDate ? new Date(dueDate).getTime() : null);
    } catch (error) {
      console.error("Error updating assignment:", error);
      alert("Failed to update assignments");
    } finally {
      setIsSaving(false);
    }
  };

  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.universityId && s.universityId.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const filteredGroups = groups.filter(g => 
    g.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="flex justify-between items-center p-6 border-b border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Assign Material</h2>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
          <div className="mb-4">
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Due Date & Time (Optional)</label>
            <input
              type="datetime-local"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 dark:text-slate-100 outline-none"
            />
          </div>

          <div className="relative">
            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder={`Search ${activeTab}...`}
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 dark:text-slate-100 outline-none"
            />
          </div>
          
          <div className="flex gap-4 mt-4">
            <button 
              onClick={() => setActiveTab('groups')}
              className={`pb-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'groups' ? 'border-teal-600 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
            >
              Groups ({groups.length})
            </button>
            <button 
              onClick={() => setActiveTab('students')}
              className={`pb-2 text-sm font-medium border-b-2 transition-colors ${activeTab === 'students' ? 'border-teal-600 text-teal-600' : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'}`}
            >
              Specific Students ({students.length})
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-white dark:bg-slate-800">
          {loading ? (
            <div className="text-center py-8 text-slate-500">Loading...</div>
          ) : activeTab === 'groups' ? (
            <div className="space-y-2">
              {filteredGroups.length === 0 ? (
                <p className="text-slate-500 text-center py-4">No groups found.</p>
              ) : (
                filteredGroups.map(group => {
                  const isSelected = selectedGroups.includes(group.id!);
                  return (
                    <div 
                      key={group.id}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedGroups(prev => prev.filter(id => id !== group.id));
                        } else {
                          setSelectedGroups(prev => [...prev, group.id!]);
                        }
                      }}
                      className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-colors ${isSelected ? 'border-teal-600 bg-teal-50 dark:bg-teal-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}`}
                    >
                      <div>
                        <p className="font-medium text-slate-900 dark:text-slate-100">{group.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          {group.level || ''} {group.year ? `• Year ${group.year}` : ''}
                        </p>
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-teal-600 bg-teal-600 text-white' : 'border-slate-300 dark:border-slate-600'}`}>
                        {isSelected && <CheckCircle2 className="w-4 h-4" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredStudents.length === 0 ? (
                <p className="text-slate-500 text-center py-4">No students found.</p>
              ) : (
                filteredStudents.map(student => {
                  const isSelected = selectedUsers.includes(student.uid);
                  return (
                    <div 
                      key={student.uid}
                      onClick={() => {
                        if (isSelected) {
                          setSelectedUsers(prev => prev.filter(id => id !== student.uid));
                        } else {
                          setSelectedUsers(prev => [...prev, student.uid]);
                        }
                      }}
                      className={`flex items-center justify-between p-3 rounded-lg border-2 cursor-pointer transition-colors ${isSelected ? 'border-teal-600 bg-teal-50 dark:bg-teal-900/20' : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'}`}
                    >
                      <div>
                        <p className="font-medium text-slate-900 dark:text-slate-100">{student.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{student.email} • ID: {student.universityId}</p>
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-teal-600 bg-teal-600 text-white' : 'border-slate-300 dark:border-slate-600'}`}>
                        {isSelected && <CheckCircle2 className="w-4 h-4" />}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex justify-between items-center">
          <div className="text-sm text-slate-500 dark:text-slate-400">
            Selected: <span className="font-semibold">{selectedGroups.length}</span> Groups, <span className="font-semibold">{selectedUsers.length}</span> Students
          </div>
          <div className="flex gap-3">
            <button 
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              Cancel
            </button>
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2 text-sm font-medium text-white bg-teal-600 rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Assign & Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
