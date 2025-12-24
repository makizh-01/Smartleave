
import React, { useState, useEffect, useRef } from 'react';
import { User, Role, Gender, AppNotification } from './types';
import { storageService } from './services/storageService';
import { ApplyLeave } from './components/ApplyLeave';
import { MyLeaves } from './components/MyLeaves';
import { Dashboard } from './components/Dashboard';
import { AuthorityDashboard } from './components/AuthorityDashboard';
import { DutyRequests } from './components/DutyRequests';
import { Auth } from './components/Auth';

type AppView = 'dashboard' | 'approvals' | 'my-leaves' | 'apply-leave' | 'duty-requests';
type AppMode = 'landing' | 'auth' | 'app';

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [mode, setMode] = useState<AppMode>('landing');
  const [targetRole, setTargetRole] = useState<Role | null>(null);
  
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [pendingDutyCount, setPendingDutyCount] = useState(0);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const storedUser = storageService.getCurrentUser();
    if (storedUser) {
      setUser(storedUser);
      setMode('app');
      setCurrentView('dashboard');
    }
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (user) {
        const syncData = () => {
            const reqs = storageService.getActingRequests(user.name);
            const normalizedUser = user.name.trim().toLowerCase();
            let count = 0;
            reqs.forEach(r => {
                if (r.actingStaffStatuses) {
                    Object.entries(r.actingStaffStatuses).forEach(([date, dayStats]) => {
                        Object.entries(dayStats).forEach(([pKey, status]) => {
                            const staffName = r.actingStaff[date]?.[pKey];
                            if (status === 'Pending' && staffName && staffName.trim().toLowerCase() === normalizedUser) {
                                count++;
                            }
                        });
                    });
                }
            });
            setPendingDutyCount(count);

            const notifs = storageService.getNotifications(user.id);
            setNotifications(notifs);
        };
        
        syncData();
        window.addEventListener('SMARTLEAVE_UPDATE', syncData);
        window.addEventListener('storage', syncData);
        const interval = setInterval(syncData, 5000);
        return () => {
            window.removeEventListener('SMARTLEAVE_UPDATE', syncData);
            window.removeEventListener('storage', syncData);
            clearInterval(interval);
        };
    }
  }, [user]);

  const handleToggleNotif = () => {
    setIsNotifOpen(!isNotifOpen);
    if (user && !isNotifOpen) {
      storageService.markNotificationsRead(user.id);
    }
  };

  const handleLoginSuccess = (loggedInUser: User) => {
    setUser(loggedInUser);
    setMode('app');
    setCurrentView('dashboard');
  };

  const handleLogout = () => {
    storageService.logoutUser();
    setUser(null);
    setMode('landing');
    setTargetRole(null);
  };

  const startAuth = (role: Role) => {
    setTargetRole(role);
    setMode('auth');
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (mode === 'landing') {
      return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-4 text-slate-900">
            <div className="max-w-4xl w-full">
                <div className="text-center mb-10 animate-in fade-in slide-in-from-top-4 duration-700">
                     <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-blue-600 text-white mb-6 shadow-2xl transform hover:scale-105 transition-transform duration-500">
                        <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                    </div>
                    <h1 className="text-4xl font-black text-slate-900 mb-2 tracking-tighter">Sankara SmartLeave</h1>
                    <p className="text-lg text-slate-500 font-medium tracking-tight">Enterprise Unified Leave Management Solution</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-1000">
                    <button onClick={() => startAuth(Role.PRINCIPAL)} className="bg-white p-6 rounded-[2rem] shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all border border-slate-100 group flex flex-col items-center">
                        <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500">
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                        </div>
                        <h3 className="text-xl font-black text-slate-900">Administration</h3>
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-[9px] mt-1">Principal & Vice Principal Entry</p>
                    </button>
                    <button onClick={() => startAuth(Role.HOD)} className="bg-white p-6 rounded-[2rem] shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all border border-slate-100 group flex flex-col items-center">
                        <div className="w-16 h-16 bg-pink-100 text-pink-600 rounded-2xl flex items-center justify-center mb-4 group-hover:bg-pink-600 group-hover:text-white transition-all duration-500">
                            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                        </div>
                        <h3 className="text-xl font-black text-slate-900">Department Head</h3>
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-[9px] mt-1">Level 1 Approval Portal</p>
                    </button>
                    <button onClick={() => startAuth(Role.STAFF)} className="bg-white p-8 rounded-[2rem] shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all border border-slate-100 group md:col-span-2 flex items-center justify-center gap-8">
                        <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all duration-500 shrink-0">
                            <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                        </div>
                        <div className="text-left">
                            <h3 className="text-2xl font-black text-slate-900">Faculty & Support Staff</h3>
                            <p className="text-slate-500 font-medium text-base">Access your dashboard to apply for leave or view duty requests.</p>
                        </div>
                    </button>
                </div>
            </div>
        </div>
      );
  }

  if (mode === 'auth') {
    return (
      <Auth 
        initialRole={targetRole} 
        onLoginSuccess={handleLoginSuccess}
        onBack={() => setMode('landing')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black shadow-md shadow-blue-100">S</div>
             <h1 className="text-base font-black tracking-tight text-slate-900 hidden sm:block md:hidden lg:block">Sankara SmartLeave</h1>
          </div>
          
          <div className="flex items-center gap-4 h-full">
             {/* Standardized Profile Header: Always shows Official Name & Dept */}
             {user && (
               <div className="flex items-center gap-3 border-r border-slate-100 pr-4 mr-2">
                 <div className="text-right flex flex-col justify-center">
                    <p className="text-[14px] font-black text-slate-900 leading-none tracking-tight">{user.name}</p>
                    <div className="flex items-center justify-end gap-1.5 mt-2">
                       <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded uppercase tracking-tighter whitespace-nowrap">{user.department}</span>
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter whitespace-nowrap">{user.role}</span>
                    </div>
                 </div>
                 <div className="hidden sm:flex w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 border border-blue-800 items-center justify-center text-white font-black text-base shadow-lg">
                    {user.name.charAt(0)}
                 </div>
               </div>
             )}

             <div className="flex items-center gap-2">
                <div className="relative" ref={notifRef}>
                    <button onClick={handleToggleNotif} className="p-2.5 bg-slate-50 text-slate-400 hover:text-blue-600 rounded-lg transition-all border border-slate-100 relative">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                        {unreadCount > 0 && <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-red-500 text-white text-[8px] flex items-center justify-center rounded-full border-2 border-white">{unreadCount}</span>}
                    </button>
                    {isNotifOpen && (
                        <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-[1.5rem] shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                            <div className="p-4 border-b border-slate-50 bg-slate-50 flex items-center justify-between">
                                <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Notification Center</h3>
                                <span className="text-[8px] font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-full uppercase tracking-widest">{notifications.length} Messages</span>
                            </div>
                            <div className="max-h-96 overflow-y-auto">
                                {notifications.length === 0 ? (
                                    <div className="p-10 text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest">All clear! No messages</div>
                                ) : (
                                    notifications.map(n => (
                                        <div key={n.id} className={`p-4 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors ${!n.isRead ? 'bg-blue-50/20' : ''}`}>
                                            <div className="flex gap-3">
                                                <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${n.type === 'success' ? 'bg-green-500' : n.type === 'warning' ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                                                <div className="flex-1">
                                                    <p className="text-[11px] font-bold text-slate-800 leading-snug">{n.message}</p>
                                                    <p className="text-[9px] text-slate-400 font-black uppercase mt-2 tracking-tight">{new Date(n.timestamp).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </div>
                <button onClick={handleLogout} title="Logout" className="p-2.5 bg-slate-50 text-slate-400 hover:text-red-600 rounded-lg transition-all border border-slate-100">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
                </button>
             </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <nav className="flex flex-wrap gap-1.5 mb-6 bg-white p-1 rounded-xl shadow-sm border border-slate-100 w-fit">
            <button onClick={() => setCurrentView('dashboard')} className={`px-4 py-2 rounded-lg text-[10px] font-black transition-all ${currentView === 'dashboard' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>DASHBOARD</button>
            {(user?.role === Role.HOD || user?.role === Role.VICE_PRINCIPAL || user?.role === Role.PRINCIPAL) && (
                <button onClick={() => setCurrentView('approvals')} className={`px-4 py-2 rounded-lg text-[10px] font-black transition-all ${currentView === 'approvals' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>MANAGEMENT</button>
            )}
            <button onClick={() => setCurrentView('duty-requests')} className={`px-4 py-2 rounded-lg text-[10px] font-black transition-all relative flex items-center gap-1.5 ${currentView === 'duty-requests' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>
                DUTIES
                {pendingDutyCount > 0 && <span className="bg-red-500 text-white text-[8px] w-3.5 h-3.5 flex items-center justify-center rounded-full border border-white">{pendingDutyCount}</span>}
            </button>
            <button onClick={() => setCurrentView('apply-leave')} className={`px-4 py-2 rounded-lg text-[10px] font-black transition-all ${currentView === 'apply-leave' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>APPLY</button>
            <button onClick={() => setCurrentView('my-leaves')} className={`px-4 py-2 rounded-lg text-[10px] font-black transition-all ${currentView === 'my-leaves' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}>HISTORY</button>
        </nav>

        <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            {currentView === 'dashboard' && user && <Dashboard user={user} />}
            {currentView === 'approvals' && user && <AuthorityDashboard user={user} />}
            {currentView === 'duty-requests' && user && <DutyRequests user={user} />}
            {currentView === 'apply-leave' && user && <ApplyLeave user={user} onSuccess={() => setCurrentView('dashboard')} />}
            {currentView === 'my-leaves' && user && <MyLeaves user={user} />}
        </div>
      </main>
    </div>
  );
};

export default App;
