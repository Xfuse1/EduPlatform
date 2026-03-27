export type DayOfWeek =
  | 'saturday'
  | 'sunday'
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'

export type Plan = 'FREE' | 'BASIC' | 'PRO' | 'BUSINESS'

export type UserRole =
  | 'CENTER_ADMIN'
  | 'TEACHER'
  | 'STUDENT'
  | 'PARENT'
  | 'ASSISTANT'

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
  email: string | null
  subject: string | null
  bio: string | null
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

export interface CenterDashboardSummary {
  revenueCollected: number
  outstandingAmount: number
  attendanceRate: number
  activeTeachers: number
  activeStudents: number
  liveSessions: number
}

export interface TeacherDashboardSummary {
  todaySessions: number
  attendanceRate: number
  overdueAmount: number
  activeStudents: number
}

export interface StudentDashboardSummary {
  attendanceRate: number
  homeworkCompletion: number
  outstandingAmount: number
  streakLabel: string
}

export interface ParentDashboardSummary {
  childrenCount: number
  averageAttendanceRate: number
  outstandingAmount: number
  unreadAlerts: number
}

export interface LiveAttendanceFeedItem {
  id: string
  sessionName: string
  groupName: string
  timeLabel: string
  status: SessionStatus | 'LIVE'
  attendedCount: number
  totalCount: number
}

export interface InvoiceSummary {
  id: string
  invoiceNumber: string
  studentName?: string
  amount: number
  dueDateLabel: string
  status: PaymentStatus
  description: string
}

export interface PerformanceSnapshot {
  studentId: string
  studentName: string
  attendanceRate: number
  homeworkCompletion: number
  note: string
}

export interface Announcement {
  id: string
  title: string
  description: string
  audience: 'ALL' | 'TEACHERS' | 'STUDENTS' | 'PARENTS'
  createdAtLabel: string
  status: 'DRAFT' | 'SENT'
}

export interface ConversationThread {
  id: string
  title: string
  counterpart: string
  lastMessageAtLabel: string
  unreadCount: number
  messages: Array<{
    id: string
    sender: string
    role: UserRole | 'SYSTEM'
    body: string
    timeLabel: string
    isOwn: boolean
  }>
}

export interface Homework {
  id: string
  title: string
  description: string
  dueDateLabel: string
  subject: string
  status: 'DRAFT' | 'PUBLISHED' | 'CLOSED'
}

export interface HomeworkSubmission {
  id: string
  homeworkId: string
  studentId: string
  status: 'NOT_SUBMITTED' | 'SUBMITTED' | 'REVIEWED'
  submittedAtLabel?: string
}

export interface PerformanceAlert {
  id: string
  studentId: string
  title: string
  description: string
  severity: 'low' | 'medium' | 'high'
}

export interface MeetingRequest {
  id: string
  requestedBy: string
  studentName: string
  preferredSlotLabel: string
  status: 'PENDING' | 'CONFIRMED' | 'DECLINED'
}

export interface Room {
  id: string
  name: string
  capacity: number
  status: 'AVAILABLE' | 'BUSY' | 'MAINTENANCE'
}

export interface ScheduleException {
  id: string
  title: string
  dateLabel: string
  reason: string
  type: 'CANCELLED' | 'RESCHEDULED' | 'MAKEUP'
}

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

export interface ApiMeta {
  page?: number
  pageSize?: number
  total?: number
  [key: string]: string | number | boolean | null | undefined
}

export interface ApiResponse<T> {
  data: T
  meta?: ApiMeta
}

export interface ApiErrorDetails {
  [key: string]: unknown
}

export interface ApiError<TDetails = ApiErrorDetails> {
  error: {
    code: string
    message: string
    details?: TDetails
  }
}