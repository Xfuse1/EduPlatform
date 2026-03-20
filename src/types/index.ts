export type DayOfWeek =
  | 'saturday'
  | 'sunday'
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'

export type Plan = 'FREE' | 'BASIC' | 'PRO' | 'BUSINESS'

export type UserRole = 'TEACHER' | 'STUDENT' | 'PARENT' | 'ASSISTANT'

export type EnrollmentStatus = 'ACTIVE' | 'WAITLIST' | 'ARCHIVED' | 'DROPPED'

export type SessionStatus =
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'

export type SessionType = 'REGULAR' | 'MAKEUP' | 'EXTRA'

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED'

export type AttendanceMethod = 'MANUAL' | 'QR' | 'GPS' | 'CODE'

export type PaymentStatus = 'PAID' | 'PARTIAL' | 'PENDING' | 'OVERDUE'

export type PaymentMethod =
  | 'CASH'
  | 'VODAFONE_CASH'
  | 'FAWRY'
  | 'INSTAPAY'
  | 'CARD'

export type NotificationType =
  | 'ATTENDANCE_PRESENT'
  | 'ATTENDANCE_ABSENT'
  | 'PAYMENT_REMINDER'
  | 'PAYMENT_OVERDUE'
  | 'CLASS_REMINDER'
  | 'ANNOUNCEMENT'

export type NotificationChannel = 'SMS' | 'WHATSAPP' | 'PUSH'

export type NotificationStatus = 'QUEUED' | 'SENT' | 'DELIVERED' | 'FAILED'

export interface Tenant {
  id: string
  slug: string
  name: string
  plan: Plan
  planExpiresAt: Date | null
  logoUrl: string | null
  themeColor: string
  phone: string | null
  region: string | null
  bio: string | null
  subjects: string[]
  isActive: boolean
  smsQuota: number
  createdAt: Date
  updatedAt: Date
  users?: User[]
  groups?: Group[]
  sessions?: Session[]
  attendance?: Attendance[]
  payments?: Payment[]
  notifications?: Notification[]
}

export interface User {
  id: string
  tenantId: string
  phone: string
  name: string
  role: UserRole
  avatarUrl: string | null
  gradeLevel: string | null
  parentName: string | null
  parentPhone: string | null
  isActive: boolean
  lastLoginAt: Date | null
  createdAt: Date
  updatedAt: Date
  tenant?: Tenant
  enrollments?: GroupStudent[]
  attendanceRecords?: Attendance[]
  markedAttendance?: Attendance[]
  studentPayments?: Payment[]
  recordedPayments?: Payment[]
  sentNotifications?: Notification[]
  parentOf?: ParentStudent[]
  childOf?: ParentStudent[]
}

export interface ParentStudent {
  id: string
  parentId: string
  studentId: string
  relationship: string
  createdAt: Date
  parent?: User
  student?: User
}

export interface Group {
  id: string
  tenantId: string
  name: string
  subject: string
  gradeLevel: string
  days: string[]
  timeStart: string
  timeEnd: string
  room: string | null
  maxCapacity: number
  monthlyFee: number
  color: string
  isActive: boolean
  createdAt: Date
  updatedAt: Date
  tenant?: Tenant
  students?: GroupStudent[]
  sessions?: Session[]
  attendance?: Attendance[]
}

export interface GroupStudent {
  id: string
  groupId: string
  studentId: string
  status: EnrollmentStatus
  enrolledAt: Date
  droppedAt: Date | null
  group?: Group
  student?: User
}

export interface Session {
  id: string
  tenantId: string
  groupId: string
  date: Date
  timeStart: string
  timeEnd: string
  status: SessionStatus
  type: SessionType
  notes: string | null
  createdAt: Date
  tenant?: Tenant
  group?: Group
  attendance?: Attendance[]
}

export interface Attendance {
  id: string
  tenantId: string
  sessionId: string
  groupId: string
  studentId: string
  status: AttendanceStatus
  markedById: string | null
  method: AttendanceMethod
  markedAt: Date
  synced: boolean
  createdAt: Date
  tenant?: Tenant
  session?: Session
  group?: Group
  student?: User
  markedBy?: User | null
}

export interface Payment {
  id: string
  tenantId: string
  studentId: string
  amount: number
  month: string
  status: PaymentStatus
  method: PaymentMethod
  installmentNumber: number | null
  installmentTotal: number | null
  receiptNumber: string | null
  receiptUrl: string | null
  paidAt: Date | null
  recordedById: string | null
  notes: string | null
  createdAt: Date
  updatedAt: Date
  tenant?: Tenant
  student?: User
  recordedBy?: User | null
}

export interface Notification {
  id: string
  tenantId: string
  userId: string
  type: NotificationType
  message: string
  channel: NotificationChannel
  status: NotificationStatus
  recipientPhone: string
  sentAt: Date | null
  errorMessage: string | null
  retries: number
  createdAt: Date
  tenant?: Tenant
  user?: User
}

export interface OTP {
  id: string
  phone: string
  code: string
  expiresAt: Date
  used: boolean
  attempts: number
  createdAt: Date
}

export interface AuthSession {
  id: string
  userId: string
  tenantId: string
  token: string
  refreshToken: string
  expiresAt: Date
  createdAt: Date
}

export interface DashboardAlert {
  type: string
  message: string
  severity: 'low' | 'medium' | 'high'
  studentId?: string
}

export type Alert = DashboardAlert

export interface RevenueSummary {
  collected: number
  outstanding: number
  total: number
  collectionRate: number
}

export interface AttendanceRecord {
  studentId: string
  studentName: string
  status: AttendanceStatus
  paymentStatus: PaymentStatus
}

export interface StudentWithPaymentStatus {
  student: User
  paymentStatus: PaymentStatus
  attendanceRate: number
}

export interface TeacherDashboardData {
  revenue: {
    thisMonth: number
    lastMonth: number
    change: number
  }
  outstanding: {
    total: number
    count: number
  }
  students: {
    total: number
    new: number
  }
  attendance: {
    rate: number
    change: number
  }
  todaySessions: Session[]
  alerts: Alert[]
}

export interface ApiMeta {
  total: number
  page: number
}

export interface ApiResponse<T> {
  data: T
  meta?: ApiMeta
}

export interface ApiErrorPayload<TDetails = unknown> {
  code: string
  message: string
  details?: TDetails
}

export interface ApiError<TDetails = unknown> {
  error: ApiErrorPayload<TDetails>
}
