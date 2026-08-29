import React, { useState, useEffect } from 'react';
import { UserProfile, SharedFile, Attempt } from '../types';
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc, addDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { 
  Users, Search, Filter, CheckCircle, XCircle, Trash2, Edit, FileText, 
  Mail, MessageSquare, Calendar, Shield, Award, BarChart2, Download, Plus, AlertCircle, Clock
} from 'lucide-react';
import { StudentProfileModal } from './StudentProfileModal';

interface StudentManagerProps {
  students: UserProfile[];
  pendingStudents: UserProfile[];
  onApprove: (id: string) => Promise<void>;
  onReject: (id: string) => Promise<void>;
}

export function StudentManager({ students, pendingStudents, onApprove, onReject }: StudentManagerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedFaculty, setSelectedFaculty] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [sortBy, setSortBy] = useState<'name' | 'date' | 'grade' | 'progress'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const [selectedStudentForModal, setSelectedStudentForModal] = useState<UserProfile | null>(null);
  const [editingStudent, setEditingStudent] = useState<UserProfile | null>(null);
  const [showCommModal, setShowCommModal] = useState(false);
  const [commType, setCommType] = useState<'message' | 'email' | 'announcement' | 'meeting' | 'note'>('message');
  const [commTargetStudent, setCommTargetStudent] = useState<UserProfile | null>(null);
  const [commMessage, setCommMessage] = useState('');

  // Extract unique departments & faculties for filters
  const departments = Array.from(new Set(students.map(s => s.department).filter(Boolean)));
  const faculties = Array.from(new Set(students.map(s => s.faculty).filter(Boolean)));

  const filteredStudents = students.filter(s => {
    const matchesSearch = 
      (s.name && s.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.email && s.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.universityId && s.universityId.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesDept = selectedDepartment === 'all' || s.department === selectedDepartment;
    const matchesFac = selectedFaculty === 'all' || s.faculty === selectedFaculty;
    const matchesStat = selectedStatus === 'all' || s.status === selectedStatus;

    return matchesSearch && matchesDept && matchesFac && matchesStat;
  }).sort((a, b) => {
    let comp = 0;
    if (sortBy === 'name') {
      comp = (a.name || '').localeCompare(b.name || '');
    } else if (sortBy === 'date') {
      comp = (a.createdAt || 0) - (b.createdAt || 0);
    } else if (sortBy === 'grade') {
      comp = (b.points || 0) - (a.points || 0);
    } else if (sortBy === 'progress') {
      comp = (b.xp || 0) - (a.xp || 0);
    }
    return sortOrder === 'asc' ? comp : -comp;
  });

  const totalPages = Math.ceil(filteredStudents.length / itemsPerPage);
  const paginatedStudents = filteredStudents.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleToggleStatus = async (student: UserProfile) => {
    const targetId = student.id || student.uid;
    if (!targetId) return;
    const newStatus = student.status === 'approved' ? 'pending' : 'approved';
    try {
      await updateDoc(doc(db, 'users', targetId), { status: newStatus, approved: newStatus === 'approved' });
    } catch (e) {
      console.error(e);
      alert('Failed to update student status');
    }
  };

  const handleSendCommunication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commTargetStudent || !commMessage.trim()) return;

    try {
      await addDoc(collection(db, 'notifications'), {
        userId: commTargetStudent.id || commTargetStudent.uid,
        title: `Teacher ${commType.toUpperCase()}`,
        message: commMessage,
        createdAt: Date.now(),
        read: false,
        type: commType
      });
      alert(`${commType.toUpperCase()} sent successfully to ${commTargetStudent.name}!`);
      setShowCommModal(false);
      setCommMessage('');
    } catch (e) {
      console.error(e);
      alert('Failed to send communication');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Pending Approvals Section */}
      {pendingStudents.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-amber-900 dark:text-amber-400 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" /> Pending Student Approvals ({pendingStudents.length})
            </h2>
            <span className="text-xs bg-amber-200 dark:bg-amber-900 text-amber-800 dark:text-amber-200 px-2.5 py-1 rounded-full font-medium">Action Required</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingStudents.map(student => (
              <div key={student.id} className="bg-white dark:bg-slate-800 rounded-xl p-4 shadow-sm border border-amber-100 dark:border-amber-900/50 flex flex-col justify-between gap-3">
                <div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-900/50 text-teal-700 dark:text-teal-300 flex items-center justify-center font-bold">
                      {student.name?.[0]?.toUpperCase() || 'S'}
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-slate-100">{student.name}</h4>
                      <p className="text-xs text-slate-500">{student.email}</p>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-slate-500 grid grid-cols-2 gap-1 bg-slate-50 dark:bg-slate-700/50 p-2 rounded-lg">
                    <div>ID: <span className="font-medium text-slate-700 dark:text-slate-300">{student.universityId || 'N/A'}</span></div>
                    <div>Dept: <span className="font-medium text-slate-700 dark:text-slate-300">{student.department || 'General'}</span></div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => onApprove(student.id || student.uid)}
                    className="flex-1 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1"
                  >
                    <CheckCircle className="w-4 h-4" /> Approve
                  </button>
                  <button 
                    onClick={() => onReject(student.id || student.uid)}
                    className="py-1.5 px-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1"
                  >
                    <XCircle className="w-4 h-4" /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Student Management Controls */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 space-y-6">
        <div className="flex flex-col lg:flex-row justify-between lg:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Users className="w-6 h-6 text-teal-600" /> Student Management System
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Comprehensive student profiles, academic progress, assignments, and files.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium bg-teal-50 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 px-3 py-1.5 rounded-lg border border-teal-200 dark:border-teal-800">
              Total Enrolled: {students.length}
            </span>
          </div>
        </div>

        {/* Search & Filters Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search by name, email, or university ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>

          <select 
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="py-2 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="all">All Departments</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>

          <select 
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="py-2 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="all">All Statuses</option>
            <option value="approved">Active / Approved</option>
            <option value="pending">Pending</option>
            <option value="suspended">Suspended</option>
          </select>

          <div className="flex gap-2">
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="flex-1 py-2 px-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="name">Sort: Name</option>
              <option value="date">Sort: Reg Date</option>
              <option value="grade">Sort: Grade</option>
              <option value="progress">Sort: Progress</option>
            </select>
            <button 
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              className="px-3 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 rounded-xl text-sm font-medium transition-colors"
              title="Toggle Sort Order"
            >
              {sortOrder === 'asc' ? '↑' : '↓'}
            </button>
          </div>
        </div>

        {/* Student Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-medium">
                <th className="pb-3 px-4">Student</th>
                <th className="pb-3 px-4">University ID & Email</th>
                <th className="pb-3 px-4">Faculty / Dept</th>
                <th className="pb-3 px-4">Year & Section</th>
                <th className="pb-3 px-4">Status</th>
                <th className="pb-3 px-4">Progress / Grade</th>
                <th className="pb-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {paginatedStudents.map(student => (
                <tr key={student.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group">
                  <td className="py-3 px-4 font-medium text-slate-900 dark:text-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-teal-500 text-white flex items-center justify-center font-bold shrink-0 shadow-sm">
                        {student.name?.[0]?.toUpperCase() || 'S'}
                      </div>
                      <div>
                        <button 
                          onClick={() => setSelectedStudentForModal(student)}
                          className="hover:text-teal-600 font-semibold text-left transition-colors"
                        >
                          {student.name || 'Unknown Student'}
                        </button>
                        <div className="text-xs text-slate-400 font-normal">
                          Reg: {student.createdAt ? new Date(student.createdAt).toLocaleDateString() : 'N/A'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                    <div className="font-mono text-xs bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded inline-block mb-1">
                      {student.universityId || 'ID-PENDING'}
                    </div>
                    <div className="text-xs text-slate-500">{student.email}</div>
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                    <div className="font-medium">{student.faculty || 'General Faculty'}</div>
                    <div className="text-xs text-slate-400">{student.department || 'General Dept'}</div>
                  </td>
                  <td className="py-3 px-4 text-slate-600 dark:text-slate-400">
                    <div>{student.year || 'Year 1'}</div>
                    <div className="text-xs text-slate-400">Sec: {student.section || 'A'}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${
                      student.status === 'approved' 
                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
                        : student.status === 'suspended'
                        ? 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                        : 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        student.status === 'approved' ? 'bg-emerald-500' : student.status === 'suspended' ? 'bg-red-500' : 'bg-amber-500'
                      }`}></span>
                      {student.status === 'approved' ? 'Active' : student.status === 'suspended' ? 'Suspended' : 'Pending'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="space-y-1 w-32">
                      <div className="flex justify-between text-xs font-medium">
                        <span>Progress</span>
                        <span>{student.xp ? Math.min(100, Math.round(student.xp / 10)) : 0}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full bg-teal-500 rounded-full" style={{ width: `${student.xp ? Math.min(100, Math.round(student.xp / 10)) : 0}%` }}></div>
                      </div>
                      <div className="text-xs text-slate-500">Grade: <span className="font-bold text-teal-600">{student.points || 85}%</span></div>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button 
                        onClick={() => setSelectedStudentForModal(student)}
                        className="p-1.5 bg-teal-50 text-teal-600 hover:bg-teal-100 rounded-lg transition-colors"
                        title="View Full Profile & Files"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => {
                          setCommTargetStudent(student);
                          setCommType('message');
                          setShowCommModal(true);
                        }}
                        className="p-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 text-slate-700 dark:text-slate-200 rounded-lg transition-colors"
                        title="Send Message / Notice"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleToggleStatus(student)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          student.status === 'approved' ? 'bg-amber-50 text-amber-600 hover:bg-amber-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'
                        }`}
                        title={student.status === 'approved' ? 'Suspend Student' : 'Activate Student'}
                      >
                        <Shield className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => onReject(student.id || student.uid)}
                        className="p-1.5 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                        title="Remove Student"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedStudents.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 dark:text-slate-400">
                    No students match the search criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-700">
            <span className="text-xs text-slate-500">
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredStudents.length)} of {filteredStudents.length} students
            </span>
            <div className="flex gap-2">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 disabled:opacity-50 rounded-lg text-xs font-medium"
              >
                Previous
              </button>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 bg-slate-100 dark:bg-slate-700 disabled:opacity-50 rounded-lg text-xs font-medium"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Student Profile & Details Modal */}
      {selectedStudentForModal && (
        <StudentProfileModal 
          student={selectedStudentForModal} 
          onClose={() => setSelectedStudentForModal(null)} 
        />
      )}

      {/* Communication Modal */}
      {showCommModal && commTargetStudent && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-slate-100 capitalize">Send {commType}</h3>
                <p className="text-xs text-slate-500">To: {commTargetStudent.name} ({commTargetStudent.email})</p>
              </div>
              <button onClick={() => setShowCommModal(false)} className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full">
                <XCircle className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            <form onSubmit={handleSendCommunication} className="p-6 space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Communication Type</label>
                <select 
                  value={commType} 
                  onChange={(e) => setCommType(e.target.value as any)}
                  className="w-full p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                >
                  <option value="message">Direct Message</option>
                  <option value="email">Email Notification</option>
                  <option value="announcement">Official Announcement</option>
                  <option value="meeting">Meeting Invitation</option>
                  <option value="note">Instructor Private Note</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">Message Content</label>
                <textarea 
                  rows={4}
                  required
                  placeholder="Type your message or notice here..."
                  value={commMessage}
                  onChange={(e) => setCommMessage(e.target.value)}
                  className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                ></textarea>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button 
                  type="button" 
                  onClick={() => setShowCommModal(false)}
                  className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-sm font-semibold hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="px-5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-sm font-semibold transition-colors flex items-center gap-2 shadow-sm shadow-teal-500/20"
                >
                  Send Now
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
