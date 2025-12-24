
export enum Role {
  STAFF = 'Staff',
  HOD = 'HoD',
  PRINCIPAL = 'Principal',
  VICE_PRINCIPAL = 'Vice Principal'
}

export type Gender = 'Male' | 'Female' | 'Other';

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string;
  role: Role;
  department?: string;
  isTeachingStaff: boolean;
  gender: Gender;
}

export enum LeavePurpose {
  CONDOLENCES = 'Condolences',
  PERSONAL_ISSUE = 'Personal Issue',
  MEDICAL_LEAVE = 'Medical Leave',
  IMPORTANT_FUNCTION = 'Important Function',
  OTHERS = 'Others'
}

export enum DayType {
  FULL_DAY = 'Full Day',
  HALF_DAY = 'Half Day'
}

export type DailyActingAssignment = Record<string, string>;
export type ActingStaffAssignment = Record<string, DailyActingAssignment>;
export type ActingStaffStatuses = Record<string, Record<string, ApprovalStatus>>;
export type ApprovalStatus = 'Pending' | 'Approved' | 'Rejected' | 'N/A';

export interface AppNotification {
  id: string;
  userId: string; // Target user (recipient)
  message: string;
  type: 'success' | 'warning' | 'info';
  isRead: boolean;
  timestamp: string;
  leaveId: string;
}

export interface LeaveRequest {
  id: string;
  userId: string;
  name: string;
  isTeachingStaff: boolean;
  department?: string;
  fromDate: string;
  toDate: string;
  dayType: DayType;
  purpose: LeavePurpose;
  actingStaff: ActingStaffAssignment;
  actingStaffStatuses: ActingStaffStatuses;
  hasMedicalCertificate: boolean;
  finalLetterContent: string;
  submittedAt: string;
  
  time?: string;
  sections?: string[]; 

  status: 'Pending' | 'Approved' | 'Rejected';
  
  hodApproval: ApprovalStatus;
  adminApproval: ApprovalStatus; // Unified Administration (Principal/VP) Approval

  approverName?: string;
  approverRole?: string;
  
  hodDutyAssignment?: boolean;
}

export interface LeaveFormData {
  name: string;
  isTeachingStaff: boolean;
  department: string;
  fromDate: string;
  toDate: string;
  dayType: DayType;
  purpose: LeavePurpose | '';
  actingStaff: ActingStaffAssignment;
  medicalCertificate: File | null;
  generatedLetter: string;
  
  time: string;
  sections: { morning: boolean; afternoon: boolean };
  hodDutyAssignment: boolean;
}
