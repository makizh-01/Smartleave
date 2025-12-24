
import { User, LeaveRequest, Role, ActingStaffStatuses, ApprovalStatus, Gender, AppNotification } from '../types';

const WEB_APP_URL: string = ''; 
const GOOGLE_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1-X3d-S07Z_TmgPCr0WOrbiLC5JQS45hsVFA-K0lv-9w/edit?usp=sharing';

const USERS_KEY = 'smartleave_users_v20';
const LEAVES_KEY = 'smartleave_requests_v20';
const CURRENT_USER_KEY = 'smartleave_current_user_v20';
const NOTIFS_KEY = 'smartleave_notifications_v20';

const normalizeValue = (val: string) => (val || '').trim().toLowerCase();

export const DEPARTMENTS_DATA: Record<string, { hodName: string; email: string; department: string; hasMaternityLeave: boolean; shortCode: string }> = {
  'Computer Science': { hodName: 'Dr.Lingaraj Mani.M', email: 'lingarajmani@sankara.ac.in', department: 'Computer Science', hasMaternityLeave: false, shortCode: 'CS' },
  'Computer Science with Data Analytics': { hodName: 'Dr.Sasikala.R', email: 'sasikala@sankara.ac.in', department: 'Computer Science with Data Analytics', hasMaternityLeave: true, shortCode: 'CSDA' },
  'B.Sc IT': { hodName: 'Dr.Muthuchudar.A', email: 'muthuchudar@sankara.ac.in', department: 'B.Sc IT', hasMaternityLeave: true, shortCode: 'BSc IT' },
  'AI/ML': { hodName: 'Dr.Lingaraj Mani.M', email: 'lingarajmani.aiml@sankara.ac.in', department: 'AI/ML', hasMaternityLeave: false, shortCode: 'AIML' },
  'B.COM IT OR BCOM PA': { hodName: 'Dr.Umadevi.R', email: 'umadevi@sankara.ac.in', department: 'B.COM IT OR BCOM PA', hasMaternityLeave: true, shortCode: 'BCOM IT/PA' },
  'B.COM OR M.COM': { hodName: 'Dr.Deepa.P.S', email: 'deepa@sankara.ac.in', department: 'B.COM OR M.COM', hasMaternityLeave: true, shortCode: 'BCOM/MCOM' },
  'CSHM': { hodName: 'Mr.Anandaraj.P', email: 'anandaraj@sankara.ac.in', department: 'CSHM', hasMaternityLeave: false, shortCode: 'CSHM' },
  'BBA CA': { hodName: 'Dr.Kavitha.S', email: 'skavitha@sankara.ac.in', department: 'BBA CA', hasMaternityLeave: true, shortCode: 'BBA CA' },
  'MBA': { hodName: 'Dr.Priya Kalyanasundaram', email: 'priya.mba@sankara.ac.in', department: 'MBA', hasMaternityLeave: true, shortCode: 'MBA' },
  'M.SC CS': { hodName: 'Dr.Muthuchudar.A', email: 'muthuchudar.msc@sankara.ac.in', department: 'M.SC CS', hasMaternityLeave: false, shortCode: 'MSC CS' }
};

type SeedItem = { name: string; email: string; department: string; role?: Role; gender: Gender };

