import type { RelativeDueSlot, StudentAssignmentStatus } from '@/lib/db/schema'

export interface DemoStudentProfile {
  college: string
  collegeName: string
  studentLabel: string
  portalUrl: string
}

export interface DemoAttendanceRecord {
  id: string
  college: string
  courseCode: string
  courseName: string
  faculty: string | null
  attendedClasses: number
  totalClasses: number
  minimumRequiredPct: number
  sortOrder: number
}

export interface DemoAssignmentRecord {
  id: string
  college: string
  courseCode: string
  courseName: string
  title: string
  description: string | null
  dueAt: Date | null
  relativeDueSlot: RelativeDueSlot | null
  status: StudentAssignmentStatus
  estimatedMinutes: number | null
  submissionPortalUrl: string | null
  sortOrder: number
}

export interface DemoTimetableRecord {
  id: string
  college: string
  dayOfWeek: number
  startTime: string
  endTime: string
  courseCode: string
  courseName: string
  sessionType: string
  room: string
  faculty: string | null
  sortOrder: number
}

export const DEMO_STUDENT_PROFILE: DemoStudentProfile = {
  college: 'sera-demo',
  collegeName: 'Sera Demo University (fictional)',
  studentLabel: 'Demo Student · B.Tech CSE, Semester 3, Section A',
  portalUrl: 'https://sera-demo.example/portal'
}

export const DEFAULT_DEMO_ATTENDANCE: readonly DemoAttendanceRecord[] = [
  {
    id: 'att_sera-demo_cs201',
    college: 'sera-demo',
    courseCode: 'CS201',
    courseName: 'Data Structures',
    faculty: 'Prof. Ananya Rao',
    attendedClasses: 32,
    totalClasses: 36,
    minimumRequiredPct: 75,
    sortOrder: 1
  },
  {
    id: 'att_sera-demo_ma203',
    college: 'sera-demo',
    courseCode: 'MA203',
    courseName: 'Discrete Mathematics',
    faculty: 'Dr. Vikram Sethi',
    attendedClasses: 25,
    totalClasses: 32,
    minimumRequiredPct: 75,
    sortOrder: 2
  },
  {
    id: 'att_sera-demo_cs205',
    college: 'sera-demo',
    courseCode: 'CS205',
    courseName: 'Computer Organisation',
    faculty: 'Prof. Rajesh Nair',
    attendedClasses: 20,
    totalClasses: 28,
    minimumRequiredPct: 75,
    sortOrder: 3
  },
  {
    id: 'att_sera-demo_cs207',
    college: 'sera-demo',
    courseCode: 'CS207',
    courseName: 'Object Oriented Programming',
    faculty: 'Dr. Meera Kulkarni',
    attendedClasses: 27,
    totalClasses: 32,
    minimumRequiredPct: 75,
    sortOrder: 4
  },
  {
    id: 'att_sera-demo_cs201l',
    college: 'sera-demo',
    courseCode: 'CS201L',
    courseName: 'Data Structures Lab',
    faculty: 'Prof. Ananya Rao',
    attendedClasses: 12,
    totalClasses: 13,
    minimumRequiredPct: 75,
    sortOrder: 5
  }
]

export const DEFAULT_DEMO_ASSIGNMENTS: readonly DemoAssignmentRecord[] = [
  {
    id: 'asg_sera-demo_ma203_ps4',
    college: 'sera-demo',
    courseCode: 'MA203',
    courseName: 'Discrete Mathematics',
    title: 'Problem Set 4: Graph Theory & Trees',
    description:
      'Proofs and traversal problems on spanning trees and bipartite graphs.',
    dueAt: null,
    relativeDueSlot: 'yesterday_night',
    status: 'submitted',
    estimatedMinutes: 45,
    submissionPortalUrl:
      'https://sera-demo.example/portal/assignments/ma203-ps4',
    sortOrder: 1
  },
  {
    id: 'asg_sera-demo_cs201l_lab5',
    college: 'sera-demo',
    courseCode: 'CS201L',
    courseName: 'Data Structures Lab',
    title: 'Lab 5: AVL Tree Implementation & Rotation Benchmarks',
    description:
      'Implement self-balancing AVL insert/delete in C++ and upload rotation timing plots.',
    dueAt: null,
    relativeDueSlot: 'before_friday_early',
    status: 'pending',
    estimatedMinutes: 90,
    submissionPortalUrl:
      'https://sera-demo.example/portal/assignments/cs201l-lab5',
    sortOrder: 2
  },
  {
    id: 'asg_sera-demo_cs205_hw3',
    college: 'sera-demo',
    courseCode: 'CS205',
    courseName: 'Computer Organisation',
    title: 'Assignment 3: Pipeline Hazard Analysis',
    description:
      'Resolve data and control hazards using forwarding and branch prediction diagrams.',
    dueAt: null,
    relativeDueSlot: 'before_friday_late',
    status: 'in_progress',
    estimatedMinutes: 60,
    submissionPortalUrl:
      'https://sera-demo.example/portal/assignments/cs205-hw3',
    sortOrder: 3
  },
  {
    id: 'asg_sera-demo_cs207_rep4',
    college: 'sera-demo',
    courseCode: 'CS207',
    courseName: 'Object Oriented Programming',
    title: 'Lab Report 4: Strategy & Observer Design Patterns',
    description:
      'Refactor the campus notification demo using Strategy and Observer interfaces with unit tests.',
    dueAt: null,
    relativeDueSlot: 'friday_evening',
    status: 'pending',
    estimatedMinutes: 60,
    submissionPortalUrl:
      'https://sera-demo.example/portal/assignments/cs207-rep4',
    sortOrder: 4
  },
  {
    id: 'asg_sera-demo_ma203_hw5',
    college: 'sera-demo',
    courseCode: 'MA203',
    courseName: 'Discrete Mathematics',
    title: 'Assignment 5: Recurrence Relations & Generating Functions',
    description:
      'Solve linear homogeneous recurrences and derive closed-form generating functions.',
    dueAt: null,
    relativeDueSlot: 'next_week',
    status: 'pending',
    estimatedMinutes: 75,
    submissionPortalUrl:
      'https://sera-demo.example/portal/assignments/ma203-hw5',
    sortOrder: 5
  }
]

