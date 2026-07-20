export type RoutineCategory = 'WORK' | 'SLEEP' | 'CLASS' | 'PERSONAL' | 'OTHER';

export interface RoutineBlock {
  id?: string;
  title: string;
  category: RoutineCategory;
  dayOfWeek: number; // 0 = Sun, 1 = Mon, ..., 6 = Sat
  startTime: string; // "HH:mm"
  endTime: string;   // "HH:mm"
}

export interface StudyWindow {
  id: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  durationMinutes: number;
}

export interface AvailabilityScheduleData {
  routineBlocks: RoutineBlock[];
  studyWindows: StudyWindow[];
  totalStudyMinutes: number;
  totalStudyHours: number;
  message?: string;
}

export async function fetchAvailabilitySchedule(impersonateUserId?: string | null): Promise<AvailabilityScheduleData> {
  const url = impersonateUserId ? `/api/availability?userId=${impersonateUserId}` : '/api/availability';
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || 'Falha ao carregar disponibilidade e rotina.');
  }
  return res.json();
}

export async function createRoutineBlock(
  block: Omit<RoutineBlock, 'id'>,
  impersonateUserId?: string | null
): Promise<AvailabilityScheduleData> {
  const url = impersonateUserId ? `/api/availability/routine?userId=${impersonateUserId}` : '/api/availability/routine';
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(block),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || 'Falha ao adicionar compromisso.');
  }
  return res.json();
}

export async function updateRoutineBlock(
  id: string,
  block: Partial<Omit<RoutineBlock, 'id'>>,
  impersonateUserId?: string | null
): Promise<AvailabilityScheduleData> {
  const url = impersonateUserId ? `/api/availability/routine/${id}?userId=${impersonateUserId}` : `/api/availability/routine/${id}`;
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(block),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || 'Falha ao atualizar compromisso.');
  }
  return res.json();
}

export async function deleteRoutineBlock(
  id: string,
  impersonateUserId?: string | null
): Promise<AvailabilityScheduleData> {
  const url = impersonateUserId ? `/api/availability/routine/${id}?userId=${impersonateUserId}` : `/api/availability/routine/${id}`;
  const res = await fetch(url, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || 'Falha ao remover compromisso.');
  }
  return res.json();
}

export async function syncRoutineBlocks(
  blocks: Omit<RoutineBlock, 'id'>[],
  impersonateUserId?: string | null
): Promise<AvailabilityScheduleData> {
  const baseUrl = impersonateUserId ? `/api/availability/routine?userId=${impersonateUserId}&action=sync` : '/api/availability/routine?action=sync';
  const res = await fetch(baseUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ blocks }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || 'Falha ao sincronizar rotina.');
  }
  return res.json();
}