// Master record of official institution names
const OFFICIAL_SEED: SeedItem[] = [
    { name: 'Dr.Radhika.V', email: 'radhikav@sankara.ac.in', department: 'Administration', role: Role.PRINCIPAL, gender: 'Female' },
    { name: 'Prof.Bernard Edward', email: 'bernardedward@sankara.ac.in', department: 'Administration', role: Role.VICE_PRINCIPAL, gender: 'Male' },
    { name: 'Dr.Lingaraj Mani.M', email: 'lingarajmani@sankara.ac.in', department: 'Computer Science', role: Role.HOD, gender: 'Male' },
    { name: 'Dr.SathyaPriya.S', email: 'sathyapriya@sankara.ac.in', department: 'Computer Science', gender: 'Female' },
    { name: 'Ms.Bhavya.P', email: 'bhavya@sankara.ac.in', department: 'Computer Science', gender: 'Female' },
    { name: 'Mrs.Nandhini.T', email: 'nandhini.cs@sankara.ac.in', department: 'Computer Science', gender: 'Female' },
    { name: 'Ms.Hemalatha.D', email: 'hemalatha.cs@sankara.ac.in', department: 'Computer Science', gender: 'Female' },
    { name: 'Dr.Sasikala.R', email: 'sasikala@sankara.ac.in', department: 'Computer Science with Data Analytics', role: Role.HOD, gender: 'Female' },
    { name: 'Mr.Jayachandran.A', email: 'jayachandran@sankara.ac.in', department: 'Computer Science with Data Analytics', gender: 'Male' },
    { name: 'Mrs.Kavitha.S.V', email: 'kavithasv@sankara.ac.in', department: 'Computer Science with Data Analytics', gender: 'Female' },
    { name: 'Ms.Swarnamugi.A', email: 'swarnamugi@sankara.ac.in', department: 'Computer Science with Data Analytics', gender: 'Female' },
    { name: 'Mrs.Gayathri.R', email: 'gayathri.csda@sankara.ac.in', department: 'Computer Science with Data Analytics', gender: 'Female' },
    { name: 'Dr.Muthuchudar.A', email: 'muthuchudar@sankara.ac.in', department: 'B.Sc IT', role: Role.HOD, gender: 'Female' },
    { name: 'Ms.Soundarya.C', email: 'soundarya@sankara.ac.in', department: 'B.Sc IT', gender: 'Female' },
    { name: 'Mrs.Vinothini.D', email: 'vinothini.it@sankara.ac.in', department: 'B.Sc IT', gender: 'Female' },
    { name: 'Mrs.Sridevi Karumari.S', email: 'sridevi.it@sankara.ac.in', department: 'B.Sc IT', gender: 'Female' },
    { name: 'Mr.Atheesh Kumar.S', email: 'atheeshkumar@sankara.ac.in', department: 'AI/ML', gender: 'Male' },
    { name: 'Dr.Umadevi.R', email: 'umadevi@sankara.ac.in', department: 'B.COM IT OR BCOM PA', role: Role.HOD, gender: 'Female' },
    { name: 'Mr.Thiagarajan.N', email: 'thiagarajan@sankara.ac.in', department: 'B.COM IT OR BCOM PA', gender: 'Male' },
    { name: 'Ms.Sumathi.A', email: 'sumathi@sankara.ac.in', department: 'B.COM IT OR BCOM PA', gender: 'Female' },
    { name: 'Dr.Anuratha.C.A', email: 'anuratha@sankara.ac.in', department: 'B.COM IT OR BCOM PA', gender: 'Female' },
    { name: 'Dr.Nandhini.C', email: 'nandhini.bcom@sankara.ac.in', department: 'B.COM IT OR BCOM PA', gender: 'Female' },
    { name: 'Ms.Keerthana.S', email: 'keerthana@sankara.ac.in', department: 'B.COM IT OR BCOM PA', gender: 'Female' },
    { name: 'Mrs.Priya.So', email: 'priya.bcom@sankara.ac.in', department: 'B.COM IT OR BCOM PA', gender: 'Female' },
    { name: 'Dr.ArulJothi.K', email: 'aruljothi@sankara.ac.in', department: 'B.COM IT OR BCOM PA', gender: 'Female' },
    { name: 'Dr.Deepa.P.S', email: 'deepa@sankara.ac.in', department: 'B.COM OR M.COM', role: Role.HOD, gender: 'Female' },
    { name: 'Dr.Saranya.M', email: 'saranya@sankara.ac.in', department: 'B.COM OR M.COM', gender: 'Female' },
    { name: 'Dr.Vaideki.A', email: 'vaideki@sankara.ac.in', department: 'B.COM OR M.COM', gender: 'Female' },
    { name: 'Ms.Kiruthika.K', email: 'kiruthika@sankara.ac.in', department: 'B.COM OR M.COM', gender: 'Female' },
    { name: 'Mrs.Indudurga.J', email: 'indudurga@sankara.ac.in', department: 'B.COM OR M.COM', gender: 'Female' },
    { name: 'Dr.Vinothini.S', email: 'vinothini.bcom@sankara.ac.in', department: 'B.COM OR M.COM', gender: 'Female' },
    { name: 'Mr.Libin Christopher', email: 'libinchristopher@sankara.ac.in', department: 'B.COM OR M.COM', gender: 'Male' },
    { name: 'Mr.Rohith.G', email: 'rohith@sankara.ac.in', department: 'B.COM OR M.COM', gender: 'Male' },
    { name: 'Mrs.Kanchana Devi', email: 'kanchanadevi@sankara.ac.in', department: 'B.COM OR M.COM', gender: 'Female' },
    { name: 'Mr.Ramachandran.P', email: 'ramachandran@sankara.ac.in', department: 'B.COM OR M.COM', gender: 'Male' },
    { name: 'Mr.Anandaraj.P', email: 'anandaraj@sankara.ac.in', department: 'CSHM', role: Role.HOD, gender: 'Male' },
    { name: 'Mr.Maruthasala Prabu.T', email: 'maruthasala@sankara.ac.in', department: 'CSHM', gender: 'Male' },
    { name: 'Mr.Rajasekar.C', email: 'rajasekar@sankara.ac.in', department: 'CSHM', gender: 'Male' },
    { name: 'Mrs.Revathi.M', email: 'revathi.cshm@sankara.ac.in', department: 'CSHM', gender: 'Female' },
    { name: 'Ms.Gayathri.M', email: 'gayathri.cshm@sankara.ac.in', department: 'CSHM', gender: 'Female' },
    { name: 'Mr.Nandhakumar.T', email: 'nandhakumar.cshm@sankara.ac.in', department: 'CSHM', gender: 'Male' },
    { name: 'Dr.Kavitha.S', email: 'skavitha@sankara.ac.in', department: 'BBA CA', role: Role.HOD, gender: 'Female' },
    { name: 'Dr.Bhuvaneswari.B', email: 'bhuvaneswari@sankara.ac.in', department: 'BBA CA', gender: 'Female' },
    { name: 'Ms.Lakshmi Priya.G', email: 'lakshmipriya@sankara.ac.in', department: 'BBA CA', gender: 'Female' },
    { name: 'Ms.ChitraLekha.S', email: 'chitralekha@sankara.ac.in', department: 'BBA CA', gender: 'Female' },
    { name: 'Dr.Priya Kalyanasundaram', email: 'priya.mba@sankara.ac.in', department: 'MBA', role: Role.HOD, gender: 'Female' },
    { name: 'Dr.Thirugnana Sambanthan.K', email: 'thirugnana@sankara.ac.in', department: 'MBA', gender: 'Male' },
    { name: 'Dr.Sethuram.S', email: 'sethuram@sankara.ac.in', department: 'MBA', gender: 'Male' },
    { name: 'Mr.Srithar.R', email: 'srithar@sankara.ac.in', department: 'MBA', gender: 'Male' },
    { name: 'Mr.Venugopal.N', email: 'venugopal@sankara.ac.in', department: 'MBA', gender: 'Male' },
    { name: 'Mrs.Manjuladevi.M', email: 'manjuladevi@sankara.ac.in', department: 'MBA', gender: 'Female' },
    { name: 'Mr.Matheswaran.S', email: 'matheswaran@sankara.ac.in', department: 'MBA', gender: 'Male' },
    { name: 'Ms.Shrie Bhubaneswari.N.T', email: 'shriebhubaneswari@sankara.ac.in', department: 'MBA', gender: 'Female' },
    { name: 'Ms.Theinmozhi.M', email: 'theinmozhi@sankara.ac.in', department: 'M.SC CS', gender: 'Female' },
    { name: 'Ms.Bharathi.S', email: 'bharathi@sankara.ac.in', department: 'M.SC CS', gender: 'Female' }
];

