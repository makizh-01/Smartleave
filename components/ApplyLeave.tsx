
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { DayType, LeaveFormData, LeavePurpose, LeaveRequest, User, ActingStaffAssignment, Role, ActingStaffStatuses, ApprovalStatus, DailyActingAssignment } from '../types';
import { generateLeaveLetter } from '../services/geminiService';
import { storageService, DEPARTMENTS_DATA } from '../services/storageService';

interface ApplyLeaveProps {
  user: User;
  onSuccess: () => void;
}

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
  isTeaching: boolean;
  placeholder?: string;
}> = ({ value, onChange, staffList, isTeaching, placeholder }) => {
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
        className="w-full px-3 py-2 bg-white text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 font-bold shadow-sm transition-all"
      />
      <div className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none group-focus-within/input:text-blue-500 transition-colors">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 19l-4-4m0-7A7 7 0 111 8a7 7 0 0114 0z" /></svg>
      </div>

      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-2xl max-h-96 overflow-y-auto animate-in fade-in zoom-in duration-200 ring-1 ring-slate-900/5">
          <div 
            className="px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-50 transition-colors"
            onMouseDown={(e) => {
              e.preventDefault();
              handleSelect('Free');
            }}
          >
            <p className="text-xs font-black text-green-600">Free / Self Managed</p>
          </div>
          {filteredStaff.map((s) => (
            <div
              key={s.id}
              className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-slate-50 last:border-0 transition-colors"
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect(s.name);
              }}
            >
              <p className="text-xs font-bold text-slate-900">{s.name}</p>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{s.role}</p>
            </div>
          ))}
          {!isTeaching && (
             <div 
              className="px-4 py-3 hover:bg-slate-50 cursor-pointer transition-colors"
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelect('N/A');
              }}
            >
              <p className="text-xs font-bold text-slate-400">N/A</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const ApplyLeave: React.FC<ApplyLeaveProps> = ({ user, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [departmentStaff, setDepartmentStaff] = useState<User[]>([]);

  const [formData, setFormData] = useState<LeaveFormData>({
    name: user.name,
    isTeachingStaff: user.isTeachingStaff,
    department: user.department || '',
    fromDate: '',
    toDate: '',
    dayType: DayType.FULL_DAY,
    purpose: '' as LeavePurpose,
    actingStaff: {},
    medicalCertificate: null,
    generatedLetter: '',
    time: '',
    sections: { morning: false, afternoon: false },
    hodDutyAssignment: false
  });

  const leaveDates = useMemo(() => {
    if (!formData.fromDate) return [];
    const end = formData.dayType === DayType.HALF_DAY ? formData.fromDate : (formData.toDate || formData.fromDate);
    return getDatesInRange(formData.fromDate, end);
  }, [formData.fromDate, formData.toDate, formData.dayType]);

  useEffect(() => {
    const newActingStaff: ActingStaffAssignment = { ...formData.actingStaff };
    let changed = false;

    leaveDates.forEach(date => {
        if (!newActingStaff[date]) {
            newActingStaff[date] = {
                period1: '', period2: '', period3: '', period4: '', period5: '', period6: ''
            };
            changed = true;
        }
    });

    Object.keys(newActingStaff).forEach(date => {
        if (!leaveDates.includes(date)) {
            delete newActingStaff[date];
            changed = true;
        }
    });

    if (changed) {
        setFormData(prev => ({ ...prev, actingStaff: newActingStaff }));
    }
  }, [leaveDates]);

  useEffect(() => {
    const targetDept = formData.department || user.department;
    if (targetDept) {
      const staff = storageService.getStaffByDepartment(targetDept);
      const normalizedUserEmail = user.email.trim().toLowerCase();
      
      const uniqueMap = new Map<string, User>();
      staff.forEach(s => {
          const emailKey = s.email.trim().toLowerCase();
          // Logic: Exclude the staff applying for leave from the acting staff dropdown
          if (emailKey !== normalizedUserEmail) {
              uniqueMap.set(emailKey, s);
          }
      });

      const sortedStaff = Array.from(uniqueMap.values()).sort((a, b) => {
          if (a.role === Role.HOD) return -1;
          if (b.role === Role.HOD) return 1;
          return a.name.localeCompare(b.name);
      });
      setDepartmentStaff(sortedStaff);
    } else {
      setDepartmentStaff([]);
    }
  }, [formData.department, user.email, user.department]);

  const handleChange = (field: keyof LeaveFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleActingStaffChange = (date: string, period: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      actingStaff: {
        ...prev.actingStaff,
        [date]: {
            ...prev.actingStaff[date],
            [period]: value
        }
      }
    }));
  };

  const handleCopyToAllDays = (sourceDate: string) => {
      const sourceAssignment = formData.actingStaff[sourceDate];
      const newActingStaff: ActingStaffAssignment = {};
      leaveDates.forEach(date => {
          newActingStaff[date] = { ...sourceAssignment };
      });
      setFormData(prev => ({ ...prev, actingStaff: newActingStaff }));
  };

  const handleGenerateLetter = async () => {
    setIsGenerating(true);
    let assignmentSummaries = '';
    
    if (formData.hodDutyAssignment) {
        assignmentSummaries = "Acting staff assignment requested to be handled by the Head of Department.";
    } else {
        assignmentSummaries = leaveDates.map(date => {
            const periods = Object.entries(formData.actingStaff[date] || {})
                .filter(([_, staff]) => staff && staff !== 'Free' && staff !== 'N/A')
                .map(([p, s]) => `${p.replace('period', 'P')}: ${s}`)
                .join(', ');
            return periods ? `${date}: ${periods}` : `${date}: Free`;
        }).join('; ');
    }

    const activeSections = [];
    if (formData.sections.morning) activeSections.push('Morning');
    if (formData.sections.afternoon) activeSections.push('Afternoon');
    
    const letterData = { 
        ...formData, 
        actingStaff: assignmentSummaries || 'None (Class Free)',
        sectionsStr: activeSections.join(' & ') 
    };
    
    const letter = await generateLeaveLetter(letterData as any);
    setFormData(prev => ({ ...prev, generatedLetter: letter }));
    setIsGenerating(false);
  };

  const handleSubmit = async () => {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 1500));

    const sectionsList: string[] = [];
    if (formData.sections.morning) sectionsList.push('Morning');
    if (formData.sections.afternoon) sectionsList.push('Afternoon');

    const finalToDate = formData.dayType === DayType.HALF_DAY ? formData.fromDate : formData.toDate;
    
    const isApplicantHod = user.role === Role.HOD;
    const initialHodStatus = isApplicantHod ? 'Approved' : (formData.isTeachingStaff ? 'Pending' : 'N/A');

    const actingStaffStatuses: ActingStaffStatuses = {};
    leaveDates.forEach(date => {
        actingStaffStatuses[date] = {
            period1: 'N/A', period2: 'N/A', period3: 'N/A', period4: 'N/A', period5: 'N/A', period6: 'N/A'
        };
        const dayAssignment = formData.actingStaff[date];
        if (dayAssignment && !formData.hodDutyAssignment) {
            Object.keys(dayAssignment).forEach(p => {
                const val = dayAssignment[p];
                if (val && !['Free', 'N/A', ''].includes(val.trim())) {
                    actingStaffStatuses[date][p] = 'Pending';
                }
            });
        }
    });

    const newLeave: LeaveRequest = {
      id: crypto.randomUUID(),
      userId: user.id,
      name: formData.name,
      isTeachingStaff: formData.isTeachingStaff,
      department: formData.department || user.department,
      fromDate: formData.fromDate,
      toDate: finalToDate,
      dayType: formData.dayType,
      purpose: formData.purpose as LeavePurpose,
      actingStaff: formData.hodDutyAssignment ? {} : formData.actingStaff,
      actingStaffStatuses: actingStaffStatuses,
      hasMedicalCertificate: !!formData.medicalCertificate,
      finalLetterContent: formData.generatedLetter,
      submittedAt: new Date().toISOString(),
      time: formData.dayType === DayType.HALF_DAY ? formData.time : undefined,
      sections: formData.dayType === DayType.HALF_DAY ? sectionsList : undefined,
      status: 'Pending',
      hodApproval: initialHodStatus,
      adminApproval: 'Pending',
      hodDutyAssignment: formData.hodDutyAssignment
    };

    storageService.saveLeave(newLeave);
    storageService.notifyActingStaff(newLeave);
    setLoading(false);
    onSuccess();
  };

  const inputClasses = "w-full px-4 py-3 bg-white text-gray-900 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all shadow-sm text-sm font-medium";
  const labelClasses = "block text-[11px] font-black text-slate-500 uppercase tracking-widest mb-2";

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12 animate-fade-in text-slate-900 px-4">
      <style>{`
        .custom-date-input::-webkit-calendar-picker-indicator {
            background: transparent; bottom: 0; color: transparent; cursor: pointer; height: auto; left: 0; position: absolute; right: 0; top: 0; width: auto;
        }
      `}</style>
      <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-xl border border-slate-100">
        <div className="border-b border-slate-100 pb-6 mb-8 flex items-center justify-between">
           <h2 className="text-3xl font-black text-slate-900 tracking-tight">Apply for Leave</h2>
           <span className="bg-blue-50 text-blue-600 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest">Official Request</span>
        </div>

        <div className="space-y-12">
            {/* Core Info Section */}
            <section className="space-y-6">
                <h3 className="text-sm font-black text-blue-600 uppercase tracking-widest border-l-4 border-blue-600 pl-3">Leave Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-1">
                        <label className={labelClasses}>Department</label>
                        <select
                            value={formData.department}
                            onChange={(e) => handleChange('department', e.target.value)}
                            className={inputClasses}
                        >
                            <option value="">Select Department...</option>
                            {Object.keys(DEPARTMENTS_DATA).map(d => (
                                <option key={d} value={d}>{d}</option>
                            ))}
                        </select>
                    </div>
                    <div className="space-y-1">
                        <label className={labelClasses}>Reason</label>
                        <select
                            value={formData.purpose}
                            onChange={(e) => handleChange('purpose', e.target.value)}
                            className={inputClasses}
                        >
                            <option value="" disabled>Select Reason...</option>
                            {Object.values(LeavePurpose).map((p) => (
                            <option key={p} value={p}>{p}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className={labelClasses}>Duration Type</label>
                        <div className="flex space-x-3">
                        {[DayType.FULL_DAY, DayType.HALF_DAY].map((type) => (
                            <button
                            key={type}
                            onClick={() => handleChange('dayType', type)}
                            className={`flex-1 py-3 px-4 rounded-xl border text-[11px] font-black transition-all uppercase tracking-widest ${
                                formData.dayType === type
                                ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-200'
                                : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                            }`}
                            >
                            {type}
                            </button>
                        ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className={labelClasses}>{formData.dayType === DayType.HALF_DAY ? 'Date' : 'From Date'}</label>
                            <div className="relative">
                                <input
                                    type="date"
                                    value={formData.fromDate}
                                    onChange={(e) => handleChange('fromDate', e.target.value)}
                                    className={`${inputClasses} custom-date-input pr-10`}
                                />
                                <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-blue-600">
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                </div>
                            </div>
                        </div>
                        
                        {formData.dayType === DayType.FULL_DAY ? (
                            <div className="space-y-1">
                                <label className={labelClasses}>To Date</label>
                                <div className="relative">
                                    <input
                                        type="date"
                                        value={formData.toDate}
                                        min={formData.fromDate}
                                        onChange={(e) => handleChange('toDate', e.target.value)}
                                        className={`${inputClasses} custom-date-input pr-10`}
                                    />
                                    <div className="absolute inset-y-0 right-0 flex items-center px-3 pointer-events-none text-blue-600">
                                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-1">
                                <label className={labelClasses}>Time</label>
                                <input 
                                    type="time" 
                                    value={formData.time} 
                                    onChange={(e) => handleChange('time', e.target.value)} 
                                    className={inputClasses}
                                />
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {/* Acting Staff Section */}
            <section className="space-y-6">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-blue-600 uppercase tracking-widest border-l-4 border-blue-600 pl-3">Session Coverage</h3>
                    <div className="flex items-center gap-3 bg-blue-50 px-4 py-2 rounded-xl">
                        <input 
                            type="checkbox" 
                            id="hodAssign"
                            checked={formData.hodDutyAssignment}
                            onChange={(e) => handleChange('hodDutyAssignment', e.target.checked)}
                            className="w-4 h-4 rounded border-blue-300 text-blue-600 focus:ring-blue-500"
                        />
                        <label htmlFor="hodAssign" className="text-[10px] font-black text-blue-900 cursor-pointer uppercase tracking-widest">Delegate assignments to HOD</label>
                    </div>
                </div>
                
                {!formData.fromDate || !formData.department ? (
                    <div className="p-12 text-center bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem]">
                        <svg className="w-12 h-12 text-slate-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Select department and dates to assign duties</p>
                    </div>
                ) : formData.hodDutyAssignment ? (
                    <div className="p-12 text-center bg-blue-50 border-2 border-dashed border-blue-200 rounded-[2rem]">
                        <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-black">!</div>
                        <p className="text-blue-900 font-black text-base tracking-tight mb-1">Delegated to {DEPARTMENTS_DATA[formData.department]?.hodName}</p>
                        <p className="text-blue-500 font-bold text-[10px] uppercase tracking-widest">HOD will manage session coverage</p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {leaveDates.map((date) => (
                            <div key={date} className="bg-slate-50 p-6 rounded-[2rem] border border-slate-200 shadow-sm">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-slate-200 text-blue-600">
                                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                      </div>
                                      <h4 className="blue-700 font-black text-sm uppercase tracking-tight">
                                          {new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                                      </h4>
                                    </div>
                                    {leaveDates.length > 1 && (
                                        <button 
                                            onClick={() => handleCopyToAllDays(date)}
                                            className="text-[10px] font-black uppercase tracking-widest bg-blue-100 text-blue-700 px-5 py-2.5 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-md active:scale-95"
                                        >
                                            Copy to all days
                                        </button>
                                    )}
                                </div>
                                
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {[1, 2, 3, 4, 5, 6].map((pNum) => (
                                        <div key={pNum} className="space-y-2">
                                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                              <span className="w-5 h-5 bg-white border border-slate-200 rounded flex items-center justify-center text-[8px] text-slate-500">P{pNum}</span>
                                              Session {pNum}
                                            </label>
                                            <StaffSearchInput
                                                value={formData.actingStaff[date]?.[`period${pNum}`] || ''}
                                                onChange={(val) => handleActingStaffChange(date, `period${pNum}`, val)}
                                                staffList={departmentStaff}
                                                isTeaching={formData.isTeachingStaff}
                                                placeholder={`Faculty member...`}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            {/* Application Letter Section - Now Below Acting Staff */}
            <section className="space-y-6 pt-6 border-t border-slate-100">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-black text-blue-600 uppercase tracking-widest border-l-4 border-blue-600 pl-3">Application Letter</h3>
                    <button
                        onClick={handleGenerateLetter}
                        disabled={!formData.purpose || isGenerating || leaveDates.length === 0}
                        className="px-6 py-3 bg-blue-600 text-white text-[11px] font-black rounded-xl hover:bg-blue-700 transition-all shadow-lg disabled:opacity-50 flex items-center gap-2 uppercase tracking-widest active:scale-95"
                    >
                        {isGenerating ? (
                            <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        ) : (
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10l4 4v10a2 2 0 01-2 2z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 3v4a1 1 0 001 1h4" /></svg>
                        )}
                        {isGenerating ? 'Drafting...' : 'AI Compose Letter'}
                    </button>
                </div>

                <div className="relative group">
                    <textarea
                        value={formData.generatedLetter}
                        onChange={(e) => handleChange('generatedLetter', e.target.value)}
                        rows={12}
                        className="w-full px-8 py-10 bg-slate-50 text-gray-900 border border-slate-200 rounded-[2.5rem] focus:ring-2 focus:ring-blue-500 transition-all font-serif leading-relaxed text-base resize-y shadow-inner"
                        placeholder="Your application draft will appear here..."
                    />
                    <div className="absolute top-6 right-8 text-[10px] font-black text-slate-300 uppercase tracking-widest pointer-events-none">
                        Drafting Area
                    </div>
                </div>

                <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-6">
                    <div className="text-left">
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Confirmation Policy</p>
                        <p className="text-xs text-slate-500 font-medium max-w-md">By submitting, you confirm the accuracy of dates and delegated duties. Approvals will be processed by HoD and Administrative office.</p>
                    </div>
                    <button
                        onClick={handleSubmit}
                        disabled={loading || !formData.generatedLetter.trim() || !formData.name || leaveDates.length === 0}
                        className="w-full md:w-auto px-12 py-5 bg-green-600 text-white font-black text-sm uppercase tracking-widest rounded-2xl hover:bg-green-700 disabled:opacity-50 transition-all shadow-xl shadow-green-100 transform active:scale-95 flex items-center justify-center gap-4 group"
                    >
                        {loading ? (
                            <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                        ) : (
                            <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
                        )}
                        {loading ? 'Submitting Application...' : 'Submit Application'}
                    </button>
                </div>
            </section>
        </div>
      </div>
    </div>
  );
};
