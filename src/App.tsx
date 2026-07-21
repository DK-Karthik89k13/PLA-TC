/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Award, BookOpen, Calendar, ChevronRight, Contact, Cpu, FileText, 
  GraduationCap, LogIn, LogOut, Mail, Plus, Shield, Sparkles, Trophy, 
  Users, Eye, Building, ListOrdered, Clock, UserPlus, FileCheck2, ShieldAlert, RefreshCw, X, Trash2, CheckCircle2
} from 'lucide-react';
import { User, Test, TestResult, PlacementDrive, TrainingResource } from './types';
import { ContactModal } from './components/InfoModals';
import { PlacementCoach } from './components/PlacementCoach';
import { AiTestGenerator } from './components/AiTestGenerator';
import { TakeTest } from './components/TakeTest';

export default function App() {
  // Authentication state
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('pla_tc_current_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authRole, setAuthRole] = useState<'student' | 'admin'>('student');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regBranchType, setRegBranchType] = useState<string>('Circuit');
  const [regDepartment, setRegDepartment] = useState<string>('CSE');
  const [authError, setAuthError] = useState<string | null>(null);

  // App data state
  const [tests, setTests] = useState<Test[]>([]);
  const [results, setResults] = useState<TestResult[]>([]);
  const [placementDrives, setPlacementDrives] = useState<PlacementDrive[]>([]);
  const [trainingResources, setTrainingResources] = useState<TrainingResource[]>([]);

  // Navigation / Modals state
  const [activeTab, setActiveTab] = useState<string>('tests'); // for student or admin dashboards
  const [isContactOpen, setIsContactOpen] = useState(false);

  // Active testing state
  const [activeTest, setActiveTest] = useState<Test | null>(null);

  // Manual Test Creator state (Admin)
  const [newTestTitle, setNewTestTitle] = useState('');
  const [newTestDesc, setNewTestDesc] = useState('');
  const [newTestDuration, setNewTestDuration] = useState(15);
  const [newTestCategory, setNewTestCategory] = useState('Technical');
  const [manualQuestions, setManualQuestions] = useState<Array<{ question: string, options: string[], correctAnswer: number }>>([
    { question: '', options: ['', '', '', ''], correctAnswer: 0 }
  ]);
  const [adminMessage, setAdminMessage] = useState<string | null>(null);

  // Manual Placement Drive state (Admin)
  const [newCompany, setNewCompany] = useState('');
  const [newRole, setNewRole] = useState('');
  const [newSalary, setNewSalary] = useState('');
  const [newEligibility, setNewEligibility] = useState('');
  const [newDeadline, setNewDeadline] = useState('');
  const [newDriveStatus, setNewDriveStatus] = useState<'Open' | 'Upcoming'>('Open');
  const [editingDriveId, setEditingDriveId] = useState<string | null>(null);
  const [allStudents, setAllStudents] = useState<User[]>([]);

  // User editing state
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editUserName, setEditUserName] = useState('');
  const [editUserUsername, setEditUserUsername] = useState('');
  const [editUserEmail, setEditUserEmail] = useState('');
  const [editUserRole, setEditUserRole] = useState<'student' | 'admin' | 'faculty'>('student');
  const [editUserBranchType, setEditUserBranchType] = useState<string>('Circuit');
  const [editUserDepartment, setEditUserDepartment] = useState<string>('CSE');
  const [editUserPassword, setEditUserPassword] = useState('');

  // User creation state
  const [createUserName, setCreateUserName] = useState('');
  const [createUserUsername, setCreateUserUsername] = useState('');
  const [createUserPassword, setCreateUserPassword] = useState('');
  const [createUserEmail, setCreateUserEmail] = useState('');
  const [createUserRole, setCreateUserRole] = useState<'student' | 'admin' | 'faculty'>('student');
  const [createUserApproved, setCreateUserApproved] = useState(true);
  const [createUserBranchType, setCreateUserBranchType] = useState<string>('Circuit');
  const [createUserDepartment, setCreateUserDepartment] = useState<string>('CSE');

  // Resource viewer state
  const [activeResource, setActiveResource] = useState<TrainingResource | null>(null);

  // Print & filtering state (Admin/Faculty)
  const [filterDepartment, setFilterDepartment] = useState<string>('All');
  const [filterSectionDept, setFilterSectionDept] = useState<string>('All');
  const [filterPendingDept, setFilterPendingDept] = useState<string>('All');
  const [filterPendingRole, setFilterPendingRole] = useState<string>('All');
  const [printPreviewType, setPrintPreviewType] = useState<'gradebook' | 'section-list' | null>(null);
  const [printOrientation, setPrintOrientation] = useState<'portrait' | 'landscape'>('landscape');

  // Active Tests admin panel: view test details (with correct answers) and delete
  const [viewingTest, setViewingTest] = useState<Test | null>(null);

  // Fetch initial portal data
  const loadPortalData = async () => {
    try {
      // Fetch placement drives
      const driveRes = await fetch('/api/placement-drives');
      if (driveRes.ok) {
        const driveData = await driveRes.json();
        setPlacementDrives(driveData.placementDrives);
      }

      // Fetch training resources
      const trRes = await fetch('/api/training-resources');
      if (trRes.ok) {
        const trData = await trRes.json();
        setTrainingResources(trData.trainingResources);
      }

      // Fetch tests (pass current user role to strip out answers if student)
      const roleParam = currentUser ? currentUser.role : 'student';
      const testsRes = await fetch(`/api/tests?role=${roleParam}`);
      if (testsRes.ok) {
        const testsData = await testsRes.json();
        setTests(testsData.tests);
      }

      // Fetch results and users if admin
      if (currentUser) {
        if (currentUser.role === 'student') {
          const resRes = await fetch(`/api/results/student/${currentUser.id}`);
          if (resRes.ok) {
            const resData = await resRes.json();
            setResults(resData.results);
          }
        } else {
          const resRes = await fetch('/api/results/all');
          if (resRes.ok) {
            const resData = await resRes.json();
            setResults(resData.results);
          }
          // Fetch student registrations
          const usersRes = await fetch('/api/users');
          if (usersRes.ok) {
            const usersData = await usersRes.json();
            setAllStudents(usersData.users);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching portal data:', error);
    }
  };

  useEffect(() => {
    loadPortalData();
  }, [currentUser]);

  // Keep admin/faculty user & test data fresh in case another admin/faculty
  // adds or changes something in a separate session
  useEffect(() => {
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.role !== 'faculty')) return;
    const interval = setInterval(() => {
      loadPortalData();
    }, 15000);
    return () => clearInterval(interval);
  }, [currentUser]);

  // Keep the session in sync with localStorage so a page reload
  // doesn't kick the user back to the login screen
  useEffect(() => {
    try {
      if (currentUser) {
        localStorage.setItem('pla_tc_current_user', JSON.stringify(currentUser));
      } else {
        localStorage.removeItem('pla_tc_current_user');
      }
    } catch {
      // localStorage unavailable (e.g. private browsing) — ignore
    }
  }, [currentUser]);

  // Auth: Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Login failed. Verify credentials.');
      }

      const data = await response.json();
      setCurrentUser(data.user);
      setUsername('');
      setPassword('');
      // Set default tabs based on role
      setActiveTab((data.user.role === 'admin' || data.user.role === 'faculty') ? 'ai-generator' : 'tests');
    } catch (err: any) {
      setAuthError(err.message);
    }
  };

  // Auth: Handle Registration (Students only)
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);

    if (!username || !password || !regName || !regEmail) {
      setAuthError('All registration fields are required.');
      return;
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          password,
          name: regName,
          email: regEmail,
          branchType: regBranchType,
          department: regDepartment
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Registration failed.');
      }

      const data = await response.json();
      setCurrentUser(data.user);
      setUsername('');
      setPassword('');
      setRegName('');
      setRegEmail('');
      setRegBranchType('Circuit');
      setRegDepartment('CSE');
      setActiveTab('tests');
    } catch (err: any) {
      setAuthError(err.message);
    }
  };

  // Auth: Logout
  const handleLogout = () => {
    setCurrentUser(null);
    setTests([]);
    setResults([]);
    setActiveTab('tests');
    setActiveTest(null);
    try {
      localStorage.removeItem('pla_tc_current_user');
    } catch {
      // ignore
    }
  };

  // Admin: Add dynamic question block
  const addQuestionBlock = () => {
    setManualQuestions((prev) => [
      ...prev,
      { question: '', options: ['', '', '', ''], correctAnswer: 0 }
    ]);
  };

  const removeQuestionBlock = (idx: number) => {
    if (manualQuestions.length <= 1) return;
    setManualQuestions((prev) => prev.filter((_, qIdx) => qIdx !== idx));
  };

  const updateQuestionField = (qIdx: number, field: string, val: any) => {
    setManualQuestions((prev) => prev.map((q, idx) => {
      if (idx !== qIdx) return q;
      return { ...q, [field]: val };
    }));
  };

  const updateOptionField = (qIdx: number, oIdx: number, val: string) => {
    setManualQuestions((prev) => prev.map((q, idx) => {
      if (idx !== qIdx) return q;
      const newOpts = [...q.options];
      newOpts[oIdx] = val;
      return { ...q, options: newOpts };
    }));
  };

  // Admin: Save Manual Test
  const handleSaveManualTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminMessage(null);

    // Validation
    if (!newTestTitle.trim() || manualQuestions.some(q => !q.question.trim() || q.options.some(o => !o.trim()))) {
      setAdminMessage('Error: All questions and option fields must be completely filled out.');
      return;
    }

    try {
      const response = await fetch('/api/tests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newTestTitle,
          description: newTestDesc,
          duration: newTestDuration,
          category: newTestCategory,
          questions: manualQuestions
        })
      });

      if (!response.ok) throw new Error('Failed to create manual test.');

      setNewTestTitle('');
      setNewTestDesc('');
      setNewTestDuration(15);
      setNewTestCategory('Technical');
      setManualQuestions([{ question: '', options: ['', '', '', ''], correctAnswer: 0 }]);
      setAdminMessage('Success: Placement mock test uploaded and published successfully!');
      loadPortalData();
    } catch (err: any) {
      setAdminMessage(`Error: ${err.message}`);
    }
  };

  // Admin: Save or Update Placement Drive
  const handleSaveDrive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompany || !newRole || !newSalary || !newEligibility || !newDeadline) return;

    try {
      const url = editingDriveId 
        ? `/api/placement-drives/${editingDriveId}` 
        : '/api/placement-drives';
      const method = editingDriveId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company: newCompany,
          role: newRole,
          salaryPackage: newSalary,
          eligibility: newEligibility,
          date: newDeadline,
          status: newDriveStatus
        })
      });

      if (response.ok) {
        setNewCompany('');
        setNewRole('');
        setNewSalary('');
        setNewEligibility('');
        setNewDeadline('');
        setEditingDriveId(null);
        loadPortalData();
        alert(editingDriveId ? 'Recruitment drive updated successfully!' : 'Recruitment drive published successfully!');
      } else {
        alert('Failed to save recruitment drive details.');
      }
    } catch (error) {
      console.error(error);
      alert('Error saving recruitment drive.');
    }
  };

  // Admin: Delete Placement Drive
  const handleDeleteDrive = async (id: string) => {
    if (!confirm('Are you sure you want to delete this recruitment drive?')) return;
    try {
      const response = await fetch(`/api/placement-drives/${id}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        if (editingDriveId === id) {
          setEditingDriveId(null);
          setNewCompany('');
          setNewRole('');
          setNewSalary('');
          setNewEligibility('');
          setNewDeadline('');
        }
        loadPortalData();
        alert('Recruitment drive deleted successfully!');
      } else {
        alert('Failed to delete recruitment drive.');
      }
    } catch (error) {
      console.error(error);
      alert('Error deleting recruitment drive.');
    }
  };

  // Admin: Edit Placement Drive Initiator
  const handleStartEditDrive = (drive: PlacementDrive) => {
    setEditingDriveId(drive.id);
    setNewCompany(drive.company);
    setNewRole(drive.role);
    setNewSalary(drive.salaryPackage);
    setNewEligibility(drive.eligibility);
    setNewDeadline(drive.date);
    setNewDriveStatus(drive.status as any);
  };

  const handleCancelEditDrive = () => {
    setEditingDriveId(null);
    setNewCompany('');
    setNewRole('');
    setNewSalary('');
    setNewEligibility('');
    setNewDeadline('');
  };

  // Admin: Delete a test from the Active Tests panel
  const handleDeleteTest = async (testId: string, testTitle: string) => {
    if (!window.confirm(`Delete "${testTitle}"? This also removes any student results tied to it. This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/tests/${testId}`, { method: 'DELETE' });
      if (res.ok) {
        setTests((prev) => prev.filter((t) => t.id !== testId));
        setResults((prev) => prev.filter((r) => r.testId !== testId));
        if (viewingTest?.id === testId) setViewingTest(null);
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Failed to delete test.');
      }
    } catch (err) {
      alert('Network error while deleting test.');
    }
  };

  // Admin: Delete a single result from the Student Gradebook
  const handleDeleteResult = async (resultId: string) => {
    if (!window.confirm('Delete this result? This cannot be undone.')) return;
    try {
      const res = await fetch(`/api/results/${resultId}`, { method: 'DELETE' });
      if (res.ok) {
        setResults((prev) => prev.filter((r) => r.id !== resultId));
      } else {
        const data = await res.json().catch(() => ({}));
        alert(data.error || 'Failed to delete result.');
      }
    } catch (err) {
      alert('Network error while deleting result.');
    }
  };

  // Admin: Approve user account
  const handleApproveUser = async (userId: string) => {
    try {
      const response = await fetch(`/api/users/${userId}/approve`, {
        method: 'PUT'
      });
      if (response.ok) {
        alert('Student account approved successfully!');
        loadPortalData();
      } else {
        alert('Failed to approve user.');
      }
    } catch (error) {
      console.error(error);
      alert('Error approving user.');
    }
  };

  // Admin: Reject/Delete user account
  const handleRejectUser = async (userId: string) => {
    const userToDelete = allStudents.find(s => s.id === userId);
    if (currentUser?.role === 'faculty' && userToDelete && userToDelete.role !== 'student') {
      alert('As faculty, you are only authorized to delete student accounts.');
      return;
    }
    if (!confirm('Are you sure you want to reject and delete this user registration?')) return;
    try {
      const response = await fetch(`/api/users/${userId}`, {
        method: 'DELETE'
      });
      if (response.ok) {
        alert('Student account deleted successfully.');
        loadPortalData();
      } else {
        alert('Failed to delete user.');
      }
    } catch (error) {
      console.error(error);
      alert('Error deleting user.');
    }
  };

  // Admin: Approve ALL pending user registrations at once
  const handleApproveAllPending = async () => {
    const pending = allStudents.filter(s => s.approved === false)
      .filter(s => filterPendingDept === 'All' || (s.department || '').toLowerCase() === filterPendingDept.toLowerCase())
      .filter(s => filterPendingRole === 'All' || s.role === filterPendingRole);
    if (pending.length === 0) return;
    const scopeLabel = (filterPendingDept !== 'All' || filterPendingRole !== 'All') ? ' matching the current filter' : '';
    if (!confirm(`Approve all ${pending.length} pending registration(s)${scopeLabel}?`)) return;

    try {
      const results = await Promise.allSettled(
        pending.map(u => fetch(`/api/users/${u.id}/approve`, { method: 'PUT' }))
      );
      const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.ok)).length;
      if (failed > 0) {
        alert(`Approved ${pending.length - failed} of ${pending.length}. ${failed} failed - please retry those individually.`);
      } else {
        alert(`All ${pending.length} pending account(s) approved successfully!`);
      }
      loadPortalData();
    } catch (error) {
      console.error(error);
      alert('Error approving all pending users.');
    }
  };

  // Admin: Reject ALL pending user registrations at once (permanently deletes them from the database)
  const handleRejectAllPending = async () => {
    // Faculty can only reject student accounts, mirroring the single-user rejection rule
    const pending = allStudents.filter(s => s.approved === false && (currentUser?.role === 'admin' || s.role === 'student'))
      .filter(s => filterPendingDept === 'All' || (s.department || '').toLowerCase() === filterPendingDept.toLowerCase())
      .filter(s => filterPendingRole === 'All' || s.role === filterPendingRole);
    if (pending.length === 0) return;
    const scopeLabel = (filterPendingDept !== 'All' || filterPendingRole !== 'All') ? ' matching the current filter' : '';
    if (!confirm(`Reject and permanently delete all ${pending.length} pending registration(s)${scopeLabel} from the database? This cannot be undone.`)) return;

    try {
      const results = await Promise.allSettled(
        pending.map(u => fetch(`/api/users/${u.id}`, { method: 'DELETE' }))
      );
      const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.ok)).length;
      if (failed > 0) {
        alert(`Deleted ${pending.length - failed} of ${pending.length}. ${failed} failed - please retry those individually.`);
      } else {
        alert(`All ${pending.length} pending registration(s) rejected and deleted successfully.`);
      }
      loadPortalData();
    } catch (error) {
      console.error(error);
      alert('Error rejecting all pending users.');
    }
  };

  // Admin: Change user role/privilege
  const handleChangeUserRole = async (userId: string, newRole: 'student' | 'admin' | 'faculty') => {
    try {
      const response = await fetch(`/api/users/${userId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      });
      if (response.ok) {
        alert(`User privilege updated to ${newRole} successfully!`);
        loadPortalData();
      } else {
        alert('Failed to update user privilege.');
      }
    } catch (error) {
      console.error(error);
      alert('Error updating user privilege.');
    }
  };

  // Admin: Update user details (Name, Username, Email, Role)
  const handleUpdateUserDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    try {
      const response = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editUserName,
          username: editUserUsername,
          email: editUserEmail,
          role: editUserRole,
          branchType: editUserBranchType,
          department: editUserDepartment,
          ...(editUserPassword.trim() ? { password: editUserPassword.trim() } : {})
        })
      });

      if (response.ok) {
        alert('User details updated successfully!');
        setEditingUser(null);
        setEditUserPassword('');
        loadPortalData();
      } else {
        const errData = await response.json();
        alert(errData.error || 'Failed to update user details.');
      }
    } catch (error) {
      console.error(error);
      alert('Error updating user details.');
    }
  };

  const startEditingUser = (student: User) => {
    setEditingUser(student);
    setEditUserName(student.name);
    setEditUserUsername(student.username);
    setEditUserEmail(student.email);
    setEditUserRole(student.role);
    setEditUserBranchType(student.branchType || 'Circuit');
    setEditUserDepartment(student.department || 'CSE');
    setEditUserPassword('');
  };

  // Admin: Create a new user (Student, Admin, or Faculty)
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createUserName.trim() || !createUserUsername.trim() || !createUserPassword.trim() || !createUserEmail.trim() || !createUserRole) {
      alert('All fields are required.');
      return;
    }

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createUserName,
          username: createUserUsername,
          password: createUserPassword,
          email: createUserEmail,
          role: currentUser?.role === 'faculty' ? 'student' : createUserRole,
          approved: createUserApproved,
          branchType: createUserBranchType,
          department: createUserDepartment
        })
      });

      if (response.ok) {
        alert('User created successfully!');
        // Reset creation form
        setCreateUserName('');
        setCreateUserUsername('');
        setCreateUserPassword('');
        setCreateUserEmail('');
        setCreateUserRole('student');
        setCreateUserApproved(true);
        setCreateUserBranchType('Circuit');
        setCreateUserDepartment('CSE');
        loadPortalData();
      } else {
        const errData = await response.json();
        alert(errData.error || 'Failed to create user.');
      }
    } catch (error) {
      console.error(error);
      alert('Error creating user.');
    }
  };

  // Calculate generic aggregate stats for dashboards
  const solvedCount = results.length;
  const avgScore = results.length > 0 
    ? Math.round((results.reduce((acc, curr) => acc + (curr.score / curr.totalQuestions), 0) / results.length) * 100) 
    : 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Header and Branding Navigation Area */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-100 shadow-sm shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden p-1 shadow-sm shrink-0">
              <img
                src="https://tse1.mm.bing.net/th/id/OIP.2izd49JUTf9Yo4-VGpqo_wHaHa?r=0&rs=1&pid=ImgDetMain&o=7&rm=3"
                alt="Government College of Engineering, Erode"
                className="object-contain w-full h-full"
                referrerPolicy="no-referrer"
              />
            </div>
            <div>
              <h1 className="text-base font-extrabold tracking-tight text-slate-900 leading-none">PLA & T</h1>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">Placement & Training Cell</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick action details/contacts */}
            <button 
              onClick={() => setIsContactOpen(true)}
              className="text-slate-600 hover:text-indigo-600 font-bold text-xs px-3 py-1.5 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-1"
            >
              <Contact className="h-4 w-4" /> Contact Officer
            </button>

            {currentUser && (
              <div className="h-6 w-px bg-slate-100"></div>
            )}

            {currentUser ? (
              <div className="flex items-center gap-3">
                <div className="text-right hidden sm:block">
                  <span className="text-xs font-bold text-slate-800 block">{currentUser.name}</span>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-indigo-600 block bg-indigo-50 px-1.5 py-0.5 rounded-full mt-0.5">
                    {currentUser.role}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  className="p-2 text-slate-500 hover:text-red-600 bg-slate-100 hover:bg-red-50 rounded-xl transition-all"
                  title="Logout"
                >
                  <LogOut className="h-4.5 w-4.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse mr-1"></span>
                <span className="text-[10px] text-indigo-600 font-semibold uppercase tracking-wider">Join Portal</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Container Area */}
      <main className="flex-1 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl w-full mx-auto">
        
        {/* VIEW 1: LANDING & LOGIN PAGE (When not logged in) */}
        {!currentUser && (
          <>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center py-4">
            
            {/* Left Column: Drive Statistics & Placement Information */}
            <div className="lg:col-span-7 space-y-8 flex flex-col items-center justify-center text-center">
              <div className="space-y-4 flex flex-col items-center">
                {/* College logo centered */}
                <div className="relative w-36 h-36 sm:w-44 sm:h-44 rounded-2xl bg-slate-50 border border-slate-100/80 flex items-center justify-center overflow-hidden p-3 shadow-inner">
                  <img
                    src="https://tse1.mm.bing.net/th/id/OIP.2izd49JUTf9Yo4-VGpqo_wHaHa?r=0&rs=1&pid=ImgDetMain&o=7&rm=3"
                    alt="Government College of Engineering, Erode"
                    className="object-contain w-full h-full"
                    referrerPolicy="no-referrer"
                  />
                </div>
                
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight leading-tight pt-2">
                  Government College of Engineering, Erode
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 max-w-lg leading-relaxed">
                  Welcome to the Placement and Training Cell. Prepare for high-yield technical, aptitude, logical, and verbal assessments powered by AI (Gemini or Hugging Face), connect with expert mentors, and apply for active recruitment drives.
                </p>
              </div>

              {/* Dynamic Upcoming Campus Recruits Promo */}
              {placementDrives.length > 0 && (
                <div className="space-y-3 pt-2 w-full max-w-lg animate-in fade-in duration-300">
                  <div className="flex items-center gap-2 justify-center">
                    <Building className="h-4 w-4 text-indigo-600" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Upcoming Campus Recruits</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {placementDrives.slice(0, 2).map((drive) => (
                      <div key={drive.id} className="p-3.5 bg-indigo-50/50 border border-indigo-100/40 rounded-xl space-y-1 text-left hover:bg-indigo-50/80 transition-all">
                        <div className="flex justify-between items-start gap-1">
                          <span className="font-bold text-slate-800 text-xs line-clamp-1">{drive.company}</span>
                          <span className="text-[10px] text-indigo-600 font-bold shrink-0">{drive.salaryPackage}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 line-clamp-2">
                          {drive.role} • {drive.eligibility.split('.')[0]}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Portal Login/Registration Form Card */}
            <div className="lg:col-span-5 bg-white border border-slate-100 rounded-3xl p-6 shadow-xl space-y-6">
              
              {/* Login/Register Tabs Switch */}
              <div className="flex border-b border-slate-100 pb-2 gap-4">
                <button
                  onClick={() => {
                    setAuthMode('login');
                    setAuthError(null);
                  }}
                  className={`flex-1 pb-2 text-sm font-bold border-b-2 transition-all ${
                    authMode === 'login'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Account Login
                </button>
                <button
                  onClick={() => {
                    setAuthMode('register');
                    setAuthError(null);
                  }}
                  className={`flex-1 pb-2 text-sm font-bold border-b-2 transition-all ${
                    authMode === 'register'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  Register Profile
                </button>
              </div>

              {/* Login Mode Content */}
              {authMode === 'login' ? (
                <form onSubmit={handleLogin} className="space-y-4">
                  {authError && (
                    <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-700">
                      {authError}
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700">Account Username</label>
                    <input
                      type="text"
                      required
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="e.g., student or admin"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700">Password</label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="password"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-indigo-500/10 flex items-center justify-center gap-1"
                  >
                    <LogIn className="h-4 w-4" /> Secure Sign In
                  </button>
                </form>
              ) : (
                <form onSubmit={handleRegister} className="space-y-4">
                  {authError && (
                    <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-xs text-red-700">
                      {authError}
                    </div>
                  )}

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700">Your Full Name</label>
                    <input
                      type="text"
                      required
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="Alex Carter"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-700">University Email</label>
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="alex.carter@student.edu"
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-slate-700">Choose Username</label>
                      <input
                        type="text"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="alex123"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-slate-700">Set Password</label>
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-slate-700">Branch Type</label>
                      <select
                        value={regBranchType}
                        onChange={(e) => setRegBranchType(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs bg-white"
                      >
                        <option value="Circuit">Circuit Branch</option>
                        <option value="Core">Core Branch</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-slate-700">Department</label>
                      <select
                        value={regDepartment}
                        onChange={(e) => setRegDepartment(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs bg-white"
                      >
                        <option value="CSE">CSE</option>
                        <option value="IT">IT</option>
                        <option value="ECE">ECE</option>
                        <option value="EEE">EEE</option>
                        <option value="CSDS">CSDS</option>
                        <option value="MECH">MECH</option>
                        <option value="AUTO">AUTO</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-indigo-500/10 flex items-center justify-center gap-1"
                  >
                    <UserPlus className="h-4 w-4" /> Create Student Profile
                  </button>
                </form>
              )}
            </div>
          </div>

          {/* About Us Section for GCE Erode Placement & Training Cell */}
          <div id="about-us-container" className="mt-12 bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 shadow-md space-y-8 animate-in fade-in duration-300">
            <div id="about-us-header" className="text-center space-y-2 max-w-2xl mx-auto">
              <span id="about-us-tag" className="bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full border border-indigo-100">
                About the Institution & Cell
              </span>
              <h3 id="about-us-title" className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                Placement & Training Cell — GCE Erode
              </h3>
              <p id="about-us-description" className="text-xs sm:text-sm text-slate-500 leading-relaxed">
                Empowering future engineers with high-standard technical expertise, cognitive aptitude, and continuous training under state-government guidance.
              </p>
            </div>

            {/* Three-Column Bento/Grid Layout */}
            <div id="about-us-features-grid" className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Card 1: Our Vision */}
              <div id="about-vision-card" className="p-5 bg-slate-50/50 border border-slate-100 rounded-2xl space-y-3 hover:border-indigo-100 transition-all group">
                <div id="about-vision-icon-wrapper" className="w-10 h-10 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 group-hover:scale-105 transition-transform">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <h4 id="about-vision-heading" className="font-bold text-slate-800 text-sm">Vision & Guidance</h4>
                <p id="about-vision-text" className="text-xs text-slate-500 leading-relaxed">
                  Under the direct governance of the Government of Tamil Nadu, GCE Erode (formerly IRTT) aims to transform engineering students into qualified industry experts with high ethical standards.
                </p>
              </div>

              {/* Card 2: Training Pillars */}
              <div id="about-training-card" className="p-5 bg-slate-50/50 border border-slate-100 rounded-2xl space-y-3 hover:border-indigo-100 transition-all group">
                <div id="about-training-icon-wrapper" className="w-10 h-10 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 group-hover:scale-105 transition-transform">
                  <BookOpen className="h-5 w-5" />
                </div>
                <h4 id="about-training-heading" className="font-bold text-slate-800 text-sm">Preparation & AI Assessments</h4>
                <p id="about-training-text" className="text-xs text-slate-500 leading-relaxed">
                  Our mock testing suite offers deep analytical preparation in core areas: quantitative skills, logical reasoning, programming proficiency, and verbal abilities, equipped with intelligent evaluation frameworks.
                </p>
              </div>

              {/* Card 3: Industry Collaboration */}
              <div id="about-industry-card" className="p-5 bg-slate-50/50 border border-slate-100 rounded-2xl space-y-3 hover:border-indigo-100 transition-all group">
                <div id="about-industry-icon-wrapper" className="w-10 h-10 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center text-indigo-600 group-hover:scale-105 transition-transform">
                  <Award className="h-5 w-5" />
                </div>
                <h4 id="about-industry-heading" className="font-bold text-slate-800 text-sm">Placement Milestones</h4>
                <p id="about-industry-text" className="text-xs text-slate-500 leading-relaxed">
                  Bridging elite tech recruiters, public-sector undertakings, and core manufacturing giants with young minds. We maintain continuous industry collaboration with top-tier technical recruiters.
                </p>
              </div>

            </div>

            {/* Training Highlights & Quick Contacts */}
            <div id="about-us-info-split" className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-4 border-t border-slate-100">
              <div id="about-cell-info" className="space-y-3">
                <h4 id="about-info-title" className="font-bold text-slate-800 text-xs uppercase tracking-wider text-indigo-600">Cell Activities & Highlights</h4>
                <ul id="about-info-list" className="space-y-2 text-xs text-slate-500">
                  <li id="about-list-item-1" className="flex items-start gap-2">
                    <span className="text-indigo-600 font-extrabold select-none">•</span>
                    <span>Conducting structured mock tests, technical code reviews, and communication workshops.</span>
                  </li>
                  <li id="about-list-item-2" className="flex items-start gap-2">
                    <span className="text-indigo-600 font-extrabold select-none">•</span>
                    <span>Facilitating on-campus & off-campus drives for leading organizations like TCS, CTS, Wipro, and Soliton.</span>
                  </li>
                  <li id="about-list-item-3" className="flex items-start gap-2">
                    <span className="text-indigo-600 font-extrabold select-none">•</span>
                    <span>Mentoring students with personalized analytical progress reports, interview drills, and resume builders.</span>
                  </li>
                </ul>
              </div>

              <div id="about-contact-info" className="space-y-3 bg-indigo-50/20 border border-indigo-100/30 rounded-2xl p-4">
                <div id="about-contact-header">
                  <h4 id="about-contact-title" className="font-bold text-slate-800 text-xs uppercase tracking-wider text-indigo-600">Contact the Office</h4>
                  <p id="about-contact-description" className="text-[11px] text-slate-500 leading-relaxed">
                    For placement inquiries, recruitment coordinate queries, or training feedback, reach out to the GCE Erode Placement Officer.
                  </p>
                </div>
                <div id="about-contact-details" className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-[11px] text-slate-600 font-medium">
                  <div id="contact-email" className="flex items-center gap-2">
                    <Mail className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                    <span className="truncate">placement@gceerode.ac.in</span>
                  </div>
                  <div id="contact-location" className="flex items-center gap-2">
                    <Building className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
                    <span className="truncate">Erode, Tamil Nadu, PIN-638316</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
          </>
        )}

        {/* ACTIVE MOCK TEST VIEW (View 4: Fullscreen Overlay Replacement) */}
        {currentUser && activeTest && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="mb-6 flex items-center gap-2">
              <button
                onClick={() => setActiveTest(null)}
                className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-500 hover:text-slate-700 transition-colors"
                title="Leave Exam"
              >
                <ChevronRight className="h-5 w-5 rotate-180" />
              </button>
              <span className="text-xs text-slate-400 font-medium">Leave & Back to Dashboard</span>
            </div>

            <TakeTest
              test={activeTest}
              user={currentUser}
              onCompleted={() => loadPortalData()}
              onClose={() => setActiveTest(null)}
            />
          </div>
        )}

        {/* VIEW 2: STUDENT DASHBOARD */}
        {currentUser && currentUser.role === 'student' && currentUser.approved !== false && !activeTest && (
          <div className="space-y-6 animate-in fade-in duration-300">
            
            {/* Greeting Banner */}
            <div className="p-6 bg-white border border-slate-100 rounded-2xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-xl font-bold text-slate-900">Welcome back, {currentUser.name}!</h3>
                  {(currentUser.branchType || currentUser.department) && (
                    <span className="bg-indigo-50 text-indigo-700 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full border border-indigo-100">
                      {currentUser.branchType} • {currentUser.department}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">Ready to practice mock placement assessments today? Try our AI-generated drills.</p>
              </div>
              
              {/* Mini Stats widget */}
              <div className="flex items-center gap-6 shrink-0 bg-slate-50 px-5 py-3 rounded-xl border border-slate-100">
                <div className="text-center">
                  <span className="text-lg font-black text-indigo-600 block">{solvedCount}</span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Tests Taken</span>
                </div>
                <div className="h-6 w-px bg-slate-200"></div>
                <div className="text-center">
                  <span className="text-lg font-black text-green-600 block">{avgScore}%</span>
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Avg Accuracy</span>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-slate-200 gap-6">
              <button
                onClick={() => {
                  setActiveTab('tests');
                  setActiveResource(null);
                }}
                className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${
                  activeTab === 'tests'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                <FileCheck2 className="h-4 w-4" /> Active Mock Exams
              </button>
              <button
                onClick={() => {
                  setActiveTab('history');
                  setActiveResource(null);
                }}
                className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${
                  activeTab === 'history'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                <Trophy className="h-4 w-4" /> My Gradebook ({results.length})
              </button>
              <button
                onClick={() => {
                  setActiveTab('coach');
                  setActiveResource(null);
                }}
                className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${
                  activeTab === 'coach'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                <Sparkles className="h-4 w-4 text-amber-500 animate-pulse" /> Placement AI Coach
              </button>
              <button
                onClick={() => {
                  setActiveTab('resources');
                  setActiveResource(null);
                }}
                className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${
                  activeTab === 'resources'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                <BookOpen className="h-4 w-4" /> Preparation Hub
              </button>
            </div>

            {/* TAB CONTENT: Tests */}
            {activeTab === 'tests' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {tests.map((test) => {
                  const alreadyTaken = results.some((r) => r.testId === test.id);
                  return (
                    <div key={test.id} className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm flex flex-col justify-between hover:border-slate-200 transition-all space-y-4">
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[9px] font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full uppercase tracking-wider">
                            {test.category}
                          </span>
                          {alreadyTaken && (
                            <span className="text-[10px] text-green-600 font-bold bg-green-50 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                              ✓ Taken
                            </span>
                          )}
                        </div>
                        <h4 className="font-bold text-slate-800 text-sm">{test.title}</h4>
                        <p className="text-xs text-slate-500 leading-relaxed">{test.description}</p>
                      </div>

                      <div className="pt-3 border-t border-slate-50 flex items-center justify-between text-xs text-slate-400">
                        <div className="flex items-center gap-4 text-[11px]">
                          <span className="flex items-center gap-1"><ListOrdered className="h-3.5 w-3.5" /> {test.questions.length} Questions</span>
                          <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {test.duration} mins</span>
                          <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> {new Date(test.createdAt).toLocaleDateString()}</span>
                        </div>
                        <button
                          onClick={() => setActiveTest(test)}
                          className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            alreadyTaken 
                              ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' 
                              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm'
                          }`}
                        >
                          {alreadyTaken ? 'Retake Drill' : 'Start Exam'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* TAB CONTENT: History / Marks List */}
            {activeTab === 'history' && (
              <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                {results.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 space-y-2">
                    <Trophy className="h-10 w-10 text-slate-300 mx-auto" />
                    <p className="font-semibold text-sm">No tests completed yet.</p>
                    <p className="text-xs">Take an active mock exam on the active drills tab to log your first score!</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold">
                          <th className="p-4">Mock Exam Title</th>
                          <th className="p-4">Category</th>
                          <th className="p-4">Score / Total</th>
                          <th className="p-4">Accuracy %</th>
                          <th className="p-4">Submission Date</th>
                          <th className="p-4 text-right">Review Answers</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {results.map((res) => {
                          const scorePercentage = Math.round((res.score / res.totalQuestions) * 100);
                          return (
                            <tr key={res.id} className="hover:bg-slate-50/50 transition-all">
                              <td className="p-4 font-semibold text-slate-800">{res.testTitle}</td>
                              <td className="p-4">
                                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[10px] font-medium uppercase">
                                  {res.category}
                                </span>
                              </td>
                              <td className="p-4 font-bold">{res.score} / {res.totalQuestions}</td>
                              <td className="p-4">
                                <span className={`font-bold ${scorePercentage >= 60 ? 'text-green-600' : 'text-amber-600'}`}>
                                  {scorePercentage}%
                                </span>
                              </td>
                              <td className="p-4 text-slate-400">{new Date(res.submittedAt).toLocaleDateString()}</td>
                              <td className="p-4 text-right">
                                <button
                                  onClick={() => {
                                    // Let students review the questions & answers by looking up the completed test
                                    const associatedTest = tests.find((t) => t.id === res.testId);
                                    if (associatedTest) {
                                      setActiveTest(associatedTest);
                                    } else {
                                      alert("Error loading test content for review. Try retaking it!");
                                    }
                                  }}
                                  className="text-indigo-600 hover:text-indigo-800 font-bold hover:underline inline-flex items-center gap-0.5"
                                >
                                  <Eye className="h-3.5 w-3.5" /> Details
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: AI Placement Coach */}
            {activeTab === 'coach' && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                <div className="md:col-span-8">
                  <PlacementCoach />
                </div>
                
                <div className="md:col-span-4 p-5 bg-indigo-50/30 border border-indigo-100/40 rounded-2xl space-y-4 text-xs">
                  <div className="flex items-center gap-2 text-indigo-700">
                    <Sparkles className="h-5 w-5" />
                    <span className="font-bold">Career Counsel Advice</span>
                  </div>
                  <p className="text-slate-600 leading-relaxed">
                    Ask the Career Coach questions like:
                  </p>
                  <ul className="space-y-2 text-slate-500 list-disc list-inside">
                    <li>"What is the salary range of top tech startups?"</li>
                    <li>"How should I solve binary tree traversal in an interview?"</li>
                    <li>"Tips to write high-impact resume bullets"</li>
                  </ul>
                  <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400">
                    Your queries are processed using your chosen AI model (Gemini or Hugging Face) for career counsel, formatting tips, and aptitude calculations advice.
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: Preparation Course Resources */}
            {activeTab === 'resources' && (
              <div className="space-y-6">
                {activeResource ? (
                  <div className="p-6 bg-white border border-slate-100 rounded-2xl shadow-sm space-y-4 animate-in fade-in duration-200">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div>
                        <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full uppercase mr-2">{activeResource.category}</span>
                        <span className="text-[10px] text-slate-400 font-medium">{activeResource.readTime} read</span>
                      </div>
                      <button
                        onClick={() => setActiveResource(null)}
                        className="text-xs text-slate-500 hover:text-slate-700 font-bold hover:underline"
                      >
                        Back to Resources
                      </button>
                    </div>
                    <h4 className="font-extrabold text-slate-900 text-lg">{activeResource.title}</h4>
                    <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap bg-slate-50 p-5 rounded-2xl font-sans">
                      {activeResource.content}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {activeResource.tags.map((t, idx) => (
                        <span key={idx} className="bg-slate-100 text-slate-500 px-2.5 py-1 rounded-lg text-[10px] font-medium">#{t}</span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {trainingResources.map((res) => (
                      <div key={res.id} className="p-5 bg-white border border-slate-100 rounded-2xl shadow-sm hover:border-slate-200 transition-all flex flex-col justify-between space-y-4">
                        <div className="space-y-1.5">
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="font-bold text-indigo-600 uppercase bg-indigo-50 px-2 py-0.5 rounded">{res.category}</span>
                            <span className="text-slate-400 font-medium">{res.readTime} read</span>
                          </div>
                          <h5 className="font-bold text-slate-800 text-sm leading-snug">{res.title}</h5>
                          <p className="text-xs text-slate-400 line-clamp-2">{res.content}</p>
                        </div>

                        <div className="pt-3 border-t border-slate-50 flex items-center justify-between">
                          <div className="flex gap-1">
                            {res.tags.slice(0, 2).map((t, idx) => (
                              <span key={idx} className="bg-slate-50 text-slate-500 px-1.5 py-0.5 rounded text-[9px]">#{t}</span>
                            ))}
                          </div>
                          <button
                            onClick={() => setActiveResource(res)}
                            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5"
                          >
                            Read Study <ChevronRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* PENDING APPROVAL VIEW FOR STUDENTS */}
        {currentUser && currentUser.role === 'student' && currentUser.approved === false && !activeTest && (
          <div className="max-w-md mx-auto bg-white border border-slate-100 rounded-3xl p-8 shadow-xl text-center space-y-6 animate-in fade-in duration-300 my-8">
            <div className="w-16 h-16 bg-amber-50 border border-amber-100 rounded-2xl flex items-center justify-center mx-auto text-amber-500">
              <ShieldAlert className="h-8 w-8 animate-pulse" />
            </div>
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-slate-900">Account Pending Approval</h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Hello <strong className="text-slate-800">{currentUser.name}</strong>, your student profile has been registered successfully.
                To access study assessments, mentor resources, and placement tools, your account must be verified and approved by the Placement and Training Cell.
              </p>
            </div>
            
            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-left space-y-1.5 text-xs">
              <p className="font-bold text-slate-700 uppercase tracking-wider text-[9px]">Registration Details:</p>
              <div className="flex justify-between border-b border-slate-100/50 pb-1">
                <span className="text-slate-400">Username</span>
                <span className="font-semibold text-slate-700">{currentUser.username}</span>
              </div>
              <div className="flex justify-between border-b border-slate-100/50 pb-1">
                <span className="text-slate-400">Email</span>
                <span className="font-semibold text-slate-700">{currentUser.email}</span>
              </div>
              <div className="flex justify-between pt-0.5">
                <span className="text-slate-400">Approval Status</span>
                <span className="font-extrabold text-amber-600 bg-amber-50 px-2 py-0.5 rounded text-[10px]">Pending Review</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={async () => {
                  try {
                    const res = await fetch(`/api/auth/status/${currentUser.id}`);
                    if (res.ok) {
                      const data = await res.json();
                      setCurrentUser(data.user);
                      if (data.user.approved !== false) {
                        alert('Congratulations! Your account has been approved.');
                      } else {
                        alert('Account is still pending approval. Please check back later.');
                      }
                    }
                  } catch (err) {
                    console.error(err);
                  }
                }}
                className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-indigo-500/10 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="h-4 w-4" /> Check Status
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer"
              >
                Sign Out
              </button>
            </div>
          </div>
        )}

        {/* VIEW 3: ADMIN DASHBOARD */}
        {currentUser && (currentUser.role === 'admin' || currentUser.role === 'faculty') && !activeTest && (
          <div className="space-y-6 animate-in fade-in duration-300">
            
            {/* Admin Greeting Banner */}
            <div className="p-6 bg-slate-900 border border-slate-850 rounded-2xl shadow-sm text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold uppercase tracking-wider mb-1">
                  <Shield className="h-4 w-4" /> {currentUser.role === 'admin' ? 'Admin' : 'Faculty'} panel Poom ,Government college of engineering erode,
                </div>
                <h3 className="text-xl font-bold font-sans">{currentUser.role === 'admin' ? 'Admin' : 'Faculty'} : {currentUser.name === 'Dr. Sarah Jenkins' ? 'Admin' : currentUser.name}</h3>
                <p className="text-xs text-slate-400 mt-1">Review student scores, launch upcoming company placement drives, or generate mock exams with AI.</p>
              </div>
            </div>

            {/* Admin Navigation Tabs */}
            <div className="flex border-b border-slate-200 gap-6">
              <button
                onClick={() => setActiveTab('ai-generator')}
                className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${
                  activeTab === 'ai-generator'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                <Sparkles className="h-4 w-4 text-indigo-600 animate-pulse" /> AI Test Generator
              </button>
              <button
                onClick={() => setActiveTab('manual-test')}
                className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${
                  activeTab === 'manual-test'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                <Plus className="h-4 w-4" /> Create Test Manually
              </button>
              <button
                onClick={() => setActiveTab('active-tests')}
                className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${
                  activeTab === 'active-tests'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                <ListOrdered className="h-4 w-4" /> Active Tests
                {tests.length > 0 && (
                  <span className="bg-indigo-100 text-indigo-700 text-[10px] font-extrabold px-2 py-0.5 rounded-full shrink-0">
                    {tests.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('gradebook')}
                className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${
                  activeTab === 'gradebook'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                <Trophy className="h-4 w-4" /> Student Gradebook
              </button>
              <button
                onClick={() => setActiveTab('manage-drives')}
                className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${
                  activeTab === 'manage-drives'
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                <Building className="h-4 w-4" /> Manage Placement Drives
              </button>
              {(currentUser.role === 'admin' || currentUser.role === 'faculty') && (
                <button
                  onClick={() => setActiveTab('approvals')}
                  className={`pb-3 text-xs font-bold uppercase tracking-wider border-b-2 transition-all flex items-center gap-1.5 ${
                    activeTab === 'approvals'
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                  }`}
                >
                  <Users className="h-4 w-4" /> User Management
                  {allStudents.filter(s => s.approved === false).length > 0 && (
                    <span className="bg-amber-500 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full shrink-0">
                      {allStudents.filter(s => s.approved === false).length}
                    </span>
                  )}
                </button>
              )}
            </div>

            {/* TAB CONTENT: AI Test Generator */}
            {activeTab === 'ai-generator' && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                <div className="md:col-span-8">
                  <AiTestGenerator onTestCreated={() => loadPortalData()} />
                </div>
                <div className="md:col-span-4 p-5 bg-white border border-slate-100 rounded-2xl space-y-4 text-xs shadow-sm">
                  <h5 className="font-bold text-slate-800 uppercase tracking-wider">How AI generation works</h5>
                  <p className="text-slate-500 leading-relaxed">
                    By simply inputting a technical, aptitude, logical, or verbal topic, PLA & T passes a system prompt to your selected AI model (Gemini or Hugging Face) to structure a multi-choice exam complete with 4 distractor choices and verified scoring keys.
                  </p>
                  <p className="text-slate-500 leading-relaxed font-bold">
                    Currently published tests: {tests.length}
                  </p>
                </div>
              </div>
            )}

            {/* TAB CONTENT: Create Test Manually */}
            {activeTab === 'manual-test' && (
              <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 max-w-3xl mx-auto space-y-6">
                <h4 className="font-bold text-slate-800 text-sm pb-2 border-b border-slate-100">Draft Custom Assessment</h4>

                {adminMessage && (
                  <div className={`p-3 text-xs rounded-xl ${
                    adminMessage.startsWith('Success') ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'
                  }`}>
                    {adminMessage}
                  </div>
                )}

                <form onSubmit={handleSaveManualTest} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-slate-700">Test Title</label>
                      <input
                        type="text"
                        required
                        value={newTestTitle}
                        onChange={(e) => setNewTestTitle(e.target.value)}
                        placeholder="e.g., Python Lists & Loops"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-slate-700">Assessment Category</label>
                      <select
                        value={newTestCategory}
                        onChange={(e) => setNewTestCategory(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs"
                      >
                        <option value="Technical">Technical</option>
                        <option value="Aptitude">Aptitude</option>
                        <option value="Verbal">Verbal</option>
                        <option value="Logical">Logical</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-slate-700">Test Description</label>
                      <input
                        type="text"
                        value={newTestDesc}
                        onChange={(e) => setNewTestDesc(e.target.value)}
                        placeholder="Topics, general formulas covered..."
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-semibold text-slate-700">Duration in Minutes</label>
                      <input
                        type="number"
                        required
                        min="5"
                        max="120"
                        value={newTestDuration}
                        onChange={(e) => setNewTestDuration(parseInt(e.target.value) || 15)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-xs"
                      />
                    </div>
                  </div>

                  {/* Dynamic Questions Builder */}
                  <div className="space-y-4 pt-4 border-t border-slate-100">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Dynamic MCQ Builder</span>
                      <button
                        type="button"
                        onClick={addQuestionBlock}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1"
                      >
                        <Plus className="h-4 w-4" /> Add Question
                      </button>
                    </div>

                    {manualQuestions.map((q, qIdx) => (
                      <div key={qIdx} className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-3 relative">
                        {manualQuestions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeQuestionBlock(qIdx)}
                            className="absolute top-2 right-2 text-xs text-red-500 hover:text-red-700 font-bold hover:underline"
                          >
                            Remove
                          </button>
                        )}

                        <div className="space-y-1 text-xs">
                          <label className="block font-bold text-slate-700">Question {qIdx + 1}</label>
                          <input
                            type="text"
                            required
                            value={q.question}
                            onChange={(e) => updateQuestionField(qIdx, 'question', e.target.value)}
                            placeholder="What is the result of 2 + 2 in base 3?"
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-xs"
                          />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                          {q.options.map((opt, oIdx) => (
                            <div key={oIdx} className="space-y-1">
                              <label className="block font-medium text-slate-500">Option {String.fromCharCode(65 + oIdx)}</label>
                              <input
                                type="text"
                                required
                                value={opt}
                                onChange={(e) => updateOptionField(qIdx, oIdx, e.target.value)}
                                className="w-full px-3 py-1.5 border border-slate-200 rounded-lg bg-white text-xs"
                              />
                            </div>
                          ))}
                        </div>

                        <div className="space-y-1 text-xs max-w-xs">
                          <label className="block font-bold text-slate-700">Correct Answer Index</label>
                          <select
                            value={q.correctAnswer}
                            onChange={(e) => updateQuestionField(qIdx, 'correctAnswer', parseInt(e.target.value))}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg bg-white text-xs"
                          >
                            <option value="0">Option A</option>
                            <option value="1">Option B</option>
                            <option value="2">Option C</option>
                            <option value="3">Option D</option>
                          </select>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-colors shadow-md shadow-indigo-500/10"
                  >
                    Publish Assessment
                  </button>
                </form>
              </div>
            )}

            {/* TAB CONTENT: Active / Currently Conducted Tests */}
            {activeTab === 'active-tests' && (
              <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                {tests.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 space-y-2">
                    <ListOrdered className="h-10 w-10 text-slate-300 mx-auto" />
                    <p className="font-semibold text-sm">No tests are currently published.</p>
                    <p className="text-xs">Create one via AI Test Generator or Manual Test Creator.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold">
                          <th className="p-4">Test Title</th>
                          <th className="p-4">Category</th>
                          <th className="p-4">Duration</th>
                          <th className="p-4">Questions</th>
                          <th className="p-4">Submissions</th>
                          <th className="p-4">Published On</th>
                          <th className="p-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {tests.map((test) => {
                          const submissionCount = results.filter((r) => r.testId === test.id).length;
                          return (
                            <tr key={test.id} className="hover:bg-slate-50/50 transition-all">
                              <td className="p-4 font-bold text-slate-900">{test.title}</td>
                              <td className="p-4">
                                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[10px] font-medium uppercase">
                                  {test.category}
                                </span>
                              </td>
                              <td className="p-4 flex items-center gap-1 text-slate-600">
                                <Clock className="h-3.5 w-3.5" /> {test.duration} min
                              </td>
                              <td className="p-4 text-slate-600">{test.questions.length}</td>
                              <td className="p-4">
                                <span className="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg text-[10px] font-extrabold border border-indigo-100">
                                  {submissionCount} submitted
                                </span>
                              </td>
                              <td className="p-4 text-slate-400">{new Date(test.createdAt).toLocaleString()}</td>
                              <td className="p-4">
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => setViewingTest(test)}
                                    className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold rounded-lg border border-indigo-100 transition-all inline-flex items-center gap-1 cursor-pointer"
                                    title="View test with correct answers"
                                  >
                                    <Eye className="h-3.5 w-3.5" /> View
                                  </button>
                                  <button
                                    onClick={() => handleDeleteTest(test.id, test.title)}
                                    className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-lg border border-red-100 transition-all inline-flex items-center gap-1 cursor-pointer"
                                    title="Delete this test"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" /> Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: Admin Gradebook Reports */}
            {activeTab === 'gradebook' && (() => {
              const filteredResults = results.filter((res) => {
                if (filterDepartment === 'All') return true;
                const student = allStudents.find((s) => s.id === res.userId);
                const studentDept = student?.department || 'N/A';
                return studentDept.toLowerCase() === filterDepartment.toLowerCase();
              });

              return (
                <div className="space-y-4">
                  <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-700">Filter by Department:</span>
                      <select
                        value={filterDepartment}
                        onChange={(e) => setFilterDepartment(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
                      >
                        <option value="All">All Departments</option>
                        <option value="CSE">CSE</option>
                        <option value="IT">IT</option>
                        <option value="ECE">ECE</option>
                        <option value="EEE">EEE</option>
                        <option value="CSDS">CSDS</option>
                        <option value="MECH">MECH</option>
                        <option value="AUTO">AUTO</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const headers = ['Student Name', 'Username', 'Department', 'Mock Exam', 'Category', 'Score', 'Total Questions', 'Accuracy %', 'Submitted At'];
                          const rows = filteredResults.map(res => {
                            const student = allStudents.find((s) => s.id === res.userId);
                            const dept = student?.department || 'N/A';
                            const accuracy = Math.round((res.score / res.totalQuestions) * 100);
                            return [
                              `"${res.studentName.replace(/"/g, '""')}"`,
                              `"${res.username.replace(/"/g, '""')}"`,
                              `"${dept.replace(/"/g, '""')}"`,
                              `"${res.testTitle.replace(/"/g, '""')}"`,
                              `"${res.category.replace(/"/g, '""')}"`,
                              res.score,
                              res.totalQuestions,
                              `${accuracy}%`,
                              new Date(res.submittedAt).toLocaleString()
                            ];
                          });
                          const csvContent = "data:text/csv;charset=utf-8," 
                            + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
                          const encodedUri = encodeURI(csvContent);
                          const link = document.createElement("a");
                          link.setAttribute("href", encodedUri);
                          link.setAttribute("download", `student_gradebook_${filterDepartment}.csv`);
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}
                        className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl border border-indigo-100 transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <FileText className="h-3.5 w-3.5" /> Download CSV
                      </button>
                      <button
                        onClick={() => setPrintPreviewType('gradebook')}
                        className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold rounded-xl border border-slate-200 transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5" /> Print Preview
                      </button>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                    {filteredResults.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 space-y-2">
                        <Trophy className="h-10 w-10 text-slate-300 mx-auto" />
                        <p className="font-semibold text-sm">No matching submissions logged yet.</p>
                        <p className="text-xs">Adjust your department filter or wait for submissions.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-bold">
                              <th className="p-4">Student Name</th>
                              <th className="p-4">Username</th>
                              <th className="p-4">Department</th>
                              <th className="p-4">Mock Exam</th>
                              <th className="p-4">Category</th>
                              <th className="p-4">Score</th>
                              <th className="p-4">Accuracy</th>
                              <th className="p-4">Submission Timestamp</th>
                              <th className="p-4 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {filteredResults.map((res) => {
                              const scorePercentage = Math.round((res.score / res.totalQuestions) * 100);
                              const student = allStudents.find((s) => s.id === res.userId);
                              const dept = student?.department || 'N/A';
                              return (
                                <tr key={res.id} className="hover:bg-slate-50/50 transition-all">
                                  <td className="p-4 font-bold text-slate-900">{res.studentName}</td>
                                  <td className="p-4 text-slate-500">{res.username}</td>
                                  <td className="p-4">
                                    <span className="bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase border border-indigo-100">
                                      {dept}
                                    </span>
                                  </td>
                                  <td className="p-4 font-semibold">{res.testTitle}</td>
                                  <td className="p-4">
                                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-[10px] font-medium uppercase">
                                      {res.category}
                                    </span>
                                  </td>
                                  <td className="p-4 font-extrabold">{res.score} / {res.totalQuestions}</td>
                                  <td className="p-4">
                                    <span className={`font-bold ${scorePercentage >= 60 ? 'text-green-600' : 'text-amber-600'}`}>
                                      {scorePercentage}%
                                    </span>
                                  </td>
                                  <td className="p-4 text-slate-400">{new Date(res.submittedAt).toLocaleString()}</td>
                                  <td className="p-4 text-right">
                                    <button
                                      onClick={() => handleDeleteResult(res.id)}
                                      className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-lg border border-red-100 transition-all inline-flex items-center gap-1 cursor-pointer"
                                      title="Delete this result"
                                    >
                                      <X className="h-3.5 w-3.5" /> Delete
                                    </button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* TAB CONTENT: Manage Placement Drives */}
            {activeTab === 'manage-drives' && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
                
                {/* Form to create drive */}
                <div className="md:col-span-5 bg-white border border-slate-100 rounded-2xl shadow-sm p-5 space-y-4 animate-in fade-in duration-200">
                  <h5 className="font-bold text-slate-800 text-sm">
                    {editingDriveId ? 'Modify Recruitment Drive' : 'Publish New Recruitment Drive'}
                  </h5>
                  
                  <form onSubmit={handleSaveDrive} className="space-y-4 text-xs">
                    <div className="space-y-1">
                      <label className="block font-semibold text-slate-700">Company Name</label>
                      <input
                        type="text"
                        required
                        value={newCompany}
                        onChange={(e) => setNewCompany(e.target.value)}
                        placeholder="Google, Stripe, Adobe..."
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block font-semibold text-slate-700">Job Role / Designation</label>
                      <input
                        type="text"
                        required
                        value={newRole}
                        onChange={(e) => setNewRole(e.target.value)}
                        placeholder="Associate Software Engineer, Analyst Intern..."
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="block font-semibold text-slate-700">Salary Package</label>
                        <input
                          type="text"
                          required
                          value={newSalary}
                          onChange={(e) => setNewSalary(e.target.value)}
                          placeholder="e.g. $85,000 / Year"
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block font-semibold text-slate-700">Deadline Date</label>
                        <input
                          type="text"
                          required
                          value={newDeadline}
                          onChange={(e) => setNewDeadline(e.target.value)}
                          placeholder="July 25, 2026"
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="block font-semibold text-slate-700">Eligibility Criteria</label>
                      <input
                        type="text"
                        required
                        value={newEligibility}
                        onChange={(e) => setNewEligibility(e.target.value)}
                        placeholder="B.Tech, MCA with CGPA >= 7.5..."
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block font-semibold text-slate-700">Drive Status</label>
                      <select
                        value={newDriveStatus}
                        onChange={(e) => setNewDriveStatus(e.target.value as any)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                      >
                        <option value="Open">Open (Applications Active)</option>
                        <option value="Upcoming">Upcoming (Coming Soon)</option>
                      </select>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        type="submit"
                        className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-all text-xs shadow-md shadow-indigo-500/10"
                      >
                        {editingDriveId ? 'Update Drive Details' : 'Publish Drive Details'}
                      </button>
                      {editingDriveId && (
                        <button
                          type="button"
                          onClick={handleCancelEditDrive}
                          className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg transition-all text-xs"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>
                </div>

                {/* Display drives list */}
                <div className="md:col-span-7 bg-white border border-slate-100 rounded-2xl shadow-sm p-5 space-y-4">
                  <h5 className="font-bold text-slate-800 text-sm">Active & Upcoming Campus Recruitment Drives</h5>
                  <div className="space-y-3">
                    {placementDrives.map((drive) => (
                      <div key={drive.id} className="p-4 border border-slate-100 rounded-xl flex items-start justify-between gap-4 bg-slate-50/40 hover:border-slate-200 transition-all">
                        <div className="space-y-1.5 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-slate-800 text-sm truncate">{drive.company}</span>
                            <span className={`px-2 py-0.5 text-[9px] font-bold rounded-full shrink-0 ${
                              drive.status === 'Open' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                            }`}>{drive.status}</span>
                          </div>
                          <p className="text-xs font-semibold text-slate-600 truncate">{drive.role}</p>
                          <p className="text-[11px] text-slate-500 leading-relaxed">
                            <strong>Eligibility:</strong> {drive.eligibility}
                          </p>
                        </div>
                        <div className="flex flex-col items-end justify-between h-full gap-4 shrink-0 text-right">
                          <div className="text-right text-xs">
                            <span className="font-extrabold text-indigo-600 block">{drive.salaryPackage}</span>
                            <span className="text-[10px] text-slate-400 block mt-0.5">Deadline: {drive.date}</span>
                          </div>
                          <div className="flex gap-1.5 pt-1">
                            <button
                              onClick={() => handleStartEditDrive(drive)}
                              className="px-2 py-1 bg-white border border-slate-200 hover:border-indigo-200 text-slate-600 hover:text-indigo-600 rounded-lg text-[10px] font-bold transition-all"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteDrive(drive.id)}
                              className="px-2 py-1 bg-white border border-slate-200 hover:border-red-200 text-slate-600 hover:text-red-600 rounded-lg text-[10px] font-bold transition-all"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}

            {/* TAB CONTENT: Manage Student Approvals & User Roles */}
            {activeTab === 'approvals' && (currentUser.role === 'admin' || currentUser.role === 'faculty') && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-100">
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-lg">User Management & Approvals</h4>
                    <p className="text-xs text-slate-500">Authorize pending registrations, delete accounts, or change user privileges between Student and Admin.</p>
                  </div>
                  <div className="flex gap-2 text-xs">
                    <span className="bg-amber-50 text-amber-700 font-bold px-3 py-1.5 rounded-xl border border-amber-100 flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> Pending: {allStudents.filter(s => s.approved === false).length}
                    </span>
                    <span className="bg-green-50 text-green-700 font-bold px-3 py-1.5 rounded-xl border border-green-100 flex items-center gap-1">
                      <FileCheck2 className="h-3.5 w-3.5" /> Active: {allStudents.filter(s => s.approved !== false).length}
                    </span>
                  </div>
                </div>

                {/* Grid with columns */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  
                  {/* Left Column: Create User & Pending Review */}
                  <div className="lg:col-span-5 space-y-6">
                    {/* Create New User Section */}
                    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
                      <h5 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                        <UserPlus className="h-4 w-4 text-indigo-600" />
                        Create New User
                      </h5>
                      <form onSubmit={handleCreateUser} className="space-y-3.5">
                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Full Name</label>
                          <input
                            type="text"
                            required
                            value={createUserName}
                            onChange={(e) => setCreateUserName(e.target.value)}
                            placeholder="e.g., Prof. Arumugam"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Username</label>
                            <input
                              type="text"
                              required
                              value={createUserUsername}
                              onChange={(e) => setCreateUserUsername(e.target.value)}
                              placeholder="username"
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Password</label>
                            <input
                              type="password"
                              required
                              value={createUserPassword}
                              onChange={(e) => setCreateUserPassword(e.target.value)}
                              placeholder="••••••••"
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                            />
                          </div>
                        </div>

                        <div className="space-y-1">
                          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Email Address</label>
                          <input
                            type="email"
                            required
                            value={createUserEmail}
                            onChange={(e) => setCreateUserEmail(e.target.value)}
                            placeholder="name@university.edu"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Branch Type</label>
                            <select
                              value={createUserBranchType}
                              onChange={(e) => setCreateUserBranchType(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                            >
                              <option value="Circuit">Circuit</option>
                              <option value="Core">Core</option>
                            </select>
                          </div>
                          
                          <div className="space-y-1">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Department</label>
                            <select
                              value={createUserDepartment}
                              onChange={(e) => setCreateUserDepartment(e.target.value)}
                              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                            >
                              <option value="CSE">CSE</option>
                              <option value="IT">IT</option>
                              <option value="ECE">ECE</option>
                              <option value="EEE">EEE</option>
                              <option value="CSDS">CSDS</option>
                              <option value="MECH">MECH</option>
                              <option value="AUTO">AUTO</option>
                            </select>
                          </div>
                        </div>

                        {currentUser.role === 'admin' ? (
                          <div className="grid grid-cols-2 gap-3 items-end">
                            <div className="space-y-1">
                              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider">Role</label>
                              <select
                                value={createUserRole}
                                onChange={(e) => setCreateUserRole(e.target.value as 'student' | 'admin' | 'faculty')}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                              >
                                <option value="student">Student</option>
                                <option value="faculty">Faculty</option>
                                <option value="admin">Admin</option>
                              </select>
                            </div>
                            
                            <div className="flex items-center gap-2 h-10 px-1">
                              <input
                                type="checkbox"
                                id="createUserApproved"
                                checked={createUserApproved}
                                onChange={(e) => setCreateUserApproved(e.target.checked)}
                                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20 cursor-pointer"
                              />
                              <label htmlFor="createUserApproved" className="text-xs font-bold text-slate-600 cursor-pointer select-none">
                                Auto-Approve
                              </label>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 h-10 px-1 pt-1 justify-between">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id="createUserApproved"
                                checked={createUserApproved}
                                onChange={(e) => setCreateUserApproved(e.target.checked)}
                                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20 cursor-pointer"
                              />
                              <label htmlFor="createUserApproved" className="text-xs font-bold text-slate-600 cursor-pointer select-none">
                                Auto-Approve Created Account
                              </label>
                            </div>
                            <span className="text-[10px] text-slate-400 italic">Creating Student Account</span>
                          </div>
                        )}

                        <button
                          type="submit"
                          className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all shadow-sm shadow-indigo-600/15 flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <UserPlus className="h-4.5 w-4.5" /> Create New User
                        </button>
                      </form>
                    </div>

                    {/* Pending Registrations */}
                    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <h5 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>
                          Pending Registrations ({allStudents.filter(s => s.approved === false).length})
                        </h5>
                        {allStudents.filter(s => s.approved === false).length > 0 && (
                          <div className="flex gap-2 shrink-0">
                            <button
                              onClick={handleApproveAllPending}
                              className="py-1.5 px-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg text-[10px] transition-all cursor-pointer shadow-sm shadow-green-600/10"
                            >
                              Approve All
                            </button>
                            <button
                              onClick={handleRejectAllPending}
                              className="py-1.5 px-3 bg-white border border-red-200 hover:bg-red-50 text-red-600 font-bold rounded-lg text-[10px] transition-all cursor-pointer"
                            >
                              Reject All
                            </button>
                          </div>
                        )}
                      </div>

                      {allStudents.filter(s => s.approved === false).length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 pb-1">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Filter:</span>
                          <select
                            value={filterPendingRole}
                            onChange={(e) => setFilterPendingRole(e.target.value)}
                            className="bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 font-bold text-slate-600 focus:outline-none text-[11px] cursor-pointer"
                          >
                            <option value="All">All Roles</option>
                            <option value="student">Student</option>
                            <option value="faculty">Faculty</option>
                            <option value="admin">Admin</option>
                          </select>
                          <select
                            value={filterPendingDept}
                            onChange={(e) => setFilterPendingDept(e.target.value)}
                            className="bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 font-bold text-slate-600 focus:outline-none text-[11px] cursor-pointer"
                          >
                            <option value="All">All Departments</option>
                            <option value="CSE">CSE</option>
                            <option value="IT">IT</option>
                            <option value="ECE">ECE</option>
                            <option value="EEE">EEE</option>
                            <option value="CSDS">CSDS</option>
                            <option value="MECH">MECH</option>
                            <option value="AUTO">AUTO</option>
                          </select>
                          {(filterPendingRole !== 'All' || filterPendingDept !== 'All') && (
                            <button
                              onClick={() => { setFilterPendingRole('All'); setFilterPendingDept('All'); }}
                              className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer underline underline-offset-2"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                      )}
                      
                      {allStudents.filter(s => s.approved === false).length === 0 ? (
                        <div className="p-8 text-center border border-dashed border-slate-100 rounded-xl space-y-2">
                          <p className="text-slate-400 text-xs">No pending student approvals at this time.</p>
                          <p className="text-[10px] text-slate-400">New students who register will appear here immediately for authorization.</p>
                        </div>
                      ) : allStudents.filter(s => s.approved === false)
                          .filter(s => filterPendingRole === 'All' || s.role === filterPendingRole)
                          .filter(s => filterPendingDept === 'All' || (s.department || '').toLowerCase() === filterPendingDept.toLowerCase())
                          .length === 0 ? (
                        <div className="p-8 text-center border border-dashed border-slate-100 rounded-xl space-y-2">
                          <p className="text-slate-400 text-xs">No pending registrations match the current filter.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {allStudents.filter(s => s.approved === false)
                            .filter(s => filterPendingRole === 'All' || s.role === filterPendingRole)
                            .filter(s => filterPendingDept === 'All' || (s.department || '').toLowerCase() === filterPendingDept.toLowerCase())
                            .map((student) => (
                            <div key={student.id} className="p-4 border border-slate-100 rounded-xl bg-amber-50/20 hover:bg-amber-50/40 hover:border-amber-100 transition-all space-y-3">
                              <div className="flex justify-between items-start gap-3 text-xs">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <p className="font-extrabold text-slate-800 text-sm truncate">{student.name}</p>
                                    <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${
                                      student.role === 'admin' 
                                        ? 'bg-purple-50 text-purple-700 border border-purple-100' 
                                        : student.role === 'faculty'
                                        ? 'bg-amber-50 text-amber-700 border border-amber-100'
                                        : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                                    }`}>
                                      {student.role === 'admin' ? 'Admin' : student.role === 'faculty' ? 'Faculty' : 'Student'}
                                    </span>
                                  </div>
                                  <p className="text-slate-500 font-medium truncate">
                                    @{student.username} • {student.email}
                                    {student.role === 'student' && (student.branchType || student.department) && (
                                      <span className="ml-1.5 px-1.5 py-0.5 bg-indigo-50 text-indigo-700 font-bold rounded text-[9px] inline-flex items-center">
                                        {student.branchType} • {student.department}
                                      </span>
                                    )}
                                  </p>
                                </div>
                                <span className="text-[9px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full shrink-0">
                                  Pending Review
                                </span>
                              </div>

                              <div className="flex gap-2 pt-1">
                                <button
                                  onClick={() => handleApproveUser(student.id)}
                                  className="flex-1 py-1.5 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg text-[10px] transition-all flex items-center justify-center gap-1 cursor-pointer shadow-sm shadow-green-600/10"
                                >
                                  Approve
                                </button>
                                <button
                                  onClick={() => startEditingUser(student)}
                                  className="py-1.5 px-3 bg-white border border-slate-200 hover:bg-indigo-50 hover:border-indigo-200 text-slate-600 hover:text-indigo-600 font-bold rounded-lg text-[10px] transition-all cursor-pointer"
                                >
                                  Edit Info
                                </button>
                                {(currentUser?.role === 'admin' || student.role === 'student') && (
                                  <button
                                    onClick={() => handleRejectUser(student.id)}
                                    className="py-1.5 px-3 bg-white border border-slate-200 hover:bg-red-50 hover:border-red-200 text-slate-600 hover:text-red-600 font-bold rounded-lg text-[10px] transition-all cursor-pointer"
                                  >
                                    Reject
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column: Authorized Users & Roles */}
                  <div className="lg:col-span-7 space-y-4">
                    <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-50">
                        <h5 className="font-bold text-slate-800 text-sm flex items-center gap-1.5 text-green-700">
                          <span className="h-2 w-2 rounded-full bg-green-500"></span>
                          Authorized Users & Roles ({allStudents.filter(s => s.approved !== false).length})
                        </h5>
                        
                        <div className="flex flex-wrap items-center gap-2 text-xs">
                          <button
                            onClick={() => loadPortalData()}
                            className="p-1 px-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold rounded-lg border border-slate-200 transition-all text-[10px] flex items-center gap-1 cursor-pointer"
                            title="Refresh user list"
                          >
                            <RefreshCw className="h-3 w-3" /> Refresh
                          </button>

                          <select
                            value={filterSectionDept}
                            onChange={(e) => setFilterSectionDept(e.target.value)}
                            className="bg-slate-50 border border-slate-200 rounded-xl px-2 py-1 font-bold text-slate-600 focus:outline-none text-[11px] cursor-pointer"
                          >
                            <option value="All">All Departments</option>
                            <option value="CSE">CSE</option>
                            <option value="IT">IT</option>
                            <option value="ECE">ECE</option>
                            <option value="EEE">EEE</option>
                            <option value="CSDS">CSDS</option>
                            <option value="MECH">MECH</option>
                            <option value="AUTO">AUTO</option>
                          </select>
                          
                          <button
                            onClick={() => {
                              const approvedUsers = allStudents.filter(s => s.approved !== false);
                              const filteredUsers = approvedUsers.filter(student => {
                                if (filterSectionDept === 'All') return true;
                                return (student.department || '').toLowerCase() === filterSectionDept.toLowerCase();
                              });
                              const headers = ['Student Name', 'Username', 'Email', 'Branch Type', 'Department', 'Role'];
                              const rows = filteredUsers.map(student => [
                                `"${student.name.replace(/"/g, '""')}"`,
                                `"${student.username.replace(/"/g, '""')}"`,
                                `"${student.email.replace(/"/g, '""')}"`,
                                `"${(student.branchType || '').replace(/"/g, '""')}"`,
                                `"${(student.department || '').replace(/"/g, '""')}"`,
                                `"${student.role.replace(/"/g, '""')}"`
                              ]);
                              const csvContent = "data:text/csv;charset=utf-8," 
                                + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
                              const encodedUri = encodeURI(csvContent);
                              const link = document.createElement("a");
                              link.setAttribute("href", encodedUri);
                              link.setAttribute("download", `student_section_list_${filterSectionDept}.csv`);
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                            }}
                            className="p-1 px-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg border border-indigo-100 transition-all text-[10px] flex items-center gap-1 cursor-pointer"
                            title="Download CSV"
                          >
                            <FileText className="h-3 w-3" /> CSV
                          </button>
                          
                          <button
                            onClick={() => setPrintPreviewType('section-list')}
                            className="p-1 px-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold rounded-lg border border-slate-200 transition-all text-[10px] flex items-center gap-1 cursor-pointer"
                            title="Print Preview"
                          >
                            <Eye className="h-3 w-3" /> Print
                          </button>
                        </div>
                      </div>
                      
                      {(() => {
                        const approvedUsers = allStudents.filter(s => s.approved !== false);
                        const filteredUsers = approvedUsers.filter(student => {
                          if (filterSectionDept === 'All') return true;
                          return (student.department || '').toLowerCase() === filterSectionDept.toLowerCase();
                        });

                        if (filteredUsers.length === 0) {
                          return <p className="text-slate-400 text-xs text-center py-8">No authorized users found for {filterSectionDept} department.</p>;
                        }

                        return (
                          <div className="divide-y divide-slate-50 max-h-[450px] overflow-y-auto pr-1">
                            {filteredUsers.map((student) => (
                              <div key={student.id} className="py-3 flex items-center justify-between gap-4 text-xs first:pt-0 last:pb-0">
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <p className="font-bold text-slate-800 truncate">{student.name}</p>
                                    <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded ${
                                      student.role === 'admin' 
                                        ? 'bg-purple-50 text-purple-700 border border-purple-100' 
                                        : student.role === 'faculty'
                                        ? 'bg-amber-50 text-amber-700 border border-amber-100'
                                        : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                                    }`}>
                                      {student.role === 'admin' ? 'Admin' : student.role === 'faculty' ? 'Faculty' : 'Student'}
                                    </span>
                                  </div>
                                  <p className="text-slate-400 text-[10px] truncate">
                                    @{student.username} • {student.email}
                                    {(student.branchType || student.department) && (
                                      <span className="ml-1.5 px-1 py-0.5 bg-slate-100 text-slate-600 font-bold rounded text-[9px] inline-flex items-center">
                                        {student.branchType} • {student.department}
                                      </span>
                                    )}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  {student.id === currentUser?.id ? (
                                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">
                                      Your Account
                                    </span>
                                  ) : (
                                    <div className="flex items-center gap-1.5">
                                      {currentUser?.role === 'admin' ? (
                                        <>
                                          <span className="text-[10px] text-slate-400 font-medium">Privilege:</span>
                                          <select
                                            value={student.role}
                                            onChange={(e) => handleChangeUserRole(student.id, e.target.value as 'student' | 'admin' | 'faculty')}
                                            className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-[10px] font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                                          >
                                            <option value="student">Student</option>
                                            <option value="faculty">Faculty</option>
                                            <option value="admin">Admin</option>
                                          </select>
                                        </>
                                      ) : (
                                        <span className="text-[10px] text-slate-400 font-medium bg-slate-50 px-2 py-1 rounded border border-slate-100">
                                          Role: <span className="font-bold text-slate-700 uppercase">{student.role}</span>
                                        </span>
                                      )}
                                      <button
                                        onClick={() => startEditingUser(student)}
                                        className="p-1 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg text-slate-400 transition-all text-[10px] font-bold border border-transparent hover:border-indigo-100 cursor-pointer"
                                        title="Edit details"
                                      >
                                        Edit
                                      </button>
                                      {(currentUser?.role === 'admin' || student.role === 'student') && (
                                        <button
                                          onClick={() => handleRejectUser(student.id)}
                                          className="p-1 hover:text-red-600 hover:bg-red-50 rounded-lg text-slate-400 transition-all text-[10px] font-bold border border-transparent hover:border-red-100 cursor-pointer"
                                          title="Revoke / Delete user"
                                        >
                                          Delete
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                </div>
              </div>
            )}
          </div>
        )}

      </main>

      {/* Footer information bar */}
      <footer className="mt-12 bg-white border-t border-slate-100 py-6 shrink-0 text-center text-xs text-slate-400">
        <p className="font-medium">© 2026 Central Placement Training & Recruitment Portal • All Rights Reserved</p>
        <p className="text-[10px] mt-1.5 opacity-80">This application utilizes a NodeJS full-stack Express server backed by Gemini and Hugging Face AI. Optimized for university recruits.</p>
      </footer>

      {/* Info Modals */}
      <ContactModal 
        isOpen={isContactOpen} 
        onClose={() => setIsContactOpen(false)} 
      />

      {/* View Test Modal (Admin/Faculty) - shows correct answers */}
      {viewingTest && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">{viewingTest.title}</h3>
                <p className="text-xs text-slate-400 mt-1">{viewingTest.description}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500 pt-2">
                  <span className="flex items-center gap-1"><ListOrdered className="h-3.5 w-3.5" /> {viewingTest.questions.length} Questions</span>
                  <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> {viewingTest.duration} mins</span>
                  <span className="bg-slate-100 px-2 py-0.5 rounded-full font-semibold uppercase">{viewingTest.category}</span>
                </div>
              </div>
              <button
                onClick={() => setViewingTest(null)}
                className="p-2 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer shrink-0"
              >
                <X className="h-4 w-4 text-slate-500" />
              </button>
            </div>

            <div className="space-y-4">
              {viewingTest.questions.map((q, idx) => (
                <div key={q.id} className="p-4 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
                  <p className="text-xs font-bold text-slate-800">{idx + 1}. {q.question}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {q.options.map((opt, optIdx) => {
                      const isCorrect = optIdx === q.correctAnswer;
                      return (
                        <div
                          key={optIdx}
                          className={`px-3 py-2 rounded-lg text-[11px] flex items-center gap-1.5 border ${
                            isCorrect
                              ? 'bg-green-50 border-green-200 text-green-800 font-bold'
                              : 'bg-white border-slate-150 text-slate-600'
                          }`}
                        >
                          {isCorrect && <CheckCircle2 className="h-3.5 w-3.5 text-green-600 shrink-0" />}
                          {opt}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-2 border-t border-slate-100">
              <button
                onClick={() => setViewingTest(null)}
                className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => handleDeleteTest(viewingTest.id, viewingTest.title)}
                className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 font-bold rounded-xl border border-red-100 transition-all inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete Test
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Details Modal */}
      {editingUser && (
        <div id="edit-user-modal" className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div id="edit-user-modal-card" className="bg-white border border-slate-100 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-6 animate-in zoom-in-95 duration-200">
            <div id="edit-user-modal-header" className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 id="edit-user-title" className="text-lg font-extrabold text-slate-900">Edit User Details</h3>
                <p id="edit-user-subtitle" className="text-xs text-slate-400">Modify credentials, profile info, and role permissions.</p>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="p-1.5 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-xl transition-all cursor-pointer border border-transparent hover:border-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateUserDetails} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Full Name</label>
                <input
                  type="text"
                  required
                  value={editUserName}
                  onChange={(e) => setEditUserName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  placeholder="Full Name"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Username</label>
                <input
                  type="text"
                  required
                  value={editUserUsername}
                  onChange={(e) => setEditUserUsername(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  placeholder="username"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Email Address</label>
                <input
                  type="email"
                  required
                  value={editUserEmail}
                  onChange={(e) => setEditUserEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  placeholder="name@institution.edu"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">New Password</label>
                <input
                  type="password"
                  value={editUserPassword}
                  onChange={(e) => setEditUserPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  placeholder="Leave blank to keep current password"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Branch Type</label>
                  <select
                    value={editUserBranchType}
                    onChange={(e) => setEditUserBranchType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                  >
                    <option value="Circuit">Circuit</option>
                    <option value="Core">Core</option>
                  </select>
                </div>
                
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Department</label>
                  <select
                    value={editUserDepartment}
                    onChange={(e) => setEditUserDepartment(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                  >
                    <option value="CSE">CSE</option>
                    <option value="IT">IT</option>
                    <option value="ECE">ECE</option>
                    <option value="EEE">EEE</option>
                    <option value="CSDS">CSDS</option>
                    <option value="MECH">MECH</option>
                    <option value="AUTO">AUTO</option>
                  </select>
                </div>
              </div>

              {currentUser?.role === 'admin' ? (
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">User Privilege / Role</label>
                  <select
                    value={editUserRole}
                    onChange={(e) => setEditUserRole(e.target.value as 'student' | 'admin' | 'faculty')}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                  >
                    <option value="student">Student</option>
                    <option value="faculty">Faculty</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              ) : null}

              <div className="flex gap-3 pt-4 border-t border-slate-50">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="flex-1 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-xl text-xs transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all cursor-pointer shadow-sm shadow-indigo-600/15"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Print Preview Modal */}
      {printPreviewType && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex flex-col items-center justify-start p-4 sm:p-8 overflow-y-auto z-50 animate-in fade-in duration-200">
          {/* Dynamic Page Orientation Style Injection */}
          <style dangerouslySetInnerHTML={{ __html: `
            @media print {
              @page {
                size: ${printOrientation};
              }
            }
          ` }} />
          
          <div className="bg-white rounded-3xl max-w-5xl w-full shadow-2xl p-6 sm:p-10 space-y-6 my-auto print:shadow-none print:p-0 print:my-0">
            {/* Modal Controls - Hidden during actual print */}
            <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-4 gap-4 print:hidden">
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-indigo-600" />
                <h3 className="text-base font-extrabold text-slate-900">
                  {printPreviewType === 'gradebook' ? 'Student Gradebook Print Preview' : 'Section List Print Preview'}
                </h3>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                {/* Orientation Switcher */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-500">Orientation:</span>
                  <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                    <button
                      onClick={() => setPrintOrientation('portrait')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        printOrientation === 'portrait'
                          ? 'bg-white text-indigo-600 shadow-sm'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      Portrait
                    </button>
                    <button
                      onClick={() => setPrintOrientation('landscape')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        printOrientation === 'landscape'
                          ? 'bg-white text-indigo-600 shadow-sm'
                          : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      Landscape
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => window.print()}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-all shadow-md shadow-indigo-600/10 flex items-center gap-1.5 cursor-pointer"
                  >
                    <FileText className="h-4 w-4" /> Print Now
                  </button>
                  <button
                    onClick={() => setPrintPreviewType(null)}
                    className="p-2 hover:bg-slate-100 text-slate-500 hover:text-slate-700 rounded-xl transition-all cursor-pointer border border-transparent hover:border-slate-100"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Print Document Content */}
            <div id="printable-area" className="bg-white text-slate-900 p-4 sm:p-8 space-y-6 font-sans">
              {/* Report Header */}
              <div className="text-center pb-6 border-b-2 border-slate-900/10 space-y-1.5">
                <h1 className="text-xl font-extrabold tracking-tight uppercase text-slate-900">Central Placement Training & Recruitment Portal</h1>
                <p className="text-xs font-semibold text-slate-600 tracking-wider uppercase">Central Placement Training Cell</p>
                <h2 className="text-sm font-bold text-slate-800 underline underline-offset-4 mt-2">
                  {printPreviewType === 'gradebook' 
                    ? `OFFICIAL STUDENT GRADEBOOK REPORT — ${filterDepartment === 'All' ? 'ALL DEPARTMENTS' : `${filterDepartment} DEPARTMENT`}`
                    : `AUTHORIZED STUDENT SECTION LIST — ${filterSectionDept === 'All' ? 'ALL DEPARTMENTS' : `${filterSectionDept} DEPARTMENT`}`
                  }
                </h2>
                <p className="text-[10px] text-slate-500 font-medium">Generated on: {new Date().toLocaleString()} • Central Portal Records</p>
              </div>

              {/* Table Data */}
              {printPreviewType === 'gradebook' ? (() => {
                const filteredResults = results.filter((res) => {
                  if (filterDepartment === 'All') return true;
                  const student = allStudents.find((s) => s.id === res.userId);
                  const studentDept = student?.department || 'N/A';
                  return studentDept.toLowerCase() === filterDepartment.toLowerCase();
                });

                if (filteredResults.length === 0) {
                  return (
                    <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                      <p className="font-semibold text-xs">No records found matching department: {filterDepartment}</p>
                    </div>
                  );
                }

                return (
                  <table className="w-full text-left border-collapse text-[11px] border border-slate-300">
                    <thead>
                      <tr className="bg-slate-100/80 border-b border-slate-300 text-slate-800 font-bold">
                        <th className="p-2 border-r border-slate-300">Student Name</th>
                        <th className="p-2 border-r border-slate-300">Username</th>
                        <th className="p-2 border-r border-slate-300">Department</th>
                        <th className="p-2 border-r border-slate-300">Mock Exam</th>
                        <th className="p-2 border-r border-slate-300">Category</th>
                        <th className="p-2 border-r border-slate-300">Score</th>
                        <th className="p-2 border-r border-slate-300">Accuracy</th>
                        <th className="p-2">Submission Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-300">
                      {filteredResults.map((res) => {
                        const scorePercentage = Math.round((res.score / res.totalQuestions) * 100);
                        const student = allStudents.find((s) => s.id === res.userId);
                        const dept = student?.department || 'N/A';
                        return (
                          <tr key={res.id} className="hover:bg-slate-50">
                            <td className="p-2 border-r border-slate-300 font-bold text-slate-900">{res.studentName}</td>
                            <td className="p-2 border-r border-slate-300 text-slate-600">{res.username}</td>
                            <td className="p-2 border-r border-slate-300 font-bold uppercase">{dept}</td>
                            <td className="p-2 border-r border-slate-300 font-semibold">{res.testTitle}</td>
                            <td className="p-2 border-r border-slate-300 font-medium">{res.category}</td>
                            <td className="p-2 border-r border-slate-300 font-extrabold">{res.score} / {res.totalQuestions}</td>
                            <td className="p-2 border-r border-slate-300 font-bold">{scorePercentage}%</td>
                            <td className="p-2 text-slate-500">{new Date(res.submittedAt).toLocaleDateString()}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                );
              })() : (() => {
                const approvedUsers = allStudents.filter(s => s.approved !== false);
                const filteredUsers = approvedUsers.filter(student => {
                  if (filterSectionDept === 'All') return true;
                  return (student.department || '').toLowerCase() === filterSectionDept.toLowerCase();
                });

                if (filteredUsers.length === 0) {
                  return (
                    <div className="p-8 text-center text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                      <p className="font-semibold text-xs">No authorized users found matching department: {filterSectionDept}</p>
                    </div>
                  );
                }

                return (
                  <table className="w-full text-left border-collapse text-[11px] border border-slate-300">
                    <thead>
                      <tr className="bg-slate-100/80 border-b border-slate-300 text-slate-800 font-bold">
                        <th className="p-2 border-r border-slate-300">Student Name</th>
                        <th className="p-2 border-r border-slate-300">Username</th>
                        <th className="p-2 border-r border-slate-300">Email Address</th>
                        <th className="p-2 border-r border-slate-300">Branch Type</th>
                        <th className="p-2 border-r border-slate-300">Department</th>
                        <th className="p-2">System Role</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-300">
                      {filteredUsers.map((student) => (
                        <tr key={student.id} className="hover:bg-slate-50">
                          <td className="p-2 border-r border-slate-300 font-bold text-slate-900">{student.name}</td>
                          <td className="p-2 border-r border-slate-300 text-slate-600">@{student.username}</td>
                          <td className="p-2 border-r border-slate-300 text-slate-600">{student.email}</td>
                          <td className="p-2 border-r border-slate-300 font-medium">{student.branchType || 'N/A'}</td>
                          <td className="p-2 border-r border-slate-300 font-extrabold uppercase">{student.department || 'N/A'}</td>
                          <td className="p-2 font-bold capitalize">{student.role}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                );
              })()}

              {/* Print Document Signoff */}
              <div className="pt-16 flex justify-between items-end text-xs text-slate-700 font-medium">
                <div>
                  <div className="border-t border-slate-400 w-48 pt-1.5 text-center">
                    System Administrator
                  </div>
                  <p className="text-[10px] text-slate-400 text-center mt-1">Central Placement Cell</p>
                </div>
                <div>
                  <div className="border-t border-slate-400 w-48 pt-1.5 text-center font-bold">
                    Training & Placement Officer
                  </div>
                  <p className="text-[10px] text-slate-400 text-center mt-1">Authorized Signature & Seal</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
