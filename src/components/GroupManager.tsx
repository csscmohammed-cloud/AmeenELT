import React, { useState } from 'react';
import { Group, UserProfile } from '../types';
import { collection, addDoc, updateDoc, doc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { Plus, Users, Trash2 } from 'lucide-react';

export function GroupManager({ groups, students }: { groups: Group[], students: any[] }) {
  const { user } = useAuth();
  const [newGroupName, setNewGroupName] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim() || !user) return;
    
    setCreating(true);
    try {
      await addDoc(collection(db, 'groups'), {
        name: newGroupName,
        createdAt: Date.now(),
        createdBy: user.uid
      });
      setNewGroupName('');
    } catch (err) {
      console.error(err);
      alert('Failed to create group');
    } finally {
      setCreating(false);
    }
  };

  const assignStudent = async (studentId: string, groupId: string) => {
    try {
      await updateDoc(doc(db, 'users', studentId), {
        groupIds: arrayUnion(groupId)
      });
    } catch (e) {
      console.error(e);
      alert('Failed to assign student');
    }
  };

  const removeStudent = async (studentId: string, groupId: string) => {
    try {
      await updateDoc(doc(db, 'users', studentId), {
        groupIds: arrayRemove(groupId)
      });
    } catch (e) {
      console.error(e);
      alert('Failed to remove student');
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 mb-4">Create New Group</h2>
        <form onSubmit={handleCreateGroup} className="flex gap-4">
          <input 
            type="text" 
            value={newGroupName}
            onChange={e => setNewGroupName(e.target.value)}
            placeholder="Group Name (e.g. Beginners A)" 
            className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg bg-transparent"
          />
          <button 
            type="submit" 
            disabled={creating}
            className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Create
          </button>
        </form>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {groups.map(group => {
          const groupStudents = students.filter(s => s.groupIds?.includes(group.id));
          const availableStudents = students.filter(s => !s.groupIds?.includes(group.id));
          
          return (
            <div key={group.id} className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Users className="w-5 h-5 text-teal-600" />
                  {group.name}
                </h3>
                <span className="text-sm text-slate-500 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-full">
                  {groupStudents.length} Students
                </span>
              </div>
              
              <div className="space-y-4">
                <div className="max-h-40 overflow-y-auto space-y-2">
                  {groupStudents.map(s => (
                    <div key={s.id} className="flex items-center justify-between text-sm p-2 bg-slate-50 dark:bg-slate-900/50 rounded border border-slate-100 dark:border-slate-700">
                      <span>{s.name || s.email}</span>
                      <button onClick={() => removeStudent(s.id, group.id!)} className="text-red-500 hover:text-red-700 p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {groupStudents.length === 0 && <p className="text-sm text-slate-500 text-center py-2">No students in this group.</p>}
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-700">
                  <select 
                    className="w-full text-sm p-2 border border-slate-300 dark:border-slate-600 rounded bg-transparent"
                    onChange={(e) => {
                      if (e.target.value) {
                        assignStudent(e.target.value, group.id!);
                        e.target.value = "";
                      }
                    }}
                  >
                    <option value="">+ Add student to group...</option>
                    {availableStudents.map(s => (
                      <option key={s.id} value={s.id}>{s.name || s.email}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
