export type ScheduleStatus = 'active' | 'completed' | 'expired' | 'cancelled';
export type StudySessionType = 'new_content' | 'spaced_review' | 'pre_exam_review';
export type StudySessionStatus = 'pending' | 'completed' | 'skipped';
export type TopicWeight = 'essential' | 'review' | 'optional';

export interface Topic {
  id: string;
  name: string;
  weight: TopicWeight;
  isCompleted?: boolean;
}

export interface Subject {
  id: string;
  name: string;
  priorityWeight: number;
}

export interface Exam {
  id: string;
  examDate?: string;
  exam_date?: string;
  subject_name?: string;
  subject?: Subject;
  pending_topics_count?: number;
}

export interface StudySession {
  id: string;
  scheduleDayId: string;
  topicId: string;
  topic: Topic;
  sessionType: StudySessionType;
  durationMinutes: number;
  status: StudySessionStatus;
  completedAt?: string;
}

export interface ScheduleDay {
  id: string;
  scheduleId: string;
  studyDate: string;
  dayNumber: number;
  availableMinutes: number;
  isAvailable: boolean;
  studySessions: StudySession[];
}

export interface ScheduleTopicAllocation {
  id: string;
  scheduleId: string;
  topicId: string;
  topic: Topic;
  priorityScore: number;
  totalSessionsAllocated: number;
  sessionsCompleted: number;
}

export interface Schedule {
  id: string;
  userId: string;
  examId?: string;
  exam?: Exam;
  startDate: string;
  endDate: string;
  totalDays: number;
  status: ScheduleStatus;
  days: ScheduleDay[];
  topicAllocations: ScheduleTopicAllocation[];
  createdAt?: string;
}

export interface GenerateScheduleParams {
  examId: string;
  sessionDurationMinutes?: number;
  startDate?: string;
  maxStudyHour?: string;
}

export async function fetchExamsList(impersonateUserId?: string | null): Promise<Exam[]> {
  const url = impersonateUserId ? `/api/exams?userId=${impersonateUserId}` : '/api/exams';
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || 'Falha ao carregar lista de provas.');
  }
  const data = await res.json();
  return data.exams || data || [];
}

export async function generateSchedule(
  params: GenerateScheduleParams,
  impersonateUserId?: string | null
): Promise<Schedule> {
  const url = impersonateUserId ? `/api/schedules/generate?userId=${impersonateUserId}` : '/api/schedules/generate';
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || 'Falha ao gerar cronograma automático.');
  }
  return res.json();
}

export async function fetchUserSchedules(impersonateUserId?: string | null): Promise<Schedule[]> {
  const url = impersonateUserId ? `/api/schedules?userId=${impersonateUserId}` : '/api/schedules';
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || 'Falha ao carregar cronogramas.');
  }
  const data = await res.json();
  return Array.isArray(data) ? data : data.schedules || [];
}

export async function fetchScheduleById(id: string, impersonateUserId?: string | null): Promise<Schedule> {
  const url = impersonateUserId ? `/api/schedules/${id}?userId=${impersonateUserId}` : `/api/schedules/${id}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || 'Falha ao carregar detalhes do cronograma.');
  }
  return res.json();
}

export async function toggleDayAvailability(
  scheduleId: string,
  dayId: string,
  isAvailable: boolean,
  impersonateUserId?: string | null
): Promise<Schedule> {
  const url = impersonateUserId
    ? `/api/schedules/${scheduleId}/days/${dayId}/availability?userId=${impersonateUserId}`
    : `/api/schedules/${scheduleId}/days/${dayId}/availability`;

  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isAvailable }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || 'Falha ao alterar disponibilidade do dia.');
  }
  return res.json();
}

export async function updateSessionStatus(
  sessionId: string,
  status: 'completed' | 'skipped',
  impersonateUserId?: string | null
): Promise<StudySession> {
  const url = impersonateUserId
    ? `/api/schedules/sessions/${sessionId}?userId=${impersonateUserId}`
    : `/api/schedules/sessions/${sessionId}`;

  const res = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || 'Falha ao atualizar sessão de estudo.');
  }
  return res.json();
}

export async function cancelSchedule(id: string, impersonateUserId?: string | null): Promise<Schedule> {
  const url = impersonateUserId ? `/api/schedules/${id}?userId=${impersonateUserId}&action=cancel` : `/api/schedules/${id}?action=cancel`;
  const res = await fetch(url, {
    method: 'POST',
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || 'Falha ao cancelar cronograma.');
  }
  return res.json();
}
