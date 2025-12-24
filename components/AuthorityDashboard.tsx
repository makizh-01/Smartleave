
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { User, LeaveRequest, Role, ActingStaffAssignment, ActingStaffStatuses, DayType } from '../types';
import { storageService } from '../services/storageService';

interface AuthorityDashboardProps {
  user: User;
}

const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-');
    return `${d}/${m}/${y}`;
};

const getDatesInRange = (startDate: string, endDate: string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dates = [];
    let current = new Date(start);
    while (current <= end) {
        dates.push(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
    }
    return dates;
};

const StaffSearchInput: React.FC<{
  value: string;
  onChange: (val: string) => void;
  staffList: User[];
  placeholder?: string;
}> = ({ value, onChange, staffList, placeholder }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSearch(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredStaff = useMemo(() => {
    const query = search.toLowerCase();
    const list = [...staffList];
    if (!query) return list;
    return list.filter(s => s.name.toLowerCase().includes(query) || s.role.toLowerCase().includes(query));
  }, [search, staffList]);

  const handleSelect = (name: string) => {
    onChange(name);
    setSearch(name);
    setIsOpen(false);
  };

  return (
    <div className="relative group/input" ref={containerRef}>
      <input
        type="text"
        value={search}
        onFocus={() => setIsOpen(true)}
        onChange={(e) => {
          setSearch(e.target.value);
          onChange(e.target.value);
          setIsOpen(true);
        }}
        placeholder={placeholder}
        className="w-full bg-white border border-slate-200 text-[10px] font-bold rounded-lg px-2 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-sm transition-all"
      />
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-96 overflow-y-auto animate-in fade-in zoom-in duration-150 ring-1 ring-slate-900/5">
          <div 
            className="px-3 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-50 transition-colors"
            onMouseDown={(e) => {
              e.preventDefault(); // Prevents focus shift so selection registers
              handleSelect('Free');
            }}
          >
            <p className="text-[10px] font-black text-green-600">Free</p>
          </div>
          {filteredStaff.map((s) => (
            <div
              key={s.id}
              className="px-3 py-3 hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-0 transition-colors"
              onMouseDown={(e) => {
                e.preventDefault(); // Prevents focus shift so selection registers
                handleSelect(s.name);
              }}
            >
              <p className="text-[10px] font-bold text-slate-900">{s.name}</p>
              <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">{s.role}</p>
            </div>
          ))}
          {filteredStaff.length === 0 && search && (
            <div className="px-3 py-4 text-center">
              <p className="text-[8px] font-bold text-slate-400 italic">No matches</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const AuthorityDashboard: React.FC<AuthorityDashboardProps> = ({ user }) => {
  const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
  const [refreshKey, setRefreshKey] = useState(0);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tempActingStaff, setTempActingStaff] = useState<ActingStaffAssignment>({});
  const [departmentStaff, setDepartmentStaff] = useState<User[]>([]);

  const requests = storageService.getLeavesForAuthority(user);

  // Initialize editing state only once when a specific request is opened
  useEffect(() => {
    if (editingId) {
        const req = requests.find(r => r.id === editingId);
        if (req && req.department) {
            const staff = storageService.getStaffByDepartment(req.department);
            // Logic: Exclude the person taking leave (applicant) from the acting staff options
            const sortedStaff = staff
                .filter(s => s.id !== req.userId)
                .sort((a, b) => a.name.localeCompare(b.name));
            setDepartmentStaff(sortedStaff);
            
            // Only set if not already in the middle of editing this specific ID
            const dates = getDatesInRange(req.fromDate, req.toDate);
            const initial: ActingStaffAssignment = {};
            dates.forEach(date => {
                initial[date] = req.actingStaff[date] || {
                    period1: '', period2: '', period3: '', period4: '', period5: '', period6: ''
                };
            });
            setTempActingStaff(initial);
        }
    } else {
        setTempActingStaff({});
        setDepartmentStaff([]);
    }
  }, [editingId]);

  const handleActingStaffChange = (date: string, period: string, value: string) => {
    setTempActingStaff(prev => ({
      ...prev,
      [date]: { ...prev[date], [period]: value }
    }));
  };

  const handleAction = async (request: LeaveRequest, action: 'Approved' | 'Rejected') => {
    setLoadingAction(request.id);
    await new Promise(resolve => setTimeout(resolve, 800));

    const updatedRequest = { ...request };
    let notifyStaff = false;

    if (user.role === Role.HOD) {
        if (editingId === request.id) {
            updatedRequest.actingStaff = tempActingStaff;
            updatedRequest.hodDutyAssignment = false; 
            notifyStaff = true;
            
            const newStatuses: ActingStaffStatuses = {};
            Object.keys(tempActingStaff).forEach(date => {
                newStatuses[date] = { 
                    period1: 'N/A', period2: 'N/A', period3: 'N/A', 
                    period4: 'N/A', period5: 'N/A', period6: 'N/A' 
                };
                Object.keys(tempActingStaff[date]).forEach(p => {
                    const val = tempActingStaff[date][p];
                    // If a specific staff member is assigned, ensure they get a notification by setting 'Pending'
                    if (val && !['Free', 'N/A', ''].includes(val.trim())) {
                        newStatuses[date][p] = 'Pending';
                    }
                });
            });
            updatedRequest.actingStaffStatuses = newStatuses;
        } else if (request.hodDutyAssignment && action === 'Approved') {
            alert("Please use 'Assign Duties' to handle the delegated session coverage first.");
            setLoadingAction(null);
            return;
        }
        updatedRequest.hodApproval = action;
        if (action === 'Rejected') updatedRequest.status = 'Rejected';
    } else {
        updatedRequest.adminApproval = action;
        updatedRequest.status = action === 'Approved' ? 'Approved' : 'Rejected'; 
    }

    updatedRequest.approverName = user.name;
    updatedRequest.approverRole = user.role;

    storageService.saveLeave(updatedRequest);
    
    if (notifyStaff) {
        storageService.notifyActingStaff(updatedRequest, user.name);
    }
    
    setEditingId(null);
    setLoadingAction(null);
    setRefreshKey(prev => prev + 1);
  };

  const pendingRequests = requests.filter(r => {
      if (user.role === Role.HOD) return r.hodApproval === 'Pending';
      return r.adminApproval === 'Pending';
  });

  const historyRequests = requests.filter(r => {
      if (user.role === Role.HOD) return r.hodApproval !== 'Pending';
      return r.adminApproval !== 'Pending';
  });

  return (
    <div className="space-y-8 animate-fade-in pb-12">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between border-b border-slate-200 pb-8 gap-6">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Management Hub</h2>
          <p className="text-slate-500 font-medium">Internal Administration & Approval Center</p>
        </div>
        <div className="flex bg-white p-1.5 rounded-2xl shadow-sm border border-slate-100">
          <button onClick={() => setActiveTab('pending')} className={`px-6 py-3 rounded-xl text-sm font-black transition-all ${activeTab === 'pending' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-500 hover:text-slate-900'}`}>Requests ({pendingRequests.length})</button>
          <button onClick={() => setActiveTab('history')} className={`px-6 py-3 rounded-xl text-sm font-black transition-all ${activeTab === 'history' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-500 hover:text-slate-900'}`}>History</button>
        </div>
      </div>

      <div className="grid gap-8">
        {(activeTab === 'pending' ? pendingRequests : historyRequests).length === 0 ? (
            <div className="text-center py-20 bg-white rounded-[2rem] border-2 border-dashed border-slate-200">
                <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">No {activeTab} requests found</p>
            </div>
        ) : (
            (activeTab === 'pending' ? pendingRequests : historyRequests).map(req => {
                const isEditing = editingId === req.id;
                const needsAssignment = user.role === Role.HOD && req.hodDutyAssignment;
                const isLoading = loadingAction === req.id;

                return (
                    <div key={req.id} className={`bg-white rounded-[2rem] shadow-xl border transition-all relative ${isEditing ? 'ring-4 ring-blue-500/20 border-blue-500' : 'border-slate-100'}`}>
                        {isLoading && (
                            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-50 rounded-[2rem] flex flex-col items-center justify-center">
                                <svg className="animate-spin h-8 w-8 text-blue-600 mb-4" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                <p className="text-sm font-black text-slate-900 uppercase tracking-widest">Saving & Dispatching Notifications...</p>
                            </div>
                        )}
                        <div className="p-8 md:p-10">
                            <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-8">
                                <div className="flex-1">
                                    <div className="flex items-center mb-6">
                                        <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl mr-6 shadow-lg shadow-blue-100">{req.name.charAt(0)}</div>
                                        <div>
                                            <div className="flex items-center gap-3">
                                                <h3 className="text-2xl font-black text-slate-900">{req.name}</h3>
                                                {needsAssignment && (
                                                    <span className="bg-orange-100 text-orange-700 text-[9px] font-black px-2 py-1 rounded-full uppercase tracking-widest animate-pulse">Duty Delegated</span>
                                                )}
                                            </div>
                                            <p className="text-xs text-blue-600 font-black uppercase tracking-widest mt-1">{req.department || 'General Staff'}</p>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                                        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Leave Period</span>
                                            <p className="font-bold text-slate-800 text-lg">{req.dayType === DayType.HALF_DAY ? formatDate(req.fromDate) : `${formatDate(req.fromDate)} to ${formatDate(req.toDate)}`}</p>
                                        </div>
                                        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Reason Type</span>
                                            <p className="font-bold text-slate-800 text-lg">{req.purpose}</p>
                                        </div>
                                    </div>

                                    {isEditing && (
                                        <div className="space-y-6 mb-8 p-6 bg-slate-50 rounded-3xl border border-slate-200">
                                            <div className="flex items-center justify-between mb-2">
                                                <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Assigning {req.department} Staff</h4>
                                                <span className="text-[9px] font-black text-slate-400 bg-white px-2 py-1 rounded-lg border border-slate-200">{departmentStaff.length} Faculty Available</span>
                                            </div>
                                            {getDatesInRange(req.fromDate, req.toDate).map(date => (
                                                <div key={date} className="space-y-4">
                                                    <p className="text-xs font-black text-blue-600 uppercase tracking-widest">{formatDate(date)}</p>
                                                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                                                        {[1, 2, 3, 4, 5, 6].map(p => (
                                                            <div key={p}>
                                                                <label className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1 block text-center">P{p}</label>
                                                                <StaffSearchInput
                                                                    value={tempActingStaff[date]?.[`period${p}`] || ''}
                                                                    onChange={(val) => handleActingStaffChange(date, `period${p}`, val)}
                                                                    staffList={departmentStaff}
                                                                    placeholder={`Find in ${req.department}...`}
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                            <div className="flex gap-3 pt-4">
                                                <button onClick={() => handleAction(req, 'Approved')} className="flex-1 py-4 bg-blue-600 text-white font-black text-xs rounded-xl shadow-lg hover:bg-blue-700 transition-all uppercase tracking-widest">Confirm & Send Duty Requests</button>
                                                <button onClick={() => setEditingId(null)} className="px-8 py-4 bg-white text-slate-500 font-black text-xs rounded-xl border border-slate-200 hover:bg-slate-50 transition-all uppercase tracking-widest">Discard</button>
                                            </div>
                                        </div>
                                    )}

                                    {!isEditing && (
                                        <details className="text-sm group/letter">
                                            <summary className="font-black text-blue-600 hover:text-blue-800 mb-2 cursor-pointer transition-colors list-none flex items-center gap-2">
                                                <span>{req.finalLetterContent ? 'READ APPLICATION LETTER' : 'NO LETTER CONTENT'}</span>
                                                <svg className="w-4 h-4 transition-transform group-open/letter:rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" /></svg>
                                            </summary>
                                            <div className="p-8 bg-slate-50 rounded-2xl border border-slate-200 font-serif whitespace-pre-wrap text-slate-700 leading-relaxed italic mt-2 shadow-inner">{req.finalLetterContent || 'No content drafted.'}</div>
                                        </details>
                                    )}
                                </div>
                                
                                {activeTab === 'pending' && !isEditing && (
                                    <div className="flex flex-row lg:flex-col gap-3 lg:w-48 shrink-0">
                                        {needsAssignment ? (
                                            <button 
                                                onClick={() => setEditingId(req.id)} 
                                                className="flex-1 px-6 py-5 bg-blue-600 text-white font-black text-sm rounded-2xl hover:bg-blue-700 shadow-xl flex items-center justify-center gap-2 transition-all transform hover:scale-105"
                                            >
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                Assign Duties
                                            </button>
                                        ) : (
                                            <button 
                                                onClick={() => handleAction(req, 'Approved')} 
                                                className="flex-1 px-6 py-5 bg-green-600 text-white font-black text-sm rounded-2xl hover:bg-green-700 shadow-xl transition-all transform hover:scale-105"
                                            >
                                                Approve
                                            </button>
                                        )}
                                        <button 
                                            onClick={() => handleAction(req, 'Rejected')} 
                                            className="flex-1 px-6 py-5 bg-white text-red-600 font-black text-sm rounded-2xl hover:bg-red-50 border border-red-100 transition-all"
                                        >
                                            Reject
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })
        )}
      </div>
    </div>
  );
};
