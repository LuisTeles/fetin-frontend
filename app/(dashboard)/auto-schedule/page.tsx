"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import {
  Zap,
  Calendar as CalendarIcon,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Sparkles,
  BookOpen,
  RotateCcw,
  Sliders,
  ChevronRight,
  TrendingUp,
  BrainCircuit,
  Lock,
  Layers,
  X,
  Briefcase,
  Moon,
  GraduationCap,
  HeartHandshake,
  MoreHorizontal,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

import {
  fetchExamsList,
  generateSchedule,
  fetchUserSchedules,
  fetchScheduleById,
  toggleDayAvailability,
  updateSessionStatus,
  cancelSchedule,
  Exam,
  Schedule,
  ScheduleDay,
  StudySession,
  StudySessionType,
} from "@/lib/api/schedules"

import {
  fetchAvailabilitySchedule,
  RoutineBlock,
  RoutineCategory,
} from "@/lib/api/availability"

const SESSION_TYPE_CONFIG: Record<
  StudySessionType,
  { label: string; icon: any; badgeClass: string; bgClass: string }
> = {
  new_content: {
    label: "Conteúdo Novo",
    icon: BookOpen,
    badgeClass: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    bgClass: "border-blue-500/30 bg-blue-500/5",
  },
  spaced_review: {
    label: "Revisão Espaçada (Ebbinghaus)",
    icon: BrainCircuit,
    badgeClass: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800",
    bgClass: "border-purple-500/30 bg-purple-500/5",
  },
  pre_exam_review: {
    label: "Revisão Pré-Prova",
    icon: Sparkles,
    badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    bgClass: "border-emerald-500/30 bg-emerald-500/5",
  },
}

const ROUTINE_CATEGORY_CONFIG: Record<
  RoutineCategory,
  { label: string; icon: any; badgeClass: string; bgClass: string }
> = {
  WORK: {
    label: "Trabalho",
    icon: Briefcase,
    badgeClass: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    bgClass: "border-blue-500/20 bg-blue-500/5",
  },
  SLEEP: {
    label: "Sono / Descanso",
    icon: Moon,
    badgeClass: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800",
    bgClass: "border-purple-500/20 bg-purple-500/5",
  },
  CLASS: {
    label: "Aulas / Faculdade",
    icon: GraduationCap,
    badgeClass: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    bgClass: "border-amber-500/20 bg-amber-500/5",
  },
  PERSONAL: {
    label: "Pessoal / Lazer",
    icon: HeartHandshake,
    badgeClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    bgClass: "border-emerald-500/20 bg-emerald-500/5",
  },
  OTHER: {
    label: "Outros",
    icon: MoreHorizontal,
    badgeClass: "bg-gray-500/15 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-800",
    bgClass: "border-gray-500/20 bg-gray-500/5",
  },
}

type TimelineItem =
  | {
      kind: "routine"
      id: string
      title: string
      category: RoutineCategory
      startTime: string
      endTime: string
      startMins: number
    }
  | {
      kind: "session"
      id: string
      session: StudySession
      startTime: string
      endTime: string
      startMins: number
    }

function timeToMins(t: string): number {
  if (!t) return 0
  const parts = t.split(":")
  return Number(parts[0]) * 60 + Number(parts[1] || 0)
}

function minsToTime(m: number): string {
  const h = Math.floor(m / 60)
  const min = m % 60
  return `${h.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}`
}

