export const MOCK_TENANT = {
  id: "1",
  slug: "ahmed",
  name: "أ/ أحمد حسن",
  logoUrl: null,
  themeColor: "#1A5276",
  region: "المنصورة",
  bio: "مدرس رياضيات بخبرة عملية في المتابعة والواجبات والاختبارات الأسبوعية.",
  subjects: ["رياضيات", "قدرات", "مراجعات نهائية"],
  plan: "FREE" as const,
};

export type MockRole = "TEACHER" | "STUDENT" | "PARENT" | "ASSISTANT";

export type MockSessionUser = {
  id: string;
  tenantId: string;
  name: string;
  phone: string;
  role: MockRole;
};

export const MOCK_USERS: Record<MockRole, MockSessionUser> = {
  TEACHER: {
    id: "teacher-1",
    tenantId: MOCK_TENANT.id,
    name: "أ/ أحمد حسن",
    phone: "01000000000",
    role: "TEACHER",
  },
  STUDENT: {
    id: "student-1",
    tenantId: MOCK_TENANT.id,
    name: "محمد أحمد",
    phone: "01000000001",
    role: "STUDENT",
  },
  PARENT: {
    id: "parent-1",
    tenantId: MOCK_TENANT.id,
    name: "ولي أمر محمد",
    phone: "01000000002",
    role: "PARENT",
  },
  ASSISTANT: {
    id: "assistant-1",
    tenantId: MOCK_TENANT.id,
    name: "الأستاذة سارة",
    phone: "01000000003",
    role: "ASSISTANT",
  },
};

export const MOCK_PHONE_ROLE_MAP: Record<string, MockRole> = {
  "01000000000": "TEACHER",
  "01000000001": "STUDENT",
  "01000000002": "PARENT",
  "01000000003": "ASSISTANT",
};

export const MOCK_GROUPS = [
  {
    id: "group-1",
    name: "ثالثة ثانوي - الأحد والثلاثاء",
    subject: "رياضيات",
    gradeLevel: "الصف الثالث الثانوي",
    days: ["الأحد", "الثلاثاء"],
    timeStart: "06:00 PM",
    timeEnd: "08:00 PM",
    monthlyFee: 450,
    maxCapacity: 24,
    enrolledCount: 18,
    color: "#1A5276",
  },
  {
    id: "group-2",
    name: "ثانية ثانوي - السبت والأربعاء",
    subject: "رياضيات",
    gradeLevel: "الصف الثاني الثانوي",
    days: ["السبت", "الأربعاء"],
    timeStart: "04:00 PM",
    timeEnd: "05:30 PM",
    monthlyFee: 350,
    maxCapacity: 20,
    enrolledCount: 12,
    color: "#2E86C1",
  },
  {
    id: "group-3",
    name: "مراجعة القدرات - الجمعة",
    subject: "قدرات",
    gradeLevel: "عام",
    days: ["الجمعة"],
    timeStart: "02:00 PM",
    timeEnd: "04:00 PM",
    monthlyFee: 300,
    maxCapacity: 30,
    enrolledCount: 30,
    color: "#117A65",
  },
];

export const MOCK_STUDENTS = [
  {
    id: "student-1",
    name: "محمد أحمد",
    grade: "الصف الثالث الثانوي",
    group: "ثالثة ثانوي - الأحد والثلاثاء",
    paymentStatus: "PAID" as const,
    attendance: 92,
    amountDue: 0,
  },
  {
    id: "student-2",
    name: "منة الله خالد",
    grade: "الصف الثاني الثانوي",
    group: "ثانية ثانوي - السبت والأربعاء",
    paymentStatus: "OVERDUE" as const,
    attendance: 78,
    amountDue: 300,
  },
  {
    id: "student-3",
    name: "يوسف عمر",
    grade: "مراجعة القدرات",
    group: "مراجعة القدرات - الجمعة",
    paymentStatus: "PENDING" as const,
    attendance: 85,
    amountDue: 150,
  },
];

export const MOCK_ATTENDANCE_SESSIONS = [
  {
    id: "session-1",
    title: "ثانية ثانوي - الآن",
    group: MOCK_GROUPS[1].name,
    status: "IN_PROGRESS",
    timeStart: "04:00 PM",
    timeEnd: "05:30 PM",
    attended: 15,
    total: 18,
    remaining: "٤٥ دقيقة متبقية",
  },
  {
    id: "session-2",
    title: "ثالثة ثانوي - لاحقاً",
    group: MOCK_GROUPS[0].name,
    status: "SCHEDULED",
    timeStart: "06:00 PM",
    timeEnd: "08:00 PM",
    attended: 0,
    total: 24,
    remaining: "تبدأ خلال ساعة",
  },
  {
    id: "session-3",
    title: "مراجعة القدرات - منتهية",
    group: MOCK_GROUPS[2].name,
    status: "COMPLETED",
    timeStart: "02:00 PM",
    timeEnd: "04:00 PM",
    attended: 27,
    total: 30,
    remaining: "اكتملت الحصة",
  },
];

