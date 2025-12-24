
import React, { useState, useEffect, useMemo } from 'react';
import { User, LeaveRequest, ApprovalStatus, LeavePurpose, Role } from '../types';
import { storageService } from '../services/storageService';

interface DashboardProps {
  user: User;
}

export const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [actingRequests, setActingRequests] = useState<{leave: LeaveRequest, date: string, periods: string[]}[]>([]);
  const [myHistory, setMyHistory] = useState<LeaveRequest[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const fetchDuties = () => {
      const reqs = storageService.getActingRequests(user.name);
      const normalizedUser = user.name.trim().toLowerCase();
      const pendingNotifications: {leave: LeaveRequest, date: string, periods: string[]}[] = [];
      
      reqs.forEach(r => {
          Object.entries(r.actingStaff).forEach(([date, dailyAssignment]) => {
              const periodsForDate: string[] = [];
              Object.entries(dailyAssignment).forEach(([pKey, staffName]) => {
                  if (staffName && staffName.trim().toLowerCase() === normalizedUser) {
                      if (r.actingStaffStatuses?.[date]?.[pKey] === 'Pending') {
                          periodsForDate.push(pKey.replace('period', 'P'));
                      }
                  }
              });
              if (periodsForDate.length > 0) {
                  pendingNotifications.push({ leave: r, date, periods: periodsForDate });
              }
          });
      });
      setActingRequests(pendingNotifications);
      setMyHistory(storageService.getLeaves(user.id));
    };

    fetchDuties();
    const handleSyncUpdate = () => fetchDuties();
    window.addEventListener('storage', handleSyncUpdate);
    window.addEventListener('SMARTLEAVE_UPDATE', handleSyncUpdate);
    const interval = setInterval(fetchDuties, 5000);
    return () => {
        window.removeEventListener('storage', handleSyncUpdate);
        window.removeEventListener('SMARTLEAVE_UPDATE', handleSyncUpdate);
        clearInterval(interval);
    };
  }, [user.name, user.id, refreshKey]);

  const handleActingAction = (leaveId: string, action: 'Approved' | 'Rejected') => {
    storageService.updateActingStatus(leaveId, user.name, action);
    setRefreshKey(prev => prev + 1);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
        case 'Approved': return 'text-green-600 bg-green-50 border-green-100';
        case 'Rejected': return 'text-red-600 bg-red-50 border-red-100';
        case 'Pending': return 'text-orange-500 bg-orange-50 border-orange-100';
        default: return 'text-slate-400 bg-slate-50 border-slate-100';
    }
  };

  const activeLeave = useMemo(() => {
    return myHistory.find(l => l.status === 'Pending' || new Date(l.fromDate) >= new Date());
  }, [myHistory]);

  const leaveStats = useMemo(() => {
    const approved = myHistory.filter(l => l.status === 'Approved');
    let casualUsed = 0;
    let medicalUsed = 0;
    approved.forEach(l => {
        const start = new Date(l.fromDate);
        const end = new Date(l.toDate);
        const diffDays = Math.ceil(Math.abs(end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        const val = l.dayType === 'Half Day' ? 0.5 : diffDays;
        if (l.purpose === LeavePurpose.MEDICAL_LEAVE) medicalUsed += val;
        else casualUsed += val;
    });
    return { casualUsed, medicalUsed };
  }, [myHistory]);

  return (
    <div className="space-y-6 animate-fade-in pb-8 text-slate-900">
      {/* Actionable Duties for colleagues */}
      {actingRequests.length > 0 && (
          <div className="bg-white rounded-[2rem] p-6 border-2 border-blue-600 shadow-xl">
              <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">Pending Colleague Duties</h3>
                  <span className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest">{actingRequests.length} Pending</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {actingRequests.map((note, idx) => (
                      <div key={idx} className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                          <p className="text-[11px] font-black text-slate-900 mb-1">{note.leave.name}</p>
                          <p className="text-[9px] text-blue-600 font-bold uppercase mb-3">{new Date(note.date).toLocaleDateString()} • {note.periods.join(', ')}</p>
                          <div className="flex gap-2">
                              <button onClick={() => handleActingAction(note.leave.id, 'Approved')} className="flex-1 py-2 bg-blue-600 text-white text-[9px] font-black rounded-lg uppercase tracking-widest">Accept</button>
                              <button onClick={() => handleActingAction(note.leave.id, 'Rejected')} className="flex-1 py-2 bg-white text-slate-400 border border-slate-200 text-[9px] font-black rounded-lg uppercase tracking-widest">Decline</button>
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}

      {/* Coverage Progress for Applicant */}
      {activeLeave && !activeLeave.hodDutyAssignment && (
          <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-lg">
              <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight">Leave Coverage Status</h3>
                    <p className="text-[10px] text-slate-400 font-bold mt-0.5">Track your duty acceptances in real-time.</p>
                  </div>
              </div>
              <div className="space-y-3">
                  {Object.keys(activeLeave.actingStaff).map(date => (
                      <div key={date} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">{new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}</p>
                          <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                              {Object.entries(activeLeave.actingStaff[date]).map(([pKey, name]) => {
                                  const status = activeLeave.actingStaffStatuses?.[date]?.[pKey] || 'N/A';
                                  if (!name || name === 'Free' || name === 'N/A') return null;
                                  return (
                                      <div key={pKey} className="p-2 bg-white rounded-lg border border-slate-100 flex flex-col items-center text-center">
                                          <span className="text-[8px] font-black text-slate-400 uppercase mb-0.5">{pKey.replace('period', 'P')}</span>
                                          <p className="text-[9px] font-bold text-slate-800 line-clamp-1 mb-1">{name}</p>
                                          <span className={`px-1.5 py-0.5 rounded-md text-[7px] font-black uppercase ${getStatusColor(status)}`}>{status}</span>
                                      </div>
                                  );
                              })}
                          </div>
                      </div>
                  ))}
              </div>
          </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full -mr-12 -mt-12 opacity-50"></div>
              <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest relative">Casual Leave</h4>
              <div className="flex items-baseline mt-2 relative">
                  <span className="text-5xl font-black text-slate-900 tracking-tighter">{leaveStats.casualUsed}</span>
                  <span className="ml-2 text-[10px] text-slate-400 font-bold uppercase">/ 12 Days</span>
              </div>
          </div>
          <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 w-24 h-24 bg-red-50 rounded-full -mr-12 -mt-12 opacity-50"></div>
              <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest relative">Medical Leave</h4>
              <div className="flex items-baseline mt-2 relative">
                  <span className="text-5xl font-black text-slate-900 tracking-tighter">{leaveStats.medicalUsed}</span>
                  <span className="ml-2 text-[10px] text-slate-400 font-bold uppercase">/ 3 Days</span>
              </div>
          </div>
      </div>

      <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-lg">
          <h3 className="text-lg font-black text-slate-900 mb-6 tracking-tight">Recent History</h3>
          <div className="space-y-4">
              {myHistory.length === 0 ? (
                  <div className="p-10 text-center bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 font-bold text-xs uppercase tracking-widest">No history recorded</div>
              ) : (
                  myHistory.slice(0, 3).map(leave => (
                      <div key={leave.id} className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50">
                          <div className="flex justify-between items-start mb-4">
                              <div>
                                  <p className="text-base font-black text-slate-900">{leave.purpose}</p>
                                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{leave.fromDate} {leave.toDate !== leave.fromDate ? `to ${leave.toDate}` : ''}</p>
                              </div>
                              <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase border ${getStatusColor(leave.status)}`}>{leave.status}</span>
                          </div>
                          <div className="flex items-center gap-2">
                              {[
                                  { label: 'HoD', status: leave.hodApproval },
                                  { label: 'Admin', status: leave.adminApproval }
                              ].map((step, i, arr) => (
                                  <React.Fragment key={step.label}>
                                      <div className="flex flex-col items-center flex-1">
                                          <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 mb-1 transition-all ${
                                              step.status === 'Approved' ? 'bg-green-600 border-green-600 text-white' : 
                                              step.status === 'Rejected' ? 'bg-red-600 border-red-600 text-white' : 
                                              'bg-white border-slate-200 text-slate-300'
                                          }`}>
                                              {step.status === 'Approved' ? <span className="text-xs">✓</span> : step.status === 'Rejected' ? <span className="text-xs">✗</span> : <span className="text-[10px]">{i + 1}</span>}
                                          </div>
                                          <span className="text-[8px] font-black uppercase tracking-tighter text-slate-400">{step.label}</span>
                                      </div>
                                      {i < arr.length - 1 && <div className={`h-0.5 flex-1 -mt-4 rounded-full ${arr[i+1].status === 'Approved' ? 'bg-green-600' : 'bg-slate-200'}`}></div>}
                                  </React.Fragment>
                              ))}
                          </div>
                      </div>
                  ))
              )}
          </div>
      </div>
    </div>
  );
};
