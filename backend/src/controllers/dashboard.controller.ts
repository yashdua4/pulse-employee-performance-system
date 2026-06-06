import { Request, Response } from 'express';
import { PrismaClient, Role, ProjectStatus, TaskStatus, AttendanceStatus, ReviewStatus, LeaveStatus } from '@prisma/client';

const prisma = new PrismaClient();

export const getDashboardStats = async (req: Request, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const { role, id: userId, employeeId } = req.user;

    if (role === Role.ADMIN) {
      // 1. ADMIN DASHBOARD STATS
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [
        totalEmployees,
        activeEmployees,
        activeProjects,
        pendingReviews,
        todayAttendance,
        departments,
        recentActivities
      ] = await Promise.all([
        prisma.employee.count({ where: { deletedAt: null } }),
        prisma.employee.count({ where: { employmentStatus: 'ACTIVE', deletedAt: null } }),
        prisma.project.count({ where: { status: 'IN_PROGRESS', deletedAt: null } }),
        prisma.performanceReview.count({ 
          where: { 
            status: 'DRAFT',
            reviewee: { deletedAt: null }
          } 
        }),
        prisma.attendance.findMany({
          where: { 
            date: today,
            employee: { deletedAt: null }
          },
        }),
        prisma.department.findMany({
          include: {
            _count: { 
              select: { 
                employees: { 
                  where: { deletedAt: null } 
                } 
              } 
            },
          },
        }),
        prisma.auditLog.findMany({
          take: 10,
          orderBy: { timestamp: 'desc' },
          include: {
            user: {
              select: { email: true, employee: { select: { name: true } } },
            },
          },
        })
      ]);

      const clockedInToday = todayAttendance.filter(a => a.status === AttendanceStatus.PRESENT || a.status === AttendanceStatus.LATE).length;
      const todayAttendanceRate = totalEmployees > 0 ? Math.round((clockedInToday / totalEmployees) * 100) : 0;

      return res.json({
        role,
        stats: {
          totalEmployees,
          activeEmployees,
          activeProjects,
          todayAttendanceRate,
          pendingReviews,
          clockedInToday,
        },
        departments: departments.map(d => ({
          name: d.name,
          count: d._count.employees,
        })),
        recentActivities,
      });

    } else if (role === Role.MANAGER && employeeId) {
      // 2. MANAGER DASHBOARD STATS
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const subordinates = await prisma.employee.findMany({
        where: { managerId: employeeId, deletedAt: null },
        select: { id: true, userId: true },
      });
      const subordinateIds = subordinates.map((s) => s.id);

      const [
        teamSize,
        assignedProjects,
        teamPendingReviews,
        teamReviews,
        teamAttendanceToday
      ] = await Promise.all([
        prisma.employee.count({ where: { managerId: employeeId, deletedAt: null } }),
        prisma.project.count({
          where: {
            deletedAt: null,
            OR: [
              { managerId: employeeId },
              { members: { some: { employeeId } } },
            ],
          },
        }),
        prisma.performanceReview.count({
          where: {
            revieweeId: { in: subordinateIds },
            status: 'DRAFT',
            reviewee: { deletedAt: null }
          },
        }),
        prisma.performanceReview.findMany({
          where: {
            revieweeId: { in: subordinateIds },
            status: { in: ['SUBMITTED', 'ACKNOWLEDGED'] },
            reviewee: { deletedAt: null }
          },
          select: { overallRating: true },
        }),
        prisma.attendance.findMany({
          where: {
            employeeId: { in: subordinateIds },
            date: today,
            employee: { deletedAt: null }
          },
        })
      ]);

      const teamPerformanceScore = teamReviews.length > 0
        ? Math.round((teamReviews.reduce((acc, r) => acc + r.overallRating, 0) / teamReviews.length) * 10) / 10
        : 0;

      const presentCount = teamAttendanceToday.filter(a => a.status === AttendanceStatus.PRESENT).length;
      const lateCount = teamAttendanceToday.filter(a => a.status === AttendanceStatus.LATE).length;
      const absentCount = teamSize - (presentCount + lateCount);

      return res.json({
        role,
        stats: {
          teamSize,
          assignedProjects,
          pendingReviews: teamPendingReviews,
          teamPerformanceScore,
          attendanceToday: {
            present: presentCount,
            late: lateCount,
            absent: absentCount >= 0 ? absentCount : 0,
          },
        },
      });

    } else if (employeeId) {
      // 3. EMPLOYEE DASHBOARD STATS
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const [
        attendanceToday,
        assignedProjectsCount,
        upcomingReviews,
        myReviews,
        notifications
      ] = await Promise.all([
        prisma.attendance.findUnique({
          where: {
            employeeId_date: { employeeId, date: today },
          },
          include: { logs: true },
        }),
        prisma.project.count({
          where: {
            deletedAt: null,
            members: { some: { employeeId } },
          },
        }),
        prisma.performanceReview.count({
          where: {
            revieweeId: employeeId,
            status: 'SUBMITTED',
          },
        }),
        prisma.performanceReview.findMany({
          where: {
            revieweeId: employeeId,
            status: { in: ['SUBMITTED', 'ACKNOWLEDGED'] },
          },
          select: { overallRating: true },
        }),
        prisma.notification.findMany({
          where: { userId },
          take: 5,
          orderBy: { createdAt: 'desc' },
        })
      ]);

      const performanceScore = myReviews.length > 0
        ? Math.round((myReviews.reduce((acc, r) => acc + r.overallRating, 0) / myReviews.length) * 10) / 10
        : 0;

      return res.json({
        role,
        stats: {
          assignedProjectsCount,
          upcomingReviews,
          performanceScore,
        },
        attendanceToday,
        notifications,
      });
    } else {
      return res.status(400).json({ message: 'User profile does not contain an employee record' });
    }
  } catch (error: any) {
    return res.status(500).json({ message: 'Error retrieving dashboard stats', error: error.message });
  }
};