function buildUnifiedTimeline(
  day: ScheduleDay,
  routineBlocks: RoutineBlock[]
): TimelineItem[] {
  const dateObj = new Date(`${day.studyDate.split("T")[0]}T00:00:00.000Z`)
  const dayOfWeek = dateObj.getUTCDay()

  const dayRoutine = routineBlocks.filter((b) => b.dayOfWeek === dayOfWeek)

  const items: TimelineItem[] = dayRoutine.map((b) => ({
    kind: "routine",
    id: b.id || Math.random().toString(),
    title: b.title,
    category: b.category,
    startTime: b.startTime,
    endTime: b.endTime,
    startMins: timeToMins(b.startTime),
  }))

  // Merged routine blockers to calculate free windows
  const mergedBlocks = dayRoutine
    .map((b) => ({
      startMins: timeToMins(b.startTime),
      endMins: timeToMins(b.endTime),
    }))
    .sort((a, b) => a.startMins - b.startMins)

  const freeGaps: { startMins: number; endMins: number }[] = []
  let pointer = 0

  for (const block of mergedBlocks) {
    if (block.startMins > pointer) {
      freeGaps.push({ startMins: pointer, endMins: block.startMins })
    }
    pointer = Math.max(pointer, block.endMins)
  }
  if (pointer < 1440) {
    freeGaps.push({ startMins: pointer, endMins: 1440 })
  }

  // Sequentially place study sessions in free gaps
  let currentGapIndex = 0
  let gapPointer = freeGaps[0] ? freeGaps[0].startMins : 480

  if (day.studySessions) {
    for (const session of day.studySessions) {
      while (
        currentGapIndex < freeGaps.length &&
        gapPointer + session.durationMinutes > freeGaps[currentGapIndex].endMins
      ) {
        currentGapIndex++
        if (freeGaps[currentGapIndex]) {
          gapPointer = freeGaps[currentGapIndex].startMins
        }
      }

      const sessionStart = gapPointer
      const sessionEnd = gapPointer + session.durationMinutes

      items.push({
        kind: "session",
        id: session.id,
        session,
        startTime: minsToTime(sessionStart),
        endTime: minsToTime(Math.min(1439, sessionEnd)),
        startMins: sessionStart,
      })

      gapPointer = sessionEnd
    }
  }

  return items.sort((a, b) => a.startMins - b.startMins)
}

