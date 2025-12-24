
import React, { useState } from 'react';
import { User, Role, Gender } from '../types';
import { storageService, DEPARTMENTS_DATA } from '../services/storageService';

interface AuthProps {
  initialRole: Role | null;
  onLoginSuccess: (user: User) => void;
  onBack: () => void;
}

export const Auth: React.FC<AuthProps> = ({ initialRole, onLoginSuccess, onBack }) => {
  const [view, setView] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [gender, setGender] = useState<Gender>('Male');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const validateDomain = (email: string) => {
    return email.trim().toLowerCase().endsWith('@sankara.ac.in');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!validateDomain(email)) {
      setError('Please use your official @sankara.ac.in email address.');
      return;
    }

    setLoading(true);
    // Artificial delay for UX "feel"
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const loggedUser = storageService.loginUser(email, password);
    if (loggedUser) {
      onLoginSuccess(loggedUser);
    } else {
      setError('Invalid credentials. Please verify your email and password.');
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password || !name || !department) {
      setError('Please fill in all required fields.');
      return;
    }

    if (!validateDomain(email)) {
      setError('Registration requires a @sankara.ac.in email.');
      return;
    }

    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1000));

    const existingUsers = storageService.getUsers();
    if (existingUsers.find(u => u.email.trim().toLowerCase() === email.trim().toLowerCase() && u.password)) {
      setError('An account with this email already exists. Try logging in.');
      setLoading(false);
      return;
    }

    const newUser: User = {
      id: crypto.randomUUID(),
      name,
      email: email.trim(),
      password,
      role: initialRole || Role.STAFF,
      department,
      isTeachingStaff: true, // Defaulting to teaching for this specific flow
      gender
    };

    storageService.saveUser(newUser);
    const logged = storageService.loginUser(email, password);
    if (logged) onLoginSuccess(logged);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100 rounded-full blur-[120px] opacity-50"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-100 rounded-full blur-[120px] opacity-50"></div>

      <div className="w-full max-w-md relative z-10">
        <button 
          onClick={onBack}
          className="group mb-8 flex items-center gap-2 text-slate-400 hover:text-slate-900 transition-colors font-bold text-xs uppercase tracking-[0.2em]"
        >
          <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
          Change Role
        </button>

        <div className="bg-white/80 backdrop-blur-xl p-8 md:p-10 rounded-[2.5rem] shadow-2xl border border-white/20">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 text-white rounded-2xl mb-6 shadow-xl shadow-blue-200">
              <span className="text-2xl font-black">S</span>
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">
              {view === 'login' ? 'Welcome Back' : 'Create Account'}
            </h2>
            <p className="text-slate-500 text-sm mt-2 font-medium">
              {initialRole} Portal • Sankara SmartLeave
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 text-xs font-bold rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
              <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {error}
            </div>
          )}

          <form onSubmit={view === 'login' ? handleLogin : handleRegister} className="space-y-5">
            {view === 'register' && (
              <>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
                  <input 
                    type="text" 
                    required
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    placeholder="Enter official name"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all font-bold placeholder:text-slate-300" 
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Gender</label>
                    <select 
                      value={gender} 
                      onChange={(e) => setGender(e.target.value as Gender)}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all font-bold"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Dept</label>
                    <select 
                      required
                      value={department} 
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all font-bold"
                    >
                      <option value="">Select...</option>
                      {Object.keys(DEPARTMENTS_DATA).map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </div>
              </>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Email Address</label>
              <div className="relative">
                <input 
                  type="email" 
                  required
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  placeholder="name@sankara.ac.in"
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all font-bold placeholder:text-slate-300" 
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                   <svg className="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.206" /></svg>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Secret Password</label>
              <div className="relative">
                <input 
                  type="password" 
                  required
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  placeholder="••••••••"
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-600 focus:bg-white transition-all font-bold placeholder:text-slate-300" 
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                   <svg className="w-5 h-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                </div>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-100 transform active:scale-[0.98] flex items-center justify-center gap-3 relative overflow-hidden group"
            >
              {loading && <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
              <span className="uppercase tracking-widest text-sm">{loading ? (view === 'login' ? 'Authenticating...' : 'Creating...') : (view === 'login' ? 'Sign In' : 'Join Now')}</span>
              <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform"></div>
            </button>
          </form>

          <div className="mt-8 text-center">
            <button 
              onClick={() => { setView(view === 'login' ? 'register' : 'login'); setError(''); }} 
              className="text-xs font-black text-slate-400 hover:text-blue-600 transition-colors uppercase tracking-widest"
            >
              {view === 'login' ? "Don't have an account? Create one" : "Already registered? Sign in instead"}
            </button>
          </div>
        </div>

        <p className="mt-8 text-center text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">
          Secure Gateway • Sankara Institution
        </p>
      </div>
    </div>
  );
};
