"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    const tenant = await prisma.tenant.upsert({
        where: { slug: "ahmed" },
        update: {
            name: "أ/ أحمد حسن",
            plan: "PRO",
            phone: "01000000000",
            region: "الجيزة",
            bio: "مركز تعليمي متخصص في الرياضيات والعلوم للمرحلة الإعدادية والثانوية.",
            subjects: ["الرياضيات", "العلوم"],
            isActive: true,
        },
        create: {
            slug: "ahmed",
            name: "أ/ أحمد حسن",
            plan: "PRO",
            phone: "01000000000",
            region: "الجيزة",
            bio: "مركز تعليمي متخصص في الرياضيات والعلوم للمرحلة الإعدادية والثانوية.",
            subjects: ["الرياضيات", "العلوم"],
            isActive: true,
        },
    });
    const teacher = await prisma.user.upsert({
        where: {
            tenantId_phone: {
                tenantId: tenant.id,
                phone: "01000000000",
            },
        },
        update: {
            name: "أحمد حسن",
            role: "TEACHER",
            isActive: true,
        },
        create: {
            tenantId: tenant.id,
            phone: "01000000000",
            name: "أحمد حسن",
            role: "TEACHER",
            isActive: true,
        },
    });
    const student = await prisma.user.upsert({
        where: {
            tenantId_phone: {
                tenantId: tenant.id,
                phone: "01000000001",
            },
        },
        update: {
            name: "محمد خالد",
            role: "STUDENT",
            gradeLevel: "الصف الثالث الإعدادي",
            isActive: true,
        },
        create: {
            tenantId: tenant.id,
            phone: "01000000001",
            name: "محمد خالد",
            role: "STUDENT",
            gradeLevel: "الصف الثالث الإعدادي",
            isActive: true,
        },
    });
    const parent = await prisma.user.upsert({
        where: {
            tenantId_phone: {
                tenantId: tenant.id,
                phone: "01000000002",
            },
        },
        update: {
            name: "خالد محمد",
            role: "PARENT",
            parentName: "ولي أمر محمد خالد",
            parentPhone: "01000000002",
            isActive: true,
        },
        create: {
            tenantId: tenant.id,
            phone: "01000000002",
            name: "خالد محمد",
            role: "PARENT",
            parentName: "ولي أمر محمد خالد",
            parentPhone: "01000000002",
            isActive: true,
        },
    });
    await prisma.parentStudent.upsert({
        where: {
            parentId_studentId: {
                parentId: parent.id,
                studentId: student.id,
            },
        },
        update: {
            relationship: "father",
        },
        create: {
            parentId: parent.id,
            studentId: student.id,
            relationship: "father",
        },
    });
    const groupOne = await prisma.group.upsert({
        where: { id: "group-ahmed-math" },
        update: {
            tenantId: tenant.id,
            name: "مجموعة الرياضيات المتقدمة",
            subject: "الرياضيات",
            gradeLevel: "الصف الثالث الإعدادي",
            days: ["السبت", "الثلاثاء"],
            timeStart: "16:00",
            timeEnd: "18:00",
            room: "قاعة 1",
            monthlyFee: 350,
            isActive: true,
        },
        create: {
            id: "group-ahmed-math",
            tenantId: tenant.id,
            name: "مجموعة الرياضيات المتقدمة",
            subject: "الرياضيات",
            gradeLevel: "الصف الثالث الإعدادي",
            days: ["السبت", "الثلاثاء"],
            timeStart: "16:00",
            timeEnd: "18:00",
            room: "قاعة 1",
            monthlyFee: 350,
            isActive: true,
        },
    });
    const groupTwo = await prisma.group.upsert({
        where: { id: "group-ahmed-science" },
        update: {
            tenantId: tenant.id,
            name: "مجموعة العلوم الشاملة",
            subject: "العلوم",
            gradeLevel: "الصف الثالث الإعدادي",
            days: ["الأحد", "الأربعاء"],
            timeStart: "18:30",
            timeEnd: "20:00",
            room: "قاعة 2",
            monthlyFee: 300,
            isActive: true,
        },
        create: {
            id: "group-ahmed-science",
            tenantId: tenant.id,
            name: "مجموعة العلوم الشاملة",
            subject: "العلوم",
            gradeLevel: "الصف الثالث الإعدادي",
            days: ["الأحد", "الأربعاء"],
            timeStart: "18:30",
            timeEnd: "20:00",
            room: "قاعة 2",
            monthlyFee: 300,
            isActive: true,
        },
    });
    await prisma.groupStudent.upsert({
        where: {
            groupId_studentId: {
                groupId: groupOne.id,
                studentId: student.id,
            },
        },
        update: {
            status: "ACTIVE",
            droppedAt: null,
        },
        create: {
            groupId: groupOne.id,
            studentId: student.id,
            status: "ACTIVE",
        },
    });
    await prisma.groupStudent.upsert({
        where: {
            groupId_studentId: {
                groupId: groupTwo.id,
                studentId: student.id,
            },
        },
        update: {
            status: "ACTIVE",
            droppedAt: null,
        },
        create: {
            groupId: groupTwo.id,
            studentId: student.id,
            status: "ACTIVE",
        },
    });
    const sessionOneDate = new Date("2026-03-10T00:00:00.000Z");
    const sessionTwoDate = new Date("2026-03-12T00:00:00.000Z");
    const sessionOne = await prisma.session.upsert({
        where: {
            groupId_date: {
                groupId: groupOne.id,
                date: sessionOneDate,
            },
        },
        update: {
            tenantId: tenant.id,
            timeStart: "16:00",
            timeEnd: "18:00",
            status: "COMPLETED",
            type: "REGULAR",
            notes: "مراجعة على الجبر والمعادلات.",
        },
        create: {
            tenantId: tenant.id,
            groupId: groupOne.id,
            date: sessionOneDate,
            timeStart: "16:00",
            timeEnd: "18:00",
            status: "COMPLETED",
            type: "REGULAR",
            notes: "مراجعة على الجبر والمعادلات.",
        },
    });
    const sessionTwo = await prisma.session.upsert({
        where: {
            groupId_date: {
                groupId: groupTwo.id,
                date: sessionTwoDate,
            },
        },
        update: {
            tenantId: tenant.id,
            timeStart: "18:30",
            timeEnd: "20:00",
            status: "COMPLETED",
            type: "REGULAR",
            notes: "شرح عملي لدرس الجهاز الدوري.",
        },
        create: {
            tenantId: tenant.id,
            groupId: groupTwo.id,
            date: sessionTwoDate,
            timeStart: "18:30",
            timeEnd: "20:00",
            status: "COMPLETED",
            type: "REGULAR",
            notes: "شرح عملي لدرس الجهاز الدوري.",
        },
    });
    await prisma.payment.upsert({
        where: { receiptNumber: "REC-AHMED-001" },
        update: {
            tenantId: tenant.id,
            studentId: student.id,
            amount: 350,
            month: "2026-03",
            status: "PAID",
            method: "CASH",
            paidAt: new Date("2026-03-05T12:00:00.000Z"),
            recordedById: teacher.id,
            notes: "سداد اشتراك مجموعة الرياضيات.",
        },
        create: {
            tenantId: tenant.id,
            studentId: student.id,
            amount: 350,
            month: "2026-03",
            status: "PAID",
            method: "CASH",
            receiptNumber: "REC-AHMED-001",
            paidAt: new Date("2026-03-05T12:00:00.000Z"),
            recordedById: teacher.id,
            notes: "سداد اشتراك مجموعة الرياضيات.",
        },
    });
    await prisma.payment.upsert({
        where: { receiptNumber: "REC-AHMED-002" },
        update: {
            tenantId: tenant.id,
            studentId: student.id,
            amount: 300,
            month: "2026-03",
            status: "PARTIAL",
            method: "INSTAPAY",
            recordedById: teacher.id,
            notes: "دفعة أولى لمجموعة العلوم.",
        },
        create: {
            tenantId: tenant.id,
            studentId: student.id,
            amount: 300,
            month: "2026-03",
            status: "PARTIAL",
            method: "INSTAPAY",
            receiptNumber: "REC-AHMED-002",
            recordedById: teacher.id,
            notes: "دفعة أولى لمجموعة العلوم.",
        },
    });
    await prisma.attendance.upsert({
        where: {
            sessionId_studentId: {
                sessionId: sessionOne.id,
                studentId: student.id,
            },
        },
        update: {
            tenantId: tenant.id,
            groupId: groupOne.id,
            status: "PRESENT",
            markedById: teacher.id,
            method: "MANUAL",
            synced: true,
        },
        create: {
            tenantId: tenant.id,
            sessionId: sessionOne.id,
            groupId: groupOne.id,
            studentId: student.id,
            status: "PRESENT",
            markedById: teacher.id,
            method: "MANUAL",
            synced: true,
        },
    });
    await prisma.attendance.upsert({
        where: {
            sessionId_studentId: {
                sessionId: sessionTwo.id,
                studentId: student.id,
            },
        },
        update: {
            tenantId: tenant.id,
            groupId: groupTwo.id,
            status: "LATE",
            markedById: teacher.id,
            method: "MANUAL",
            synced: true,
        },
        create: {
            tenantId: tenant.id,
            sessionId: sessionTwo.id,
            groupId: groupTwo.id,
            studentId: student.id,
            status: "LATE",
            markedById: teacher.id,
            method: "MANUAL",
            synced: true,
        },
    });
    // Seed default subscription plans
    await prisma.subscriptionPlanConfig.upsert({
        where: { key: "STARTER" },
        update: {
            name: "البداية",
            monthlyPrice: 200,
            yearlyPrice: 2000,
            studentsLimit: 20,
            groupsLimit: 2,
            sessionsLimit: 100,
            storageLimit: 100,
            isActive: true,
            deletedAt: null,
        },
        create: {
            key: "STARTER",
            plan: "STARTER",
            name: "البداية",
            monthlyPrice: 200,
            yearlyPrice: 2000,
            studentsLimit: 20,
            groupsLimit: 2,
            sessionsLimit: 100,
            storageLimit: 100,
            isActive: true,
        },
    });
    await prisma.subscriptionPlanConfig.upsert({
        where: { key: "PROFESSIONAL" },
        update: {
            name: "الاحترافية",
            monthlyPrice: 500,
            yearlyPrice: 5000,
            studentsLimit: 100,
            groupsLimit: 10,
            sessionsLimit: 1000,
            storageLimit: 1000,
            isActive: true,
            deletedAt: null,
        },
        create: {
            key: "PROFESSIONAL",
            plan: "PROFESSIONAL",
            name: "الاحترافية",
            monthlyPrice: 500,
            yearlyPrice: 5000,
            studentsLimit: 100,
            groupsLimit: 10,
            sessionsLimit: 1000,
            storageLimit: 1000,
            isActive: true,
        },
    });
    await prisma.subscriptionPlanConfig.upsert({
        where: { key: "ENTERPRISE" },
        update: {
            name: "المؤسسات",
            monthlyPrice: 0,
            yearlyPrice: 0,
            studentsLimit: 9999,
            groupsLimit: 9999,
            sessionsLimit: 9999,
            storageLimit: 9999,
            isActive: true,
            deletedAt: null,
        },
        create: {
            key: "ENTERPRISE",
            plan: "ENTERPRISE",
            name: "المؤسسات",
            monthlyPrice: 0,
            yearlyPrice: 0,
            studentsLimit: 9999,
            groupsLimit: 9999,
            sessionsLimit: 9999,
            storageLimit: 9999,
            isActive: true,
        },
    });
    console.log("Seed completed for tenant:", tenant.slug);
}
main()
    .catch((error) => {
    console.error(error);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
