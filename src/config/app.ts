export const APP_CONFIG = {
  name: 'EduPlatform',
  slogan: 'منصة تشغيل وإدارة للسناتر التعليمية',
  shortDescription:
    'لوحات تشغيل عربية أولًا لإدارة الحضور والتحصيل والمتابعة بين السنتر والمدرس والطالب وولي الأمر.',
  brand: {
    ink: '#132238',
    petrol: '#1A5276',
    teal: '#0F766E',
    amber: '#D39B21',
    sky: '#2E86C1',
    surface: '#F6F8FB',
  },
} as const

export const ROLE_LABELS = {
  SUPER_ADMIN: 'سوبر أدمن',
  CENTER_ADMIN: 'مدير السنتر',
  ADMIN: 'مدير تشغيل',
  MANAGER: 'مشرف',
  TEACHER: 'المدرس',
  STUDENT: 'الطالب',
  PARENT: 'ولي الأمر',
  ASSISTANT: 'المساعد',
} as const