export const DEFAULT_DEMO_TIMETABLE: readonly DemoTimetableRecord[] = [
  // Monday (1)
  {
    id: 'tt_sera-demo_1_1',
    college: 'sera-demo',
    dayOfWeek: 1,
    startTime: '09:00',
    endTime: '10:00',
    courseCode: 'CS201',
    courseName: 'Data Structures',
    sessionType: 'Lecture',
    room: 'Room LH-204',
    faculty: 'Prof. Ananya Rao',
    sortOrder: 1
  },
  {
    id: 'tt_sera-demo_1_2',
    college: 'sera-demo',
    dayOfWeek: 1,
    startTime: '10:15',
    endTime: '11:15',
    courseCode: 'MA203',
    courseName: 'Discrete Mathematics',
    sessionType: 'Lecture',
    room: 'Room LH-108',
    faculty: 'Dr. Vikram Sethi',
    sortOrder: 2
  },
  {
    id: 'tt_sera-demo_1_3',
    college: 'sera-demo',
    dayOfWeek: 1,
    startTime: '11:30',
    endTime: '12:30',
    courseCode: 'CS205',
    courseName: 'Computer Organisation',
    sessionType: 'Lecture',
    room: 'Room LH-204',
    faculty: 'Prof. Rajesh Nair',
    sortOrder: 3
  },
  {
    id: 'tt_sera-demo_1_4',
    college: 'sera-demo',
    dayOfWeek: 1,
    startTime: '14:00',
    endTime: '16:00',
    courseCode: 'CS201L',
    courseName: 'Data Structures Lab',
    sessionType: 'Lab',
    room: 'Programming Lab 2',
    faculty: 'Prof. Ananya Rao',
    sortOrder: 4
  },
  // Tuesday (2)
  {
    id: 'tt_sera-demo_2_1',
    college: 'sera-demo',
    dayOfWeek: 2,
    startTime: '09:00',
    endTime: '10:00',
    courseCode: 'CS207',
    courseName: 'Object Oriented Programming',
    sessionType: 'Lecture',
    room: 'Room LH-202',
    faculty: 'Dr. Meera Kulkarni',
    sortOrder: 1
  },
  {
    id: 'tt_sera-demo_2_2',
    college: 'sera-demo',
    dayOfWeek: 2,
    startTime: '10:15',
    endTime: '11:15',
    courseCode: 'CS205',
    courseName: 'Computer Organisation',
    sessionType: 'Lecture',
    room: 'Room LH-204',
    faculty: 'Prof. Rajesh Nair',
    sortOrder: 2
  },
  {
    id: 'tt_sera-demo_2_3',
    college: 'sera-demo',
    dayOfWeek: 2,
    startTime: '11:30',
    endTime: '12:30',
    courseCode: 'MA203',
    courseName: 'Discrete Mathematics',
    sessionType: 'Tutorial',
    room: 'Room TR-105',
    faculty: 'Dr. Vikram Sethi',
    sortOrder: 3
  },
  {
    id: 'tt_sera-demo_2_4',
    college: 'sera-demo',
    dayOfWeek: 2,
    startTime: '14:00',
    endTime: '15:30',
    courseCode: 'CS207',
    courseName: 'Object Oriented Programming',
    sessionType: 'Lab',
    room: 'Software Lab 1',
    faculty: 'Dr. Meera Kulkarni',
    sortOrder: 4
  },
  // Wednesday (3)
  {
    id: 'tt_sera-demo_3_1',
    college: 'sera-demo',
    dayOfWeek: 3,
    startTime: '09:00',
    endTime: '10:00',
    courseCode: 'CS201',
    courseName: 'Data Structures',
    sessionType: 'Lecture',
    room: 'Room LH-204',
    faculty: 'Prof. Ananya Rao',
    sortOrder: 1
  },
  {
    id: 'tt_sera-demo_3_2',
    college: 'sera-demo',
    dayOfWeek: 3,
    startTime: '10:15',
    endTime: '11:15',
    courseCode: 'CS207',
    courseName: 'Object Oriented Programming',
    sessionType: 'Lecture',
    room: 'Room LH-202',
    faculty: 'Dr. Meera Kulkarni',
    sortOrder: 2
  },
  {
    id: 'tt_sera-demo_3_3',
    college: 'sera-demo',
    dayOfWeek: 3,
    startTime: '11:30',
    endTime: '12:30',
    courseCode: 'CS205',
    courseName: 'Computer Organisation',
    sessionType: 'Tutorial',
    room: 'Room TR-102',
    faculty: 'Prof. Rajesh Nair',
    sortOrder: 3
  },
  {
    id: 'tt_sera-demo_3_4',
    college: 'sera-demo',
    dayOfWeek: 3,
    startTime: '15:00',
    endTime: '16:00',
    courseCode: 'MA203',
    courseName: 'Discrete Mathematics',
    sessionType: 'Lecture',
    room: 'Room LH-108',
    faculty: 'Dr. Vikram Sethi',
    sortOrder: 4
  },
  // Thursday (4)
  {
    id: 'tt_sera-demo_4_1',
    college: 'sera-demo',
    dayOfWeek: 4,
    startTime: '09:00',
    endTime: '10:00',
    courseCode: 'CS205',
    courseName: 'Computer Organisation',
    sessionType: 'Lecture',
    room: 'Room LH-204',
    faculty: 'Prof. Rajesh Nair',
    sortOrder: 1
  },
  {
    id: 'tt_sera-demo_4_2',
    college: 'sera-demo',
    dayOfWeek: 4,
    startTime: '10:15',
    endTime: '11:15',
    courseCode: 'CS201',
    courseName: 'Data Structures',
    sessionType: 'Lecture',
    room: 'Room LH-204',
    faculty: 'Prof. Ananya Rao',
    sortOrder: 2
  },
  {
    id: 'tt_sera-demo_4_3',
    college: 'sera-demo',
    dayOfWeek: 4,
    startTime: '11:30',
    endTime: '12:30',
    courseCode: 'MA203',
    courseName: 'Discrete Mathematics',
    sessionType: 'Lecture',
    room: 'Room LH-108',
    faculty: 'Dr. Vikram Sethi',
    sortOrder: 3
  },
  {
    id: 'tt_sera-demo_4_4',
    college: 'sera-demo',
    dayOfWeek: 4,
    startTime: '14:00',
    endTime: '16:00',
    courseCode: 'CS201L',
    courseName: 'Data Structures Lab',
    sessionType: 'Lab',
    room: 'Programming Lab 2',
    faculty: 'Prof. Ananya Rao',
    sortOrder: 4
  },
  // Friday (5)
  {
    id: 'tt_sera-demo_5_1',
    college: 'sera-demo',
    dayOfWeek: 5,
    startTime: '09:00',
    endTime: '10:00',
    courseCode: 'CS207',
    courseName: 'Object Oriented Programming',
    sessionType: 'Lecture',
    room: 'Room LH-202',
    faculty: 'Dr. Meera Kulkarni',
    sortOrder: 1
  },
  {
    id: 'tt_sera-demo_5_2',
    college: 'sera-demo',
    dayOfWeek: 5,
    startTime: '10:15',
    endTime: '11:15',
    courseCode: 'CS201',
    courseName: 'Data Structures',
    sessionType: 'Tutorial',
    room: 'Room TR-105',
    faculty: 'Prof. Ananya Rao',
    sortOrder: 2
  },
  {
    id: 'tt_sera-demo_5_3',
    college: 'sera-demo',
    dayOfWeek: 5,
    startTime: '11:30',
    endTime: '12:30',
    courseCode: 'CS205',
    courseName: 'Computer Organisation',
    sessionType: 'Lecture',
    room: 'Room LH-204',
    faculty: 'Prof. Rajesh Nair',
    sortOrder: 3
  },
  {
    id: 'tt_sera-demo_5_4',
    college: 'sera-demo',
    dayOfWeek: 5,
    startTime: '14:00',
    endTime: '15:00',
    courseCode: 'CS207',
    courseName: 'Object Oriented Programming',
    sessionType: 'Lab',
    room: 'Software Lab 1',
    faculty: 'Dr. Meera Kulkarni',
    sortOrder: 4
  },
  // Saturday (6)
  {
    id: 'tt_sera-demo_6_1',
    college: 'sera-demo',
    dayOfWeek: 6,
    startTime: '09:30',
    endTime: '10:30',
    courseCode: 'MA203',
    courseName: 'Discrete Mathematics',
    sessionType: 'Problem Solving',
    room: 'Room LH-108',
    faculty: 'Dr. Vikram Sethi',
    sortOrder: 1
  },
  {
    id: 'tt_sera-demo_6_2',
    college: 'sera-demo',
    dayOfWeek: 6,
    startTime: '10:45',
    endTime: '11:45',
    courseCode: 'CS201',
    courseName: 'Data Structures',
    sessionType: 'Mentoring & Doubt Session',
    room: 'Room TR-102',
    faculty: 'Prof. Ananya Rao',
    sortOrder: 2
  }
]