export const MOCK_PAYMENTS = [
  {
    id: "payment-1",
    studentName: "محمد أحمد",
    month: "مارس ٢٠٢٦",
    status: "PAID" as const,
    amount: 450,
  },
  {
    id: "payment-2",
    studentName: "منة الله خالد",
    month: "مارس ٢٠٢٦",
    status: "OVERDUE" as const,
    amount: 300,
  },
  {
    id: "payment-3",
    studentName: "يوسف عمر",
    month: "فبراير ٢٠٢٦",
    status: "PENDING" as const,
    amount: 150,
  },
];

export const MOCK_STUDENT_PROFILE = {
  id: MOCK_USERS.STUDENT.id,
  name: MOCK_USERS.STUDENT.name,
  gradeLevel: "الصف الثالث الثانوي",
  enrollments: [
    {
      group: {
        id: MOCK_GROUPS[0].id,
        name: MOCK_GROUPS[0].name,
        timeStart: MOCK_GROUPS[0].timeStart,
        timeEnd: MOCK_GROUPS[0].timeEnd,
        days: MOCK_GROUPS[0].days,
      },
    },
    {
      group: {
        id: MOCK_GROUPS[2].id,
        name: MOCK_GROUPS[2].name,
        timeStart: MOCK_GROUPS[2].timeStart,
        timeEnd: MOCK_GROUPS[2].timeEnd,
        days: MOCK_GROUPS[2].days,
      },
    },
  ],
};

export const MOCK_PARENT_CHILDREN = [
  {
    student: {
      id: MOCK_USERS.STUDENT.id,
      name: MOCK_USERS.STUDENT.name,
      gradeLevel: "الصف الثالث الثانوي",
      enrollments: [
        {
          group: {
            name: MOCK_GROUPS[0].name,
            days: MOCK_GROUPS[0].days,
            timeStart: MOCK_GROUPS[0].timeStart,
            timeEnd: MOCK_GROUPS[0].timeEnd,
          },
        },
      ],
    },
  },
];

export const MOCK_TODAY_SESSIONS = [
  {
    id: "session-today-1",
    timeStart: "04:00 PM",
    timeEnd: "05:30 PM",
    status: "IN_PROGRESS",
    group: { name: MOCK_GROUPS[1].name },
  },
  {
    id: "session-today-2",
    timeStart: "06:00 PM",
    timeEnd: "08:00 PM",
    status: "SCHEDULED",
    group: { name: MOCK_GROUPS[0].name },
  },
];

export const MOCK_STUDENT_NEXT_SESSION = {
  date: new Date("2026-03-18T18:00:00"),
  timeStart: "06:00 PM",
  timeEnd: "08:00 PM",
  group: { name: MOCK_GROUPS[0].name },
};

export const MOCK_PARENT_NEXT_SESSION = {
  date: new Date("2026-03-18T18:00:00"),
  timeStart: "06:00 PM",
  group: { name: MOCK_GROUPS[0].name },
};

export const MOCK_REVENUE_SUMMARY = {
  thisMonth: 18250,
  lastMonth: 16400,
  change: 11,
  outstanding: {
    total: 2150,
    count: 6,
  },
};

export const MOCK_PAYMENT_SNAPSHOT = {
  status: "PARTIAL",
  amount: 200,
};

export const MOCK_STUDENT_COUNT_SUMMARY = {
  total: 128,
  recent: 14,
};

export const MOCK_ATTENDANCE_OVERVIEW = {
  rate: 87,
  change: 4,
};

export const MOCK_STUDENT_ATTENDANCE = {
  rate: 92,
};

export const MOCK_TEACHER_ALERTS = [
  {
    id: "alert-1",
    amount: 450,
    student: { name: "سيف خالد" },
  },
  {
    id: "alert-2",
    amount: 300,
    student: { name: "منة الله أحمد" },
  },
  {
    id: "alert-3",
    amount: 500,
    student: { name: "يوسف عمر" },
  },
];

export function getMockUserByPhone(phone: string) {
  const role = MOCK_PHONE_ROLE_MAP[phone] ?? "TEACHER";
  return MOCK_USERS[role];
}

export function getMockUserByToken(token?: string | null) {
  if (!token) {
    return MOCK_USERS.TEACHER;
  }

  const role = token.replace("mock-session-", "") as MockRole;
  return MOCK_USERS[role] ?? MOCK_USERS.TEACHER;
}
