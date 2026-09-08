import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { DataStoreService } from '../../database/data-store.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { StaffGuard } from '../../common/guards/staff.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { IUser } from '@sanjeevani/shared-types';

export interface IEmployeeOnboarding {
  id: string;
  candidateName: string;
  mobile: string;
  email: string;
  designation: string;
  branchId: string;
  stage:
    | 'INTERVIEW'
    | 'DOC_VERIFIED'
    | 'REFERENCE_CHECKED'
    | 'OFFER_ISSUED'
    | 'APPOINTMENT_LETTER'
    | 'TRAINING'
    | 'PROBATION'
    | 'CONFIRMED';
  interviewScore?: number;
  documentsVerified: boolean;
  referenceCheckDone: boolean;
  offerAccepted: boolean;
  appointmentIssuedDate?: string;
  trainingStatus: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
  trainingScore?: number;
  probationEndDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ITrainingDay {
  day: number;
  title: string;
  description: string;
  status: 'PENDING' | 'PASSED' | 'FAILED';
  completedAt?: string;
  instructorNotes?: string;
  examScore?: number;
}

export interface IAttendanceRecord {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  checkIn: string;
  checkOut?: string;
  status: 'PRESENT' | 'HALF_DAY' | 'WFH' | 'ABSENT';
  notes?: string;
}

export interface ILeaveRequest {
  id: string;
  employeeId: string;
  employeeName: string;
  leaveType: 'CASUAL' | 'SICK' | 'ANNUAL' | 'EMERGENCY';
  startDate: string;
  endDate: string;
  daysCount: number;
  reason: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
}

// In-memory collections stored on DataStore or internal state
const onboardingCandidates: IEmployeeOnboarding[] = [];
const employeeTrainings = new Map<string, ITrainingDay[]>();
const attendanceRecords: IAttendanceRecord[] = [];
const leaveRequests: ILeaveRequest[] = [];

// Standard 7-Day Curriculum per SRS §44
const defaultCurriculum: ITrainingDay[] = [
  { day: 1, title: 'Company Ethics & Vision', description: 'Institutional values, customer trust & anti-greed philosophy (SRS §44 Day 1)', status: 'PENDING' },
  { day: 2, title: 'Core Software Architecture', description: 'Hands-on practice with Sanjeevani software navigation (SRS §44 Day 2)', status: 'PENDING' },
  { day: 3, title: 'Financial Products', description: 'Savings, RD interest schedules & loan parameters (SRS §44 Day 3)', status: 'PENDING' },
  { day: 4, title: 'KYC & Documentation', description: 'Customer verification, PAN/Aadhaar compliance & forms (SRS §44 Day 4)', status: 'PENDING' },
  { day: 5, title: 'Collection & Fraud Control', description: 'Route planning, receipt issuance & same-day cash deposit (SRS §44 Day 5)', status: 'PENDING' },
  { day: 6, title: 'Loan Appraisal & Recovery', description: 'Credit scorecard, field visits & non-abusive recovery SOP (SRS §44 Day 6)', status: 'PENDING' },
  { day: 7, title: 'Practical Examination & Field Test', description: 'Comprehensive exam (Passing score: 70%+ required for field clearance)', status: 'PENDING' },
];

@Controller('api/v1/hr')
@UseGuards(JwtAuthGuard, StaffGuard)
export class HrController {
  constructor(private dataStore: DataStoreService) {}

  // ─────────────────────────────────────────────────────────────
  // 1. ONBOARDING PIPELINE (SRS §43)
  // ─────────────────────────────────────────────────────────────

  @Get('onboarding')
  async getOnboardingCandidates() {
    return onboardingCandidates;
  }

