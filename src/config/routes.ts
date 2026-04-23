export const ROUTES = {
  marketing: {
    home: '/',
    pricing: '/pricing',
  },
  auth: {
    login: '/login',
    verify: '/verify',
  },
  admin: {
    dashboard: '/admin',
  },
  public: {
    landing: '/',
    register: '/register',
  },
  center: {
    dashboard: '/center',
    teachers: '/center/teachers',
    schedule: '/center/schedule',
    attendance: '/center/attendance',
    payments: '/center/payments',
    reports: '/center/reports',
    announcements: '/center/announcements',
    settings: '/center/settings',
  },
  teacher: {
    dashboard: '/teacher',
    groups: '/teacher/groups',
    newGroup: '/teacher/groups/new',
    students: '/teacher/students',
    newStudent: '/teacher/students/new',
    importStudents: '/teacher/students/import',
    schedule: '/teacher/schedule',
    settings: '/teacher/settings',
  },
  attendance: {
    home: '/attendance',
    take: '/attendance/take',
    history: '/attendance/history',
    reports: '/attendance/reports',
  },
  payments: {
    home: '/payments',
    record: '/payments/record',
    overdue: '/payments/overdue',
    reports: '/payments/reports',
  },
  student: {
    dashboard: '/student',
    schedule: '/student/schedule',
  },
  parent: {
    dashboard: '/parent',
    children: '/parent/children',
    settings: '/parent/settings',
  },
  api: {
    admin: {
      tenants: '/api/admin/tenants',
      users: '/api/admin/users',
    },
    auth: {
      sendOtp: '/api/auth/send-otp',
      verifyOtp: '/api/auth/verify-otp',
      logout: '/api/auth/logout',
      session: '/api/auth/session',
    },
    tenant: {
      current: '/api/tenant/current',
      publicProfile: '/api/tenant/public-profile',
      settings: '/api/tenant/settings',
    },
    groups: {
      root: '/api/groups',
    },
    students: {
      root: '/api/students',
      import: '/api/students/import',
    },
    sessions: {
      root: '/api/sessions',
      today: '/api/sessions/today',
    },
    attendance: {
      offlineSync: '/api/attendance/offline-sync',
      reports: '/api/attendance/reports',
    },
    payments: {
      root: '/api/payments',
      summary: '/api/payments/summary',
      overdue: '/api/payments/overdue',
      remind: '/api/payments/remind',
    },
    notifications: {
      send: '/api/notifications/send',
      logs: '/api/notifications/logs',
    },
    schedule: {
      week: '/api/schedule/week',
      conflicts: '/api/schedule/conflicts',
    },
    dashboard: {
      center: '/api/dashboard/center',
      teacher: '/api/dashboard/teacher',
      student: '/api/dashboard/student',
      parent: '/api/dashboard/parent',
    },
    public: {
      register: '/api/public/register',
      groups: '/api/public/groups',
    },
  },
} as const

export type AppRoutes = typeof ROUTES