const getOfficialName = (email: string): string | null => {
    const emailLower = normalizeValue(email);
    const match = OFFICIAL_SEED.find(s => normalizeValue(s.email) === emailLower);
    return match ? match.name : null;
};

const initializeUsers = () => {
  const existingStr = localStorage.getItem(USERS_KEY);
  let users: User[] = existingStr ? JSON.parse(existingStr) : [];
  
  let updated = false;
  OFFICIAL_SEED.forEach(seed => {
      const email = normalizeValue(seed.email);
      const existing = users.find(u => normalizeValue(u.email) === email);
      if (!existing) {
          users.push({
              id: crypto.randomUUID(),
              name: seed.name, // Use official name
              email: email,
              role: seed.role || Role.STAFF,
              department: seed.department,
              isTeachingStaff: true,
              gender: seed.gender
          } as User);
          updated = true;
      } else if (existing.name !== seed.name) {
          // Sync existing user name with official seed name if it differs (e.g. from informal to official)
          existing.name = seed.name;
          updated = true;
      }
  });

  if (updated) {
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
      // Refresh current user session if their name was updated
      const current = localStorage.getItem(CURRENT_USER_KEY);
      if (current) {
          const currUser = JSON.parse(current) as User;
          const matched = users.find(u => normalizeValue(u.email) === normalizeValue(currUser.email));
          if (matched) {
              localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(matched));
          }
      }
  }
};