export default function AutoSchedulePage() {
  const searchParams = useSearchParams()
  const impersonateUserId = searchParams.get("userId")

  // State
  const [exams, setExams] = useState<Exam[]>([])
  const [schedules, setSchedules] = useState<Schedule[]>([])
  const [routineBlocks, setRoutineBlocks] = useState<RoutineBlock[]>([])
  const [selectedSchedule, setSelectedSchedule] = useState<Schedule | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Form state
  const [selectedExamId, setSelectedExamId] = useState<string>("")
  const [maxStudyHour, setMaxStudyHour] = useState<string>("22:00")
  const [sessionDurationMinutes, setSessionDurationMinutes] = useState<number>(45)
  const [startDate, setStartDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  )

  // Animation State
  const [isAnimating, setIsAnimating] = useState<boolean>(false)
  const [animProgress, setAnimProgress] = useState<number>(0)
  const [animStepText, setAnimStepText] = useState<string>("")
  const [revealedSessionCount, setRevealedSessionCount] = useState<number>(0)

  // View state
  const [activeDayNumber, setActiveDayNumber] = useState<number>(1)
  const [viewTab, setViewTab] = useState<"days" | "allocations">("days")

  async function loadInitialData() {
    setIsLoading(true)
    setError(null)
    try {
      const [examsData, schedulesData, availabilityData] = await Promise.all([
        fetchExamsList(impersonateUserId),
        fetchUserSchedules(impersonateUserId),
        fetchAvailabilitySchedule(impersonateUserId).catch(() => null),
      ])
      setExams(examsData || [])
      setSchedules(schedulesData || [])
      setRoutineBlocks(availabilityData?.routineBlocks || [])

      if (examsData && examsData.length > 0 && !selectedExamId) {
        setSelectedExamId(examsData[0].id)
      }

      const active = schedulesData?.find((s) => s.status === "active")
      if (active) {
        setSelectedSchedule(active)
      }
    } catch (err: any) {
      setError(err.message || "Erro ao carregar dados dos cronogramas.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadInitialData()
  }, [impersonateUserId])

  // Satisfying Animation Sequence Handler
  async function handleGenerateSchedule(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedExamId) {
      setError("Por favor, selecione uma prova.")
      return
    }

    setError(null)
    setSuccessMessage(null)
    setIsLoading(true)

    try {
      // 1. Call Backend API
      const newSchedule = await generateSchedule(
        {
          examId: selectedExamId,
          sessionDurationMinutes,
          startDate,
          maxStudyHour,
        },
        impersonateUserId
      )

      // 2. Start Satisfying Locked Animation Phase
      setIsLoading(false)
      setIsAnimating(true)
      setRevealedSessionCount(0)

      const totalItems = newSchedule.days.reduce(
        (sum, d) => sum + (d.studySessions?.length || 0),
        0
      )

      // Step 1: Analyzing Availability
      setAnimProgress(15)
      setAnimStepText("🔍 Cruzando compromissos da rotina e tempo livre...")
      await new Promise((r) => setTimeout(r, 600))

      // Step 2: Priorities & Ebbinghaus
      setAnimProgress(40)
      setAnimStepText("🧠 Calculando prioridade dos tópicos e Curva de Esquecimento...")
      await new Promise((r) => setTimeout(r, 700))

      // Step 3: Staggered Session Card Generation
      setAnimProgress(70)
      setAnimStepText("✨ Alocando sessões de estudo no seu calendário...")
      setSelectedSchedule(newSchedule)

      // Stagger reveal cards step by step
      for (let count = 1; count <= totalItems; count++) {
        setRevealedSessionCount(count)
        await new Promise((r) => setTimeout(r, Math.max(50, 600 / totalItems)))
      }

      // Step 4: Finish Animation
      setAnimProgress(100)
      setAnimStepText("🎉 Cronograma Otimizado Gerado com Sucesso!")
      await new Promise((r) => setTimeout(r, 500))

      setIsAnimating(false)
      setSuccessMessage("Seu novo cronograma de estudos foi gerado e ativado!")
      loadInitialData()
    } catch (err: any) {
      setIsLoading(false)
      setIsAnimating(false)
      setError(err.message || "Falha ao gerar cronograma automático.")
    }
  }

  async function handleToggleDay(dayId: string, currentAvailable: boolean) {
    if (!selectedSchedule) return
    setIsLoading(true)
    setError(null)
    try {
      const updated = await toggleDayAvailability(
        selectedSchedule.id,
        dayId,
        !currentAvailable,
        impersonateUserId
      )
      setSelectedSchedule(updated)
      setSuccessMessage(
        !currentAvailable
          ? "Dia marcado como disponível!"
          : "Dia marcado como livre! As sessões pendentes foram redistribuídas."
      )
    } catch (err: any) {
      setError(err.message || "Erro ao alterar dia.")
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSessionStatus(sessionId: string, newStatus: "completed" | "skipped") {
    if (!selectedSchedule) return
    setIsLoading(true)
    setError(null)
    try {
      await updateSessionStatus(sessionId, newStatus, impersonateUserId)
      const refreshed = await fetchScheduleById(selectedSchedule.id, impersonateUserId)
      setSelectedSchedule(refreshed)
      setSuccessMessage(
        newStatus === "completed"
          ? "Sessão concluída! A retenção de memória foi reforçada na Curva de Ebbinghaus."
          : "Sessão pulada."
      )
    } catch (err: any) {
      setError(err.message || "Erro ao atualizar sessão.")
    } finally {
      setIsLoading(false)
    }
  }

  async function handleCancelSchedule(id: string) {
    if (!confirm("Deseja realmente cancelar este cronograma de estudos?")) return
    setIsLoading(true)
    setError(null)
    try {
      await cancelSchedule(id, impersonateUserId)
      setSelectedSchedule(null)
      setSuccessMessage("Cronograma cancelado com sucesso.")
      loadInitialData()
    } catch (err: any) {
      setError(err.message || "Erro ao cancelar cronograma.")
    } finally {
      setIsLoading(false)
    }
  }

  const activeDay = selectedSchedule?.days.find((d) => d.dayNumber === activeDayNumber)
  const unifiedTimeline = activeDay ? buildUnifiedTimeline(activeDay, routineBlocks) : []

  return (
    <section className="space-y-6 relative w-full min-w-0 max-w-full overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/40 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500 fill-amber-500" /> Calendário Automático de Estudos
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Gere o seu plano de estudos otimizado com um único clique. O sistema analisa sua rotina, prioridades e curva de esquecimento.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button onClick={loadInitialData} variant="outline" size="sm" disabled={isLoading || isAnimating} className="gap-1 text-xs">
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} /> Atualizar
          </Button>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Atenção</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert className="border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          <AlertTitle>Sucesso</AlertTitle>
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      {/* Satisfying Non-Interruptible Animation Overlay */}
      {isAnimating && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex flex-col items-center justify-center p-6 space-y-6">
          <div className="p-4 rounded-full bg-amber-500/10 text-amber-500 animate-pulse border border-amber-500/30 shadow-lg">
            <Zap className="h-12 w-12 fill-amber-500" />
          </div>

          <div className="text-center max-w-md space-y-2">
            <h2 className="text-lg font-bold tracking-tight text-foreground">
              Construindo seu Calendário Automático
            </h2>
            <p className="text-xs text-muted-foreground transition-all duration-300">
              {animStepText}
            </p>
          </div>

          {/* Progress Bar */}
          <div className="w-full max-w-xs bg-muted rounded-full h-2.5 overflow-hidden border border-border">
            <div
              className="bg-amber-500 h-2.5 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${animProgress}%` }}
            />
          </div>

          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground bg-muted/60 px-3 py-1.5 rounded-full border border-border">
            <Lock className="h-3 w-3" /> Processamento seguro em andamento...
          </div>
        </div>
      )}

      {/* Form: Generate Automatic Schedule */}
      <Card className="border-border/60 bg-gradient-to-br from-card via-card to-amber-500/5 shadow-xs">
        <CardHeader className="p-4 border-b border-border/40">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" /> Configuração do Agendamento Inteligente
          </CardTitle>
          <CardDescription className="text-xs">
            Informe suas preferências de estudo para disparar a geração automática.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4">
          <form onSubmit={handleGenerateSchedule} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Prova Alvo</Label>
              {exams.length === 0 ? (
                <p className="text-xs text-muted-foreground py-2">
                  Nenhuma prova cadastrada. <a href="/exams" className="text-primary underline">Cadastre uma prova primeiro</a>.
                </p>
              ) : (
                <select
                  value={selectedExamId}
                  onChange={(e) => setSelectedExamId(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                  required
                >
                  {exams.map((ex) => {
                    const subjectName = ex.subject_name || ex.subject?.name || "Disciplina"
                    const examDateStr = ex.exam_date || ex.examDate?.split("T")[0] || ""
                    return (
                      <option key={ex.id} value={ex.id}>
                        {subjectName} — {examDateStr}
                      </option>
                    )
                  })}
                </select>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Horário Limite Diário</Label>
              <select
                value={maxStudyHour}
                onChange={(e) => setMaxStudyHour(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="20:00">Até 20:00</option>
                <option value="21:00">Até 21:00</option>
                <option value="22:00">Até 22:00 (Padrão)</option>
                <option value="23:00">Até 23:00</option>
                <option value="23:59">Até 23:59</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold">Duração por Sessão</Label>
              <select
                value={sessionDurationMinutes}
                onChange={(e) => setSessionDurationMinutes(Number(e.target.value))}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value={30}>30 minutos</option>
                <option value={45}>45 minutos (Recomendado)</option>
                <option value={60}>60 minutos (1 hora)</option>
                <option value={90}>90 minutos (1h 30m)</option>
              </select>
            </div>

            <Button
              type="submit"
              disabled={isLoading || isAnimating || exams.length === 0}
              className="bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs gap-1.5 shadow-sm h-9"
            >
              <Zap className="h-4 w-4 fill-black" /> Gerar
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Active Schedule View Dashboard */}
      {selectedSchedule ? (
        <div className="space-y-4">
          {/* Summary Card */}
          <Card className="border-border/60">
            <CardHeader className="p-4 border-b border-border/40 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                    Cronograma Ativo
                  </Badge>
                  <CardTitle className="text-base font-bold">
                    {selectedSchedule.exam?.subject_name || selectedSchedule.exam?.subject?.name || "Plano de Estudos"}
                  </CardTitle>
                </div>
                <CardDescription className="text-xs mt-0.5">
                  Período: {selectedSchedule.startDate?.split("T")[0]} até {selectedSchedule.endDate?.split("T")[0]} ({selectedSchedule.totalDays} dias)
                </CardDescription>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCancelSchedule(selectedSchedule.id)}
                className="text-xs text-destructive hover:bg-destructive/10 shrink-0"
              >
                Cancelar Cronograma
              </Button>
            </CardHeader>

            <CardContent className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg border bg-muted/30">
                <span className="text-xs text-muted-foreground">Total de Sessões</span>
                <p className="text-xl font-bold tracking-tight text-foreground">
                  {selectedSchedule.days.reduce((sum, d) => sum + (d.studySessions?.length || 0), 0)}
                </p>
              </div>
              <div className="p-3 rounded-lg border bg-muted/30">
                <span className="text-xs text-muted-foreground">Sessões Concluídas</span>
                <p className="text-xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
                  {selectedSchedule.days.reduce(
                    (sum, d) => sum + (d.studySessions?.filter((s) => s.status === "completed").length || 0),
                    0
                  )}
                </p>
              </div>
              <div className="p-3 rounded-lg border bg-muted/30">
                <span className="text-xs text-muted-foreground">Tópicos Abrangidos</span>
                <p className="text-xl font-bold tracking-tight text-foreground">
                  {selectedSchedule.topicAllocations?.length || 0}
                </p>
              </div>
              <div className="p-3 rounded-lg border bg-muted/30">
                <span className="text-xs text-muted-foreground">Progresso Geral</span>
                <p className="text-xl font-bold tracking-tight text-primary">
                  {Math.round(
                    (selectedSchedule.days.reduce(
                      (sum, d) => sum + (d.studySessions?.filter((s) => s.status === "completed").length || 0),
                      0
                    ) /
                      Math.max(
                        1,
                        selectedSchedule.days.reduce((sum, d) => sum + (d.studySessions?.length || 0), 0)
                      )) *
                    100
                  )}
                  %
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Mode Switcher Tabs */}
          <div className="flex border-b border-border text-xs">
            <button
              onClick={() => setViewTab("days")}
              className={`px-4 py-2 font-semibold border-b-2 transition-colors ${
                viewTab === "days"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Agenda por Dia (Linha do Tempo 24h)
            </button>
            <button
              onClick={() => setViewTab("allocations")}
              className={`px-4 py-2 font-semibold border-b-2 transition-colors ${
                viewTab === "allocations"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              Distribuição de Tópicos
            </button>
          </div>

          {/* TAB 1: Agenda por Dia (Linha do Tempo 24h Unificada) */}
          {viewTab === "days" && (
            <div className="space-y-4">
              {/* Day Number Pills Selector */}
              <div className="flex overflow-x-auto gap-1.5 pb-2 max-w-full min-w-0">
                {selectedSchedule.days.map((day) => {
                  const completedCount = day.studySessions?.filter((s) => s.status === "completed").length || 0
                  const totalCount = day.studySessions?.length || 0

                  return (
                    <button
                      key={day.id}
                      onClick={() => setActiveDayNumber(day.dayNumber)}
                      className={`shrink-0 w-[100px] p-2.5 rounded-lg border text-left text-xs transition-all ${
                        activeDayNumber === day.dayNumber
                          ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
                          : day.isAvailable
                          ? "border-border bg-card text-muted-foreground hover:text-foreground"
                          : "border-border bg-muted/40 text-muted-foreground opacity-60"
                      }`}
                    >
                      <div className="font-semibold text-xs flex items-center justify-between">
                        <span>Dia {day.dayNumber}</span>
                        {!day.isAvailable && <span className="text-[10px] text-destructive">Folga</span>}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-1">
                        {day.studyDate?.split("T")[0]}
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-0.5">
                        {totalCount > 0 ? `${completedCount}/${totalCount} sessões` : "Sem sessões"}
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* Day Details Card: Unified 24h Timeline */}
              {activeDay && (
                <Card className="border-border/60">
                  <CardHeader className="p-4 border-b border-border/40 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-bold flex items-center gap-2">
                        <span>Dia {activeDay.dayNumber} — {activeDay.studyDate?.split("T")[0]}</span>
                        {!activeDay.isAvailable && (
                          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30">
                            Dia Livre (Sem Sessões)
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="text-xs">
                        Visão Unificada: Compromissos da Rotina + Sessões de Estudo Alocadas
                      </CardDescription>
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleDay(activeDay.id, activeDay.isAvailable)}
                      className="text-xs"
                    >
                      {activeDay.isAvailable ? "Marcar como Dia Livre / Viagem" : "Restaurar Disponibilidade"}
                    </Button>
                  </CardHeader>

                  <CardContent className="p-4 space-y-3">
                    {unifiedTimeline.length === 0 ? (
                      <div className="text-center py-8 text-xs text-muted-foreground">
                        Nenhum evento registrado para este dia.
                      </div>
                    ) : (
                      unifiedTimeline.map((item, index) => {
                        const isRevealed = !isAnimating || index < revealedSessionCount
                        if (!isRevealed) return null

                        if (item.kind === "routine") {
                          const catConfig = ROUTINE_CATEGORY_CONFIG[item.category] || ROUTINE_CATEGORY_CONFIG.OTHER
                          const Icon = catConfig.icon

                          return (
                            <div
                              key={`routine-${item.id}`}
                              className={`p-3 rounded-lg border text-xs card-pop-in transition-all opacity-85 hover:opacity-100 ${catConfig.bgClass}`}
                            >
                              <div className="flex items-center justify-between min-w-0">
                                <div className="flex items-center gap-3 min-w-0">
                                  <div className={`p-2 rounded-md border shrink-0 ${catConfig.badgeClass}`}>
                                    <Icon className="h-4 w-4" />
                                  </div>
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <p className="font-semibold text-foreground text-xs truncate">{item.title}</p>
                                      <Badge variant="outline" className={`text-[10px] shrink-0 ${catConfig.badgeClass}`}>
                                        {catConfig.label}
                                      </Badge>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground mt-0.5 font-medium">
                                      Horário: {item.startTime} às {item.endTime}
                                    </p>
                                  </div>
                                </div>

                                <Badge variant="ghost" className="text-[10px] text-muted-foreground border border-border shrink-0 hidden sm:inline-flex">
                                  Compromisso de Rotina
                                </Badge>
                              </div>
                            </div>
                          )
                        }

                        // Study Session Item
                        const session = item.session
                        const typeConfig = SESSION_TYPE_CONFIG[session.sessionType] || SESSION_TYPE_CONFIG.new_content
                        const Icon = typeConfig.icon

                        return (
                          <div
                            key={`session-${session.id}`}
                            className={`p-3.5 rounded-lg border text-xs card-pop-in transition-all shadow-xs ${typeConfig.bgClass}`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 min-w-0">
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="p-2 rounded-md border border-border bg-background shrink-0">
                                  <Icon className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <p className="font-bold text-foreground text-sm truncate">
                                      {session.topic?.name || "Tópico de Estudo"}
                                    </p>
                                    <Badge variant="outline" className={`text-[10px] shrink-0 ${typeConfig.badgeClass}`}>
                                      {typeConfig.label}
                                    </Badge>
                                  </div>
                                  <p className="text-[11px] text-muted-foreground mt-0.5">
                                    <span className="font-semibold text-foreground">{item.startTime} — {item.endTime}</span> ({session.durationMinutes} minutos)
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 self-end sm:self-center">
                                {session.status === "completed" ? (
                                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs gap-1">
                                    <CheckCircle2 className="h-3.5 w-3.5" /> Concluída
                                  </Badge>
                                ) : session.status === "skipped" ? (
                                  <Badge variant="outline" className="bg-gray-500/10 text-gray-500 border-gray-500/30 text-xs gap-1">
                                    <XCircle className="h-3.5 w-3.5" /> Pulada
                                  </Badge>
                                ) : (
                                  <div className="flex items-center gap-1.5">
                                    <Button
                                      size="sm"
                                      onClick={() => handleSessionStatus(session.id, "completed")}
                                      className="h-7 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                                    >
                                      <CheckCircle2 className="h-3.5 w-3.5" /> Concluir
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => handleSessionStatus(session.id, "skipped")}
                                      className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                                    >
                                      Pular
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        )
                      })
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* TAB 2: Distribuição por Tópico */}
          {viewTab === "allocations" && (
            <Card className="border-border/60">
              <CardHeader className="p-4 border-b border-border/40">
                <CardTitle className="text-sm font-bold">Distribuição das Sessões por Tópico</CardTitle>
                <CardDescription className="text-xs">
                  Calculado proporcionalmente ao peso do assunto e prioridade da disciplina.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                {selectedSchedule.topicAllocations?.map((alloc) => {
                  const progressPct = Math.round(
                    (alloc.sessionsCompleted / Math.max(1, alloc.totalSessionsAllocated)) * 100
                  )

                  return (
                    <div key={alloc.id} className="p-3 rounded-lg border bg-card space-y-1.5 text-xs">
                      <div className="flex items-center justify-between font-semibold">
                        <span>{alloc.topic?.name}</span>
                        <span className="text-muted-foreground text-[11px]">
                          {alloc.sessionsCompleted} de {alloc.totalSessionsAllocated} sessões concluídas ({progressPct}%)
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        !isLoading && (
          <Card className="border-border/60 bg-card text-center p-8 space-y-3">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
              <CalendarIcon className="h-6 w-6" />
            </div>
            <h3 className="font-bold text-sm">Nenhum Cronograma Ativo no Momento</h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Selecione uma das suas provas no formulário acima e clique em "Gerar" para alocar seus horários de estudos.
            </p>
          </Card>
        )
      )}
    </section>
  )
}