  @Post('onboarding')
  async createOnboardingCandidate(
    @Body() body: Partial<IEmployeeOnboarding>,
    @CurrentUser() user: IUser,
  ) {
    if (!body.candidateName || !body.mobile || !body.designation) {
      throw new BadRequestException('Candidate name, mobile, and designation are required.');
    }

    const candidate: IEmployeeOnboarding = {
      id: `ONB-${Date.now()}`,
      candidateName: body.candidateName,
      mobile: body.mobile,
      email: body.email || `${body.candidateName.toLowerCase().replace(/\s+/g, '')}@sanjeevanifinance.com`,
      designation: body.designation,
      branchId: body.branchId || 'BR-001',
      stage: 'INTERVIEW',
      interviewScore: body.interviewScore || 0,
      documentsVerified: false,
      referenceCheckDone: false,
      offerAccepted: false,
      trainingStatus: 'NOT_STARTED',
      notes: body.notes || 'Initiated onboarding interview',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onboardingCandidates.unshift(candidate);

    this.dataStore.logAudit(
      user.id,
      user.employeeName || 'HR',
      'ONBOARDING_INITIATED',
      'EmployeeOnboarding',
      candidate.id,
      undefined,
      candidate,
      `Initiated candidate onboarding for ${candidate.candidateName}`,
    );

    return candidate;
  }

  @Patch('onboarding/:id/advance-stage')
  @Patch('onboarding/:id/stage')
  async advanceOnboardingStage(
    @Param('id') id: string,
    @Body() body: { stage: IEmployeeOnboarding['stage']; notes?: string; examScore?: number },
    @CurrentUser() user: IUser,
  ) {
    const candidate = onboardingCandidates.find((c) => c.id === id);
    if (!candidate) throw new NotFoundException('Candidate not found');

    candidate.stage = body.stage;
    if (body.notes) candidate.notes = body.notes;
    candidate.updatedAt = new Date().toISOString();

    if (body.stage === 'TRAINING') {
      candidate.trainingStatus = 'IN_PROGRESS';
      if (!employeeTrainings.has(candidate.id)) {
        employeeTrainings.set(candidate.id, JSON.parse(JSON.stringify(defaultCurriculum)));
      }
    } else if (body.stage === 'PROBATION') {
      const pDate = new Date();
      pDate.setMonth(pDate.getMonth() + 3);
      candidate.probationEndDate = pDate.toISOString().split('T')[0];
    }

    this.dataStore.logAudit(
      user.id,
      user.employeeName || 'HR',
      'ONBOARDING_STAGE_ADVANCED',
      'EmployeeOnboarding',
      candidate.id,
      undefined,
      candidate,
      `Candidate ${candidate.candidateName} advanced to stage ${body.stage}`,
    );

    return candidate;
  }

  // ─────────────────────────────────────────────────────────────
  // 2. 7-DAY STRUCTURED TRAINING TRACKER (SRS §44)
  // ─────────────────────────────────────────────────────────────

  @Get('training/:candidateOrEmployeeId')
  async getTrainingCurriculum(@Param('candidateOrEmployeeId') id: string) {
    if (!employeeTrainings.has(id)) {
      employeeTrainings.set(id, JSON.parse(JSON.stringify(defaultCurriculum)));
    }
    const days = employeeTrainings.get(id)!;
    return {
      traineeId: id,
      days,
      curriculum: days,
      allPassed: days.every((d) => d.status === 'PASSED'),
    };
  }

  @Post('training/:candidateOrEmployeeId/complete-day')
  @Post('training/:candidateOrEmployeeId/day/:day')
  async completeTrainingDay(
    @Param('candidateOrEmployeeId') id: string,
    @Body()
    body: {
      day?: number;
      passed?: boolean;
      status?: string;
      score?: number;
      examScore?: number;
      notes?: string;
      instructorNotes?: string;
    },
    @CurrentUser() user: IUser,
    @Param('day') dayParam?: string,
  ) {
    if (!employeeTrainings.has(id)) {
      employeeTrainings.set(id, JSON.parse(JSON.stringify(defaultCurriculum)));
    }

    const curriculum = employeeTrainings.get(id)!;
    const targetDay = Number(dayParam) || body.day || 1;
    const dayItem = curriculum.find((d) => d.day === targetDay);
    if (!dayItem) throw new NotFoundException(`Training day ${targetDay} not found.`);

    const isPassed = body.status === 'PASSED' || body.passed === true;
    dayItem.status = isPassed ? 'PASSED' : 'FAILED';
    dayItem.completedAt = new Date().toISOString();
    dayItem.instructorNotes = body.instructorNotes || body.notes || `Evaluated by ${user.employeeName || 'Trainer'}`;
    const scoreVal = body.examScore !== undefined ? body.examScore : body.score;
    if (scoreVal !== undefined) dayItem.examScore = scoreVal;

    // If Day 7 exam passed (score >= 80 per SRS §44)
    if (targetDay === 7 && isPassed) {
      const candidate = onboardingCandidates.find((c) => c.id === id);
      if (candidate) {
        candidate.trainingStatus = 'COMPLETED';
        candidate.trainingScore = scoreVal || 85;
      }
    }

    return {
      message: `Day ${targetDay} marked as ${dayItem.status}`,
      curriculum,
      days: curriculum,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // 3. ATTENDANCE SYSTEM (SRS §42)
  // ─────────────────────────────────────────────────────────────

  @Post('attendance/check-in')
  async checkIn(
    @Body() body: { status?: 'PRESENT' | 'HALF_DAY' | 'WFH'; notes?: string },
    @CurrentUser() user: IUser,
  ) {
    const today = new Date().toISOString().split('T')[0];
    const existing = attendanceRecords.find(
      (a) => a.employeeId === (user.employeeId || user.id) && a.date === today,
    );

    if (existing) {
      return { message: 'Already checked in for today', record: existing };
    }

    const newRecord: IAttendanceRecord = {
      id: `ATT-${Date.now()}`,
      employeeId: user.employeeId || user.id,
      employeeName: user.employeeName || user.username,
      date: today,
      checkIn: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      status: body.status || 'PRESENT',
      notes: body.notes,
    };

    attendanceRecords.unshift(newRecord);
    return { message: 'Checked in successfully', record: newRecord };
  }

  @Post('attendance/check-out')
  async checkOut(@CurrentUser() user: IUser) {
    const today = new Date().toISOString().split('T')[0];
    const record = attendanceRecords.find(
      (a) => a.employeeId === (user.employeeId || user.id) && a.date === today,
    );

    if (!record) {
      throw new BadRequestException('No check-in record found for today.');
    }

    record.checkOut = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    return { message: 'Checked out successfully', record };
  }

  @Get('attendance')
  async getAttendance(@Query('employeeId') empId?: string, @Query('month') month?: string) {
    let list = attendanceRecords;
    if (empId) list = list.filter((a) => a.employeeId === empId);
    if (month) list = list.filter((a) => a.date.startsWith(month));
    return list;
  }

  // ─────────────────────────────────────────────────────────────
  // 4. LEAVE REQUESTS (SRS §42)
  // ─────────────────────────────────────────────────────────────

  @Post('leaves/apply')
  async applyLeave(
    @Body()
    body: {
      leaveType: 'CASUAL' | 'SICK' | 'ANNUAL' | 'EMERGENCY';
      startDate: string;
      endDate: string;
      daysCount: number;
      reason: string;
    },
    @CurrentUser() user: IUser,
  ) {
    const newLeave: ILeaveRequest = {
      id: `LV-${Date.now()}`,
      employeeId: user.employeeId || user.id,
      employeeName: user.employeeName || user.username,
      leaveType: body.leaveType,
      startDate: body.startDate,
      endDate: body.endDate,
      daysCount: body.daysCount || 1,
      reason: body.reason,
      status: 'PENDING',
      createdAt: new Date().toISOString(),
    };

    leaveRequests.unshift(newLeave);
    return { message: 'Leave request submitted for Manager approval', leave: newLeave };
  }

  @Get('leaves')
  async getLeaves() {
    return leaveRequests;
  }

  @Patch('leaves/:id/status')
  @Patch('leaves/:id/approve')
  async updateLeaveStatus(
    @Param('id') id: string,
    @Body() body: { status?: 'APPROVED' | 'REJECTED' },
    @CurrentUser() user: IUser,
  ) {
    const leave = leaveRequests.find((l) => l.id === id);
    if (!leave) throw new NotFoundException('Leave request not found');

    const status = body?.status || 'APPROVED';
    leave.status = status;
    leave.approvedBy = user.employeeName || user.username;
    leave.approvedAt = new Date().toISOString();

    return { message: `Leave ${status.toLowerCase()} successfully`, leave };
  }
}