initializeUsers();

export const storageService = {
  getGoogleSheetUrl: () => GOOGLE_SHEET_URL,

  getUsers: (): User[] => {
    const data = localStorage.getItem(USERS_KEY);
    return data ? JSON.parse(data) : [];
  },

  saveUser: (user: User): void => {
    const users = storageService.getUsers();
    // Enforce official name format if the email exists in seed
    const officialName = getOfficialName(user.email);
    const sanitizedUser = { 
        ...user, 
        name: officialName || user.name, 
        email: normalizeValue(user.email) 
    };
    
    const targetEmail = sanitizedUser.email;
    const existingIndex = users.findIndex(u => normalizeValue(u.email) === targetEmail);
    if (existingIndex > -1) {
        users[existingIndex] = { ...users[existingIndex], ...sanitizedUser };
    } else {
        users.push(sanitizedUser);
    }
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    window.dispatchEvent(new CustomEvent('SMARTLEAVE_UPDATE'));
  },

  getCurrentUser: (): User | null => {
    const data = localStorage.getItem(CURRENT_USER_KEY);
    return data ? JSON.parse(data) : null;
  },

  loginUser: (email: string, password?: string): User | null => {
    const users = storageService.getUsers();
    const targetEmail = normalizeValue(email);
    const user = users.find(u => normalizeValue(u.email) === targetEmail);
    
    if (user && user.password && user.password === password) {
      // Ensure current user is saved with their most up-to-date official name
      const officialName = getOfficialName(user.email);
      if (officialName) user.name = officialName;
      
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
      return user;
    }
    return null; 
  },

  logoutUser: (): void => {
    localStorage.removeItem(CURRENT_USER_KEY);
  },

  getLeaves: (userId?: string): LeaveRequest[] => {
    const data = localStorage.getItem(LEAVES_KEY);
    const allLeaves: LeaveRequest[] = data ? JSON.parse(data) : [];
    const sorted = allLeaves.sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime());
    if (userId) return sorted.filter(l => l.userId === userId);
    return sorted;
  },

  saveLeave: (leave: LeaveRequest): void => {
    const data = localStorage.getItem(LEAVES_KEY);
    const allLeaves: LeaveRequest[] = data ? JSON.parse(data) : [];
    const index = allLeaves.findIndex(l => l.id === leave.id);
    if (index >= 0) {
      allLeaves[index] = leave;
    } else {
      allLeaves.push(leave);
    }
    localStorage.setItem(LEAVES_KEY, JSON.stringify(allLeaves));
    window.dispatchEvent(new CustomEvent('SMARTLEAVE_UPDATE'));
  },

  getStaffByDepartment: (department: string): User[] => {
    const users = storageService.getUsers();
    const target = normalizeValue(department);
    return users.filter(u => normalizeValue(u.department || '') === target);
  },

  getActingRequests: (userName: string): LeaveRequest[] => {
    const allLeaves = storageService.getLeaves();
    const normalizedName = normalizeValue(userName);
    return allLeaves.filter(leave => {
        return Object.values(leave.actingStaff).some(dayAssignment => {
            return Object.values(dayAssignment).some(val => val && normalizeValue(val) === normalizedName);
        });
    });
  },

  notifyActingStaff: (leave: LeaveRequest, senderName?: string) => {
    const users = storageService.getUsers();
    const notifsData = localStorage.getItem(NOTIFS_KEY);
    const allNotifs: AppNotification[] = notifsData ? JSON.parse(notifsData) : [];
    let updated = false;

    const pendingStaffSet = new Set<string>();
    Object.keys(leave.actingStaffStatuses).forEach(date => {
        Object.keys(leave.actingStaffStatuses[date]).forEach(p => {
            if (leave.actingStaffStatuses[date][p] === 'Pending') {
                const staffName = leave.actingStaff[date]?.[p];
                if (staffName && !['Free', 'N/A'].includes(staffName)) {
                    pendingStaffSet.add(staffName);
                }
            }
        });
    });

    pendingStaffSet.forEach(staffName => {
        // Since we enforced official names, this lookup will now be 100% reliable
        const staffUser = users.find(u => normalizeValue(u.name) === normalizeValue(staffName));
        if (staffUser) {
            const msg = senderName 
                ? `${senderName} (HoD) has assigned you a session coverage duty for ${leave.name}. Check Duty Requests.`
                : `${leave.name} has requested you for session coverage. Check Duty Requests.`;
            
            const newNotif: AppNotification = {
                id: crypto.randomUUID(),
                userId: staffUser.id,
                message: msg,
                type: 'info',
                isRead: false,
                timestamp: new Date().toISOString(),
                leaveId: leave.id
            };
            allNotifs.unshift(newNotif);
            updated = true;
        }
    });

    if (updated) {
        localStorage.setItem(NOTIFS_KEY, JSON.stringify(allNotifs));
        window.dispatchEvent(new CustomEvent('SMARTLEAVE_UPDATE'));
    }
  },

  updateActingStatus: (leaveId: string, userName: string, status: 'Approved' | 'Rejected'): void => {
    const allLeaves = storageService.getLeaves();
    const index = allLeaves.findIndex(l => l.id === leaveId);
    if (index >= 0) {
        const leave = allLeaves[index];
        const newStatuses = { ...leave.actingStaffStatuses };
        const normalizedName = normalizeValue(userName);
        let affectedPeriods: string[] = [];
        let affectedDate = "";

        Object.keys(leave.actingStaff).forEach(date => {
            const dayAssignment = leave.actingStaff[date];
            if (!newStatuses[date]) newStatuses[date] = {};
            Object.entries(dayAssignment).forEach(([period, staffName]) => {
                if (staffName && normalizeValue(staffName) === normalizedName) {
                    newStatuses[date][period] = status;
                    affectedPeriods.push(period.replace('period', 'P'));
                    affectedDate = date;
                }
            });
        });

        allLeaves[index] = { ...leave, actingStaffStatuses: newStatuses };
        localStorage.setItem(LEAVES_KEY, JSON.stringify(allLeaves));

        const notifsData = localStorage.getItem(NOTIFS_KEY);
        const allNotifs: AppNotification[] = notifsData ? JSON.parse(notifsData) : [];
        
        const newNotif: AppNotification = {
          id: crypto.randomUUID(),
          userId: leave.userId,
          message: `${userName} has ${status.toLowerCase()} your duty request for ${affectedDate} (${affectedPeriods.join(', ')}).`,
          type: status === 'Approved' ? 'success' : 'warning',
          isRead: false,
          timestamp: new Date().toISOString(),
          leaveId: leave.id
        };
        
        allNotifs.unshift(newNotif);
        localStorage.setItem(NOTIFS_KEY, JSON.stringify(allNotifs));

        window.dispatchEvent(new CustomEvent('SMARTLEAVE_UPDATE'));
    }
  },

  getNotifications: (userId: string): AppNotification[] => {
    const data = localStorage.getItem(NOTIFS_KEY);
    const all: AppNotification[] = data ? JSON.parse(data) : [];
    return all.filter(n => n.userId === userId);
  },

  markNotificationsRead: (userId: string): void => {
    const data = localStorage.getItem(NOTIFS_KEY);
    const all: AppNotification[] = data ? JSON.parse(data) : [];
    const updated = all.map(n => n.userId === userId ? { ...n, isRead: true } : n);
    localStorage.setItem(NOTIFS_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('SMARTLEAVE_UPDATE'));
  },

  getLeavesForAuthority: (user: User): LeaveRequest[] => {
    const allLeaves = storageService.getLeaves();
    return allLeaves.filter(leave => {
      if (leave.userId === user.id) return false;
      if (user.role === Role.HOD) {
        return leave.isTeachingStaff && normalizeValue(leave.department || '') === normalizeValue(user.department || '');
      } else if (user.role === Role.VICE_PRINCIPAL || user.role === Role.PRINCIPAL) {
        if (!leave.isTeachingStaff) return true;
        return leave.hodApproval === 'Approved';
      }
      return false;
    });
  },

  exportToExcel: (data: any[], fileName: string) => {
    if (!data || !data.length) return;
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(obj => {
        return Object.values(obj).map(val => `"${String(val).replace(/"/g, '""')}"`).join(',');
    });
    const csvContent = [headers, ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.setAttribute('href', URL.createObjectURL(blob));
    link.setAttribute('download', `${fileName}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
