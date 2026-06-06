import { 
  PrismaClient, 
  Role, 
  EmploymentStatus, 
  ProjectStatus, 
  ProjectPriority, 
  TaskStatus, 
  AttendanceStatus, 
  ReviewStatus, 
  LeaveType, 
  LeaveStatus 
} from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding SaaS database with complete Demo Dataset...');

  // Clean existing data in reverse dependency order
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.leaveRequest.deleteMany();
  await prisma.performanceReview.deleteMany();
  await prisma.attendanceLog.deleteMany();
  await prisma.attendance.deleteMany();
  await prisma.task.deleteMany();
  await prisma.projectMember.deleteMany();
  await prisma.project.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();

  // 1. Create 5 Departments
  const deptEngineering = await prisma.department.create({
    data: { name: 'Engineering', description: 'Core software design, coding, scaling, and system operations.', allowedIps: '127.0.0.1,::1' },
  });
  const deptMarketing = await prisma.department.create({
    data: { name: 'Marketing', description: 'Brand expansion, corporate events, and client outreach.' },
  });
  const deptHR = await prisma.department.create({
    data: { name: 'Human Resources', description: 'Personnel onboarding, benefit portfolios, and workplace health.' },
  });
  const deptFinance = await prisma.department.create({
    data: { name: 'Finance', description: 'Budget mapping, salaries payroll processing, and audit compliance.' },
  });
  const deptSales = await prisma.department.create({
    data: { name: 'Sales', description: 'Client acquisition, subscription agreements, and SaaS growth.' },
  });

  console.log('5 Departments seeded.');

  // Password Hash
  const passwordHash = await bcrypt.hash('password123', 10);

  // Helper to create User & Employee in one go
  const createStaff = async (
    email: string, 
    name: string, 
    role: Role, 
    departmentId: string, 
    designation: string, 
    contactNumber: string,
    managerId?: string,
    joiningDate: Date = new Date('2025-01-01')
  ) => {
    const user = await prisma.user.create({
      data: {
        email,
        password: passwordHash,
        role,
      }
    });

    const employee = await prisma.employee.create({
      data: {
        userId: user.id,
        name,
        departmentId,
        designation,
        contactNumber,
        employmentStatus: EmploymentStatus.ACTIVE,
        dateOfJoining: joiningDate,
        managerId: managerId || null,
        casualBalance: 15,
        sickBalance: 10,
        earnedBalance: 20,
      }
    });

    return { user, employee };
  };

  // 2. Create exactly 20 Employees
  // 3 Primary Demo Accounts
  const adminDemo = await createStaff(
    'admin@pulse.com',
    'Sarah Jenkins',
    Role.ADMIN,
    deptEngineering.id,
    'VP of Technology',
    '+1 (555) 019-2831',
    undefined,
    new Date('2023-06-15')
  );

  const managerDemo = await createStaff(
    'manager@pulse.com',
    'Marcus Vance',
    Role.MANAGER,
    deptEngineering.id,
    'Engineering Manager',
    '+1 (555) 014-9283',
    adminDemo.employee.id,
    new Date('2024-03-01')
  );

  const employeeDemo = await createStaff(
    'employee@pulse.com',
    'Alex Rivera',
    Role.EMPLOYEE,
    deptEngineering.id,
    'Senior Backend Engineer',
    '+1 (555) 012-3849',
    managerDemo.employee.id,
    new Date('2025-01-10')
  );

  // Remaining managers for other departments (4 more managers)
  const mktManager = await createStaff(
    'mkt.mgr@pulse.com',
    'Liam Miller',
    Role.MANAGER,
    deptMarketing.id,
    'Marketing Director',
    '+1 (555) 018-1111',
    adminDemo.employee.id,
    new Date('2024-05-15')
  );

  const hrManager = await createStaff(
    'hr.mgr@pulse.com',
    'Sophia Davis',
    Role.MANAGER,
    deptHR.id,
    'Chief People Officer',
    '+1 (555) 018-2222',
    adminDemo.employee.id,
    new Date('2024-07-20')
  );

  const finManager = await createStaff(
    'fin.mgr@pulse.com',
    'Jackson Martinez',
    Role.MANAGER,
    deptFinance.id,
    'Finance VP',
    '+1 (555) 018-3333',
    adminDemo.employee.id,
    new Date('2024-09-01')
  );

  const salesManager = await createStaff(
    'sales.mgr@pulse.com',
    'Olivia Wilson',
    Role.MANAGER,
    deptSales.id,
    'VP of Sales',
    '+1 (555) 018-4444',
    adminDemo.employee.id,
    new Date('2024-11-10')
  );

  // 13 more employees across departments
  const staff = [];
  const staffPool = [
    { name: 'Emma Anderson', email: 'emma@pulse.com', title: 'Fullstack Dev', dept: deptEngineering, mgr: managerDemo },
    { name: 'Noah Taylor', email: 'noah@pulse.com', title: 'QA Specialist', dept: deptEngineering, mgr: managerDemo },
    { name: 'Charlotte Clark', email: 'charlotte@pulse.com', title: 'UI/UX Lead', dept: deptEngineering, mgr: managerDemo },
    { name: 'Daniel Lewis', email: 'daniel@pulse.com', title: 'Frontend Engineer', dept: deptEngineering, mgr: managerDemo },
    
    { name: 'Ava Thomas', email: 'ava@pulse.com', title: 'Content Manager', dept: deptMarketing, mgr: mktManager },
    { name: 'Lucas Moore', email: 'lucas@pulse.com', title: 'SEO Lead', dept: deptMarketing, mgr: mktManager },
    
    { name: 'Isabella Garcia', email: 'isabella@pulse.com', title: 'HR Manager', dept: deptHR, mgr: hrManager },
    { name: 'Mason Martin', email: 'mason@pulse.com', title: 'Talent Sourcer', dept: deptHR, mgr: hrManager },
    
    { name: 'Mia Jackson', email: 'mia@pulse.com', title: 'Controller', dept: deptFinance, mgr: finManager },
    { name: 'Jacob Lee', email: 'jacob@pulse.com', title: 'Auditor', dept: deptFinance, mgr: finManager },
    
    { name: 'Sophia Gonzalez', email: 'sophia@pulse.com', title: 'Enterprise AE', dept: deptSales, mgr: salesManager },
    { name: 'Alexander Harris', email: 'alexander@pulse.com', title: 'Sales Rep', dept: deptSales, mgr: salesManager },
    { name: 'Abigail Robinson', email: 'abigail@pulse.com', title: 'BDR Specialist', dept: deptSales, mgr: salesManager },
  ];

  for (let i = 0; i < staffPool.length; i++) {
    const s = staffPool[i];
    const created = await createStaff(
      s.email,
      s.name,
      Role.EMPLOYEE,
      s.dept.id,
      s.title,
      `+1 (555) 018-99${i}`,
      s.mgr.employee.id,
      new Date('2025-02-01')
    );
    staff.push(created);
  }

  const allEmployees = [
    adminDemo.employee,
    managerDemo.employee,
    employeeDemo.employee,
    mktManager.employee,
    hrManager.employee,
    finManager.employee,
    salesManager.employee,
    ...staff.map(s => s.employee)
  ];

  console.log(`Exactly ${allEmployees.length} Employee profiles seeded.`);

  // 3. Create exactly 10 Projects
  const projectPool = [
    { name: 'Pulse SaaS Platform Expansion', desc: 'Building multi-tenant enterprise architectures, audit log systems, and security layers.', dept: deptEngineering, mgr: managerDemo },
    { name: 'Alpha Mobile Client Scaffold', desc: 'Scaffolding React Native applications for mobile check-ins and performance tracking.', dept: deptEngineering, mgr: managerDemo },
    { name: 'Q3 Brand Awareness Drive', desc: 'Global marketing campaigns, webinars, and technical community outreach.', dept: deptMarketing, mgr: mktManager },
    { name: 'SEO Optimization Initiative', desc: 'Improving organic search performance and scaling marketing leads.', dept: deptMarketing, mgr: mktManager },
    { name: 'Benefits Package Review 2026', desc: 'Updating employee health packages and remote workspace allowances.', dept: deptHR, mgr: hrManager },
    { name: 'Global Recruiter Drive', desc: 'Sourcing tech talents across EU and APAC regions.', dept: deptHR, mgr: hrManager },
    { name: 'Cost Allocation Audit', desc: 'Migrating internal accounting to cloud accounting ledger.', dept: deptFinance, mgr: finManager },
    { name: 'Pre-Series B Valuation Audit', desc: 'Assembling transaction ledger sheets for investor review.', dept: deptFinance, mgr: finManager },
    { name: 'APAC Sales Runway Strategy', desc: 'Establishing sales offices in Singapore and Sydney.', dept: deptSales, mgr: salesManager },
    { name: 'Partner API Integration Sync', desc: 'Integrating billing APIs for global SaaS distributors.', dept: deptSales, mgr: salesManager },
  ];

  const projects = [];
  for (let i = 0; i < projectPool.length; i++) {
    const p = projectPool[i];
    const proj = await prisma.project.create({
      data: {
        name: p.name,
        description: p.desc,
        startDate: new Date('2026-05-01'),
        status: i % 3 === 0 ? ProjectStatus.COMPLETED : i % 2 === 0 ? ProjectStatus.IN_PROGRESS : ProjectStatus.NOT_STARTED,
        priority: i % 4 === 0 ? ProjectPriority.CRITICAL : ProjectPriority.HIGH,
        managerId: p.mgr.employee.id,
      }
    });
    projects.push(proj);
  }

  // Link members to the first project
  await prisma.projectMember.createMany({
    data: [
      { projectId: projects[0].id, employeeId: employeeDemo.employee.id, roleInProject: 'Lead DB Designer' },
      { projectId: projects[0].id, employeeId: staff[0].employee.id, roleInProject: 'Frontend Dev' },
      { projectId: projects[0].id, employeeId: staff[1].employee.id, roleInProject: 'QA Lead' },
    ]
  });

  console.log('10 Projects and members seeded.');

  // Create tasks
  await prisma.task.create({
    data: {
      projectId: projects[0].id,
      title: 'Database Schema Migrations',
      description: 'Run schema updates for leave balances and whitelisting constraints.',
      status: TaskStatus.DONE,
      dueDate: new Date('2026-06-01'),
      assigneeId: employeeDemo.employee.id,
    }
  });

  await prisma.task.create({
    data: {
      projectId: projects[0].id,
      title: 'Build SVG Chart Dashboards',
      description: 'Integrate SVG trend graphs into Dashboard pages.',
      status: TaskStatus.IN_PROGRESS,
      dueDate: new Date('2026-06-15'),
      assigneeId: staff[0].employee.id,
    }
  });

  // 4. Create exactly 50 Attendance Records
  // We loop over 10 employees for 5 days of history to get exactly 50 records
  const pastDates = [
    new Date('2026-06-01'),
    new Date('2026-06-02'),
    new Date('2026-06-03'),
    new Date('2026-06-04'),
    new Date('2026-06-05'),
  ];

  const attendanceEmployees = allEmployees.slice(1, 11); // Take Marcus, Alex, and 8 others
  let attendanceCount = 0;

  for (const date of pastDates) {
    for (const emp of attendanceEmployees) {
      const isLate = Math.random() > 0.85;
      const clockIn = new Date(date);
      clockIn.setHours(isLate ? 10 : 8, isLate ? 15 : 45 + Math.round(Math.random() * 20), 0);
      const clockOut = new Date(date);
      clockOut.setHours(17, Math.round(Math.random() * 30), 0);

      const hours = Math.round(( (clockOut.getTime() - clockIn.getTime()) / (1000 * 60 * 60) ) * 100) / 100;

      const record = await prisma.attendance.create({
        data: {
          employeeId: emp.id,
          date: new Date(date.setHours(0, 0, 0, 0)),
          clockIn,
          clockOut,
          status: isLate ? AttendanceStatus.LATE : AttendanceStatus.PRESENT,
          workHours: hours,
        }
      });

      await prisma.attendanceLog.createMany({
        data: [
          { attendanceId: record.id, action: 'CLOCK_IN', timestamp: clockIn, ipAddress: '127.0.0.1' },
          { attendanceId: record.id, action: 'CLOCK_OUT', timestamp: clockOut, ipAddress: '127.0.0.1' },
        ]
      });

      attendanceCount++;
    }
  }

  console.log(`${attendanceCount} Attendance entries and logs seeded.`);

  // 5. Create exactly 20 Performance Reviews
  // We'll write reviews evaluating various employees to get exactly 20 reviews
  let reviewCount = 0;
  
  // Review employeeDemo by managerDemo
  for (const period of ['Q1 2025', 'Q2 2025', 'Q3 2025', 'Q4 2025', 'Q1 2026']) {
    await prisma.performanceReview.create({
      data: {
        revieweeId: employeeDemo.employee.id,
        reviewerId: managerDemo.employee.id,
        period,
        technicalSkills: 4 + Math.round(Math.random()),
        communication: 4,
        teamwork: 4,
        problemSolving: 5,
        leadership: 3,
        overallRating: 4.2,
        feedback: 'Demonstrates exceptional capabilities in backend architectures.',
        goals: JSON.stringify(['Implement new features', 'Secure token scopes']),
        status: ReviewStatus.ACKNOWLEDGED,
      }
    });
    reviewCount++;
  }

  // Generate 15 more reviews for other employees
  const reviewPool = allEmployees.slice(3, 18); // Take 15 employees
  for (const emp of reviewPool) {
    await prisma.performanceReview.create({
      data: {
        revieweeId: emp.id,
        reviewerId: managerDemo.employee.id,
        period: 'Q1 2026',
        technicalSkills: 3 + Math.round(Math.random() * 2),
        communication: 3 + Math.round(Math.random() * 2),
        teamwork: 3 + Math.round(Math.random() * 2),
        problemSolving: 3 + Math.round(Math.random() * 2),
        leadership: 3 + Math.round(Math.random() * 2),
        overallRating: 3.5 + Math.round(Math.random() * 1.5 * 10) / 10,
        feedback: 'Performance aligns with corporate metrics. Focus on skill improvements.',
        goals: JSON.stringify(['Expand domain knowledge', 'Increase task output']),
        status: ReviewStatus.SUBMITTED,
      }
    });
    reviewCount++;
  }

  console.log(`${reviewCount} Performance reviews seeded.`);

  // 6. Create exactly 10 Leave Requests
  let leaveCount = 0;
  const leaveTypesList = [LeaveType.CASUAL, LeaveType.SICK, LeaveType.EARNED, LeaveType.WFH];
  const leaveStatusList = [LeaveStatus.APPROVED, LeaveStatus.PENDING, LeaveStatus.REJECTED];

  for (let i = 0; i < 10; i++) {
    const emp = allEmployees[2 + (i % 8)]; // EmployeeDemo and others
    const status = leaveStatusList[i % 3];
    await prisma.leaveRequest.create({
      data: {
        employeeId: emp.id,
        leaveType: leaveTypesList[i % 4],
        startDate: new Date(`2026-07-0${1 + i}`),
        endDate: new Date(`2026-07-0${3 + i}`),
        reason: 'Personal leave request simulation.',
        status,
        approverId: status !== LeaveStatus.PENDING ? managerDemo.employee.id : null,
      }
    });
    leaveCount++;
  }

  console.log(`${leaveCount} Leave requests seeded.`);

  // 7. Create exactly 30 Notifications
  let notificationCount = 0;
  const userIds = [adminDemo.user.id, managerDemo.user.id, employeeDemo.user.id];

  for (let i = 0; i < 30; i++) {
    const userId = userIds[i % 3];
    await prisma.notification.create({
      data: {
        userId,
        title: `Mock Notification Alert #${i + 1}`,
        message: `System message regarding tasks, reviews, and leaves updates for demonstrate role flow.`,
        type: i % 2 === 0 ? 'PROJECT_ASSIGNMENT' : 'LEAVE_APPROVAL',
        isRead: i % 3 === 0,
      }
    });
    notificationCount++;
  }

  console.log(`${notificationCount} Notifications seeded.`);

  // 8. Create Audit Logs
  await prisma.auditLog.create({
    data: {
      userId: adminDemo.user.id,
      action: 'SYSTEM_SEED',
      previousValue: null,
      newValue: JSON.stringify({ message: 'Seeded exactly 20 employees, 10 projects, 50 attendance logs, 20 reviews, and 10 leaves.' }),
    }
  });

  console.log('SaaS seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
