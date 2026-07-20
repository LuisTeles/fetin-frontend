"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { 
    ChevronLeft, 
    ChevronRight, 
    Calendar as CalendarIcon, 
    Plus, 
    BookOpen, 
    CheckSquare, 
    BookOpenCheck,
    Clock, 
    Trash2, 
    Info, 
    Settings,
    CheckCircle,
    X,
    Filter
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TaskForm } from "./task-form"

// Types matching database schemas
type Task = {
    id: string
    title: string
    description?: string
    date: string // ISO string
    color: string
    category: "study" | "work" | "hobby" | "other"
}

type ExamTopic = {
    id: string
    name: string
    is_completed: boolean
}

type Exam = {
    id: string
    subject_id: string
    subject_name: string
    exam_date: string // YYYY-MM-DD
    topics: ExamTopic[]
    pending_topics_count: number
}

type StudySession = {
    id: string
    topicName: string
    subjectName: string
    sessionType: "new_content" | "spaced_review" | "pre_exam_review"
    durationMinutes: number
    status: "pending" | "completed" | "skipped"
    studyDate: string // YYYY-MM-DD
}

type CalendarViewProps = {
    onStatsChange?: (stats: { tasksCount: number; examsCount: number }) => void
}

export function CalendarView({ onStatsChange }: CalendarViewProps) {
    const searchParams = useSearchParams()
    const impersonateUserId = searchParams.get("userId")

    // Date navigation states
    const [currentDate, setCurrentDate] = useState(new Date())
    const [viewMode, setViewMode] = useState<"month" | "week" | "day">("month")

    // Data states
    const [tasks, setTasks] = useState<Task[]>([])
    const [exams, setExams] = useState<Exam[]>([])
    const [studySessions, setStudySessions] = useState<StudySession[]>([])
    
    // Toggles
    const [showStudySessions, setShowStudySessions] = useState(true)
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Form/Modal states
    const [isModalOpen, setIsModalOpen] = useState(false)
    const [selectedDateForNewTask, setSelectedDateForNewTask] = useState<string | null>(null)
    const [editingTask, setEditingTask] = useState<Task | null>(null)

    // Fetch calendar data
    async function loadData() {
        setIsLoading(true)
        setError(null)
        try {
            // Get date range for current view to optimize query (defaults to current month +/- 15 days)
            const year = currentDate.getFullYear()
            const month = currentDate.getMonth()
            
            const start = new Date(year, month - 1, 1).toISOString().split("T")[0]
            const end = new Date(year, month + 2, 0).toISOString().split("T")[0]

            // 1. Fetch Tasks
            const tasksUrl = impersonateUserId 
                ? `/api/tasks?userId=${impersonateUserId}&startDate=${start}&endDate=${end}`
                : `/api/tasks?startDate=${start}&endDate=${end}`
            const tasksRes = await fetch(tasksUrl, { cache: "no-store" })
            const tasksPayload = await tasksRes.json().catch(() => ({}))
            const loadedTasks = tasksPayload.tasks ?? []
            setTasks(loadedTasks)

            // 2. Fetch Exams (Existing Endpoint)
            const examsUrl = impersonateUserId ? `/api/exams?userId=${impersonateUserId}` : "/api/exams"
            const examsRes = await fetch(examsUrl, { cache: "no-store" })
            const examsPayload = await examsRes.json().catch(() => ({}))
            const loadedExams = examsPayload.exams ?? []
            setExams(loadedExams)

            // 3. Fetch Study Sessions from active schedule
            try {
                const schedulesUrl = impersonateUserId 
                    ? `/api/schedules?userId=${impersonateUserId}`
                    : `/api/schedules`
                const schedulesRes = await fetch(schedulesUrl, { cache: "no-store" })
                if (schedulesRes.ok) {
                    const schedulesPayload = await schedulesRes.json()
                    const schedulesList: any[] = schedulesPayload.schedules ?? []
                    const activeSchedule = schedulesList.find((s) => s.status === "active")

                    if (activeSchedule && activeSchedule.days) {
                        const extractedSessions: StudySession[] = []
                        const subjectName = activeSchedule.exam?.subject_name || activeSchedule.exam?.subject?.name || "Disciplina"
                        for (const day of activeSchedule.days) {
                            if (day.studySessions) {
                                const dateStr = day.studyDate?.split("T")[0]
                                for (const session of day.studySessions) {
                                    extractedSessions.push({
                                        id: session.id,
                                        topicName: session.topic?.name || "Tópico de Estudo",
                                        subjectName: subjectName,
                                        sessionType: session.sessionType,
                                        durationMinutes: session.durationMinutes,
                                        status: session.status,
                                        studyDate: dateStr,
                                    })
                                }
                            }
                        }
                        setStudySessions(extractedSessions)
                    } else {
                        setStudySessions([])
                    }
                } else {
                    setStudySessions([])
                }
            } catch {
                setStudySessions([])
            }

            if (onStatsChange) {
                onStatsChange({
                    tasksCount: loadedTasks.length,
                    examsCount: loadedExams.length
                })
            }
        } catch (err) {
            setError("Falha ao carregar os dados do calendário.")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        loadData()
    }, [currentDate, impersonateUserId])

    // Format Month Title
    const monthYearTitle = currentDate.toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric",
    })

    // Navigation handlers
    const handlePrev = () => {
        const nextDate = new Date(currentDate)
        if (viewMode === "month") {
            nextDate.setMonth(currentDate.getMonth() - 1)
        } else if (viewMode === "week") {
            nextDate.setDate(currentDate.getDate() - 7)
        } else {
            nextDate.setDate(currentDate.getDate() - 1)
        }
        setCurrentDate(nextDate)
    }

    const handleNext = () => {
        const nextDate = new Date(currentDate)
        if (viewMode === "month") {
            nextDate.setMonth(currentDate.getMonth() + 1)
        } else if (viewMode === "week") {
            nextDate.setDate(currentDate.getDate() + 7)
        } else {
            nextDate.setDate(currentDate.getDate() + 1)
        }
        setCurrentDate(nextDate)
    }

    const handleToday = () => {
        setCurrentDate(new Date())
    }

    // Modal Operations
    const openCreateModal = (dateStr: string) => {
        setEditingTask(null)
        setSelectedDateForNewTask(dateStr)
        setIsModalOpen(true)
    }

    const openEditModal = (task: Task) => {
        setEditingTask(task)
        setSelectedDateForNewTask(task.date.split("T")[0])
        setIsModalOpen(true)
    }

    const handleFormSuccess = () => {
        setIsModalOpen(false)
        setEditingTask(null)
        setSelectedDateForNewTask(null)
        loadData()
    }

    const handleDeleteTask = async (id: string, event: React.MouseEvent) => {
        event.stopPropagation()
        const confirmed = window.confirm("Deseja realmente excluir esta tarefa?")
        if (!confirmed) return

        try {
            const response = await fetch(`/api/tasks/${id}`, { method: "DELETE" })
            if (response.ok) {
                handleFormSuccess()
            } else {
                alert("Erro ao excluir tarefa.")
            }
        } catch {
            alert("Erro ao se conectar com o servidor.")
        }
    }

    // Calculate Exam study progress border class or color
    const getExamProgressBorder = (exam: Exam) => {
        const total = exam.topics.length
        if (total === 0) return "border-l-4 border-l-red-500" // Red border if no topics
        const completed = exam.topics.filter(t => t.is_completed).length
        const ratio = completed / total

        if (ratio < 0.3) {
            return "border-l-4 border-l-red-500 border-red-200" // Red
        } else if (ratio < 0.7) {
            return "border-l-4 border-l-amber-500 border-amber-200" // Yellow
        } else {
            return "border-l-4 border-l-emerald-500 border-emerald-200" // Green
        }
    }

    const getExamProgressPercentage = (exam: Exam) => {
        const total = exam.topics.length
        if (total === 0) return 0
        const completed = exam.topics.filter(t => t.is_completed).length
        return Math.round((completed / total) * 100)
    }

    // Filter events for a specific day string (YYYY-MM-DD)
    const getEventsForDay = (dateStr: string) => {
        const dayTasks = tasks.filter(t => t.date.split("T")[0] === dateStr)
        const dayExams = exams.filter(e => e.exam_date === dateStr)
        const daySessions = showStudySessions 
            ? studySessions.filter(s => s.studyDate === dateStr) 
            : []
        
        return { dayTasks, dayExams, daySessions }
    }

    // MONTH VIEW GENERATION LOGIC
    const renderMonthGrid = () => {
        const year = currentDate.getFullYear()
        const month = currentDate.getMonth()

        const firstDayOfMonth = new Date(year, month, 1)
        const startDayIndex = firstDayOfMonth.getDay() // 0 = Sunday, 6 = Saturday
        const totalDays = new Date(year, month + 1, 0).getDate()

        // Days from previous month for padding
        const prevMonthTotalDays = new Date(year, month, 0).getDate()
        const prevMonthDays = []
        for (let i = startDayIndex - 1; i >= 0; i--) {
            prevMonthDays.push({
                dayNum: prevMonthTotalDays - i,
                isCurrentMonth: false,
                dateStr: new Date(year, month - 1, prevMonthTotalDays - i).toISOString().split("T")[0]
            })
        }

        // Days of current month
        const currentMonthDays = []
        for (let i = 1; i <= totalDays; i++) {
            const date = new Date(year, month, i)
            // Fix timezone issue when outputting YYYY-MM-DD
            const localMonth = String(month + 1).padStart(2, "0")
            const localDay = String(i).padStart(2, "0")
            currentMonthDays.push({
                dayNum: i,
                isCurrentMonth: true,
                dateStr: `${year}-${localMonth}-${localDay}`
            })
        }

        // Days of next month for padding to complete grid
        const totalCells = prevMonthDays.length + currentMonthDays.length
        const nextMonthDays = []
        const remainingCells = (7 - (totalCells % 7)) % 7
        for (let i = 1; i <= remainingCells; i++) {
            const localMonth = String(month + 2).padStart(2, "0")
            const localDay = String(i).padStart(2, "0")
            nextMonthDays.push({
                dayNum: i,
                isCurrentMonth: false,
                dateStr: `${month === 11 ? year + 1 : year}-${month === 11 ? "01" : localMonth}-${localDay}`
            })
        }

        const allDays = [...prevMonthDays, ...currentMonthDays, ...nextMonthDays]
        const todayStr = new Date().toISOString().split("T")[0]

        return (
            <div className="grid grid-cols-7 gap-1 border border-border/60 rounded-md bg-muted/20 overflow-hidden">
                {/* Week Headers */}
                {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(day => (
                    <div key={day} className="p-2 text-center text-xs font-bold text-muted-foreground bg-muted/40 border-b">
                        {day}
                    </div>
                ))}

                {/* Day Cells */}
                {allDays.map((cell, index) => {
                    const { dayTasks, dayExams, daySessions } = getEventsForDay(cell.dateStr)
                    const isToday = cell.dateStr === todayStr
                    const hasEvents = dayTasks.length > 0 || dayExams.length > 0 || daySessions.length > 0

                    return (
                        <div 
                            key={index} 
                            onClick={() => {
                                const [y, m, d] = cell.dateStr.split("-").map(Number)
                                setCurrentDate(new Date(y, m - 1, d))
                                setViewMode("day")
                            }}
                            className={`min-h-[100px] p-1.5 bg-background border border-border/30 flex flex-col gap-1 transition-all hover:bg-muted/10 cursor-pointer group ${
                                !cell.isCurrentMonth ? "opacity-40 bg-muted/5" : ""
                            } ${isToday ? "bg-muted/20 ring-1 ring-inset ring-foreground/20" : ""}`}
                        >
                            {/* Day Header */}
                            <div className="flex items-center justify-between">
                                <span className={`text-xs font-semibold rounded-full w-5 h-5 flex items-center justify-center ${
                                    isToday ? "bg-primary text-primary-foreground font-bold" : "text-muted-foreground"
                                }`}>
                                    {cell.dayNum}
                                </span>
                                
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        openCreateModal(cell.dateStr)
                                    }}
                                    className="p-0.5 rounded-sm hover:bg-muted opacity-0 group-hover:opacity-100 text-muted-foreground transition-opacity cursor-pointer flex items-center justify-center shrink-0"
                                    title="Nova Tarefa"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                </button>
                            </div>

                            {/* Events List */}
                            <div className="flex-1 space-y-1 overflow-y-auto max-h-[80px] scrollbar-thin select-none">
                                {/* Provas (Exams) */}
                                {dayExams.map(exam => {
                                    const pct = getExamProgressPercentage(exam)
                                    return (
                                        <div 
                                            key={exam.id} 
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                window.location.href = `/exams?id=${exam.id}`
                                            }}
                                            className={`text-[9px] px-1 py-0.5 rounded-sm bg-rose-500/10 text-rose-700 dark:text-rose-300 font-semibold truncate hover:bg-rose-500/20 flex flex-col gap-0.5 ${getExamProgressBorder(exam)}`}
                                            title={`Prova: ${exam.subject_name} (${pct}% concluído)`}
                                        >
                                            <span className="font-bold flex items-center gap-0.5">
                                                <BookOpen className="w-2.5 h-2.5 shrink-0" />
                                                PROVA: {exam.subject_name}
                                            </span>
                                            <span className="text-[8px] opacity-80">{pct}% Estudado</span>
                                        </div>
                                    )
                                })}

                                {/* Custom Tasks */}
                                {dayTasks.map(task => (
                                    <div 
                                        key={task.id}
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            openEditModal(task)
                                        }}
                                        className="text-[9px] px-1 py-0.5 rounded-sm text-foreground/90 font-medium truncate flex items-center justify-between group/item border-l-2"
                                        style={{ backgroundColor: `${task.color}15`, borderLeftColor: task.color }}
                                        title={`${task.title} [${task.category.toUpperCase()}]`}
                                    >
                                        <span className="truncate flex items-center gap-0.5">
                                            <CheckSquare className="w-2.5 h-2.5 shrink-0" style={{ color: task.color }} />
                                            {task.title}
                                        </span>
                                        <button 
                                            onClick={(e) => handleDeleteTask(task.id, e)}
                                            className="opacity-0 group-hover/item:opacity-100 hover:text-red-500 text-muted-foreground p-0.5 rounded-sm transition-opacity"
                                        >
                                            <X className="w-2 h-2" />
                                        </button>
                                    </div>
                                ))}

                                {/* Study Sessions */}
                                {daySessions.map(session => (
                                    <div 
                                        key={session.id}
                                        className="text-[9px] px-1 py-0.5 rounded-sm bg-blue-500/10 text-blue-700 dark:text-blue-300 truncate flex items-center gap-0.5 border-l-2 border-blue-500"
                                        title={`Estudo: ${session.topicName} (${session.durationMinutes} min)`}
                                    >
                                        <Clock className="w-2.5 h-2.5 shrink-0 text-blue-500" />
                                        <span className="truncate font-medium">{session.topicName}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )
                })}
            </div>
        )
    }

    // WEEK VIEW GENERATION LOGIC
    const renderWeekGrid = () => {
        // Calculate Sunday of current week
        const startOfWeek = new Date(currentDate)
        const day = startOfWeek.getDay()
        startOfWeek.setDate(startOfWeek.getDate() - day)

        const weekDays = []
        for (let i = 0; i < 7; i++) {
            const date = new Date(startOfWeek)
            date.setDate(startOfWeek.getDate() + i)
            const localMonth = String(date.getMonth() + 1).padStart(2, "0")
            const localDay = String(date.getDate()).padStart(2, "0")
            weekDays.push({
                name: ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"][i],
                dayNum: date.getDate(),
                dateStr: `${date.getFullYear()}-${localMonth}-${localDay}`
            })
        }

        const todayStr = new Date().toISOString().split("T")[0]

        return (
            <div className="grid grid-cols-1 sm:grid-cols-7 gap-2 border border-border/60 rounded-md p-2 bg-muted/5">
                {weekDays.map((wDay, index) => {
                    const { dayTasks, dayExams, daySessions } = getEventsForDay(wDay.dateStr)
                    const isToday = wDay.dateStr === todayStr

                    return (
                        <div 
                            key={index}
                            className={`flex flex-col gap-2 rounded-md p-3 border min-h-[350px] transition-colors ${
                                isToday ? "bg-muted/15 border-foreground/30 ring-1 ring-inset ring-foreground/10" : "bg-card border-border/60"
                            }`}
                        >
                            {/* Day Header */}
                            <div className="flex items-center justify-between border-b pb-1.5">
                                <div className="flex flex-col">
                                    <span className="text-[10px] uppercase font-bold text-muted-foreground">{wDay.name}</span>
                                    <span className={`text-lg font-extrabold ${isToday ? "text-primary" : "text-foreground"}`}>
                                        {wDay.dayNum}
                                    </span>
                                </div>
                                <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    className="w-6 h-6 rounded-full shrink-0 cursor-pointer"
                                    onClick={() => openCreateModal(wDay.dateStr)}
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                </Button>
                            </div>

                            {/* Day Event List */}
                            <div className="flex-1 space-y-2 overflow-y-auto max-h-[300px] scrollbar-thin pr-0.5">
                                {/* Exams */}
                                {dayExams.map(exam => {
                                    const pct = getExamProgressPercentage(exam)
                                    return (
                                        <div 
                                            key={exam.id}
                                            onClick={() => window.location.href = `/exams?id=${exam.id}`}
                                            className={`p-2 rounded-md bg-rose-500/10 text-rose-700 dark:text-rose-300 flex flex-col gap-1 transition-all hover:bg-rose-500/20 cursor-pointer text-xs ${getExamProgressBorder(exam)}`}
                                        >
                                            <div className="font-bold flex items-center gap-1">
                                                <BookOpen className="w-3.5 h-3.5 text-rose-500" />
                                                <span>PROVA: {exam.subject_name}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-[10px] opacity-90 mt-1">
                                                <span>{pct}% Concluído</span>
                                                <span className="font-semibold">{exam.topics.length} tópicos</span>
                                            </div>
                                        </div>
                                    )
                                })}

                                {/* Custom Tasks */}
                                {dayTasks.map(task => (
                                    <div 
                                        key={task.id}
                                        onClick={() => openEditModal(task)}
                                        className="p-2 rounded-md border-l-4 text-xs bg-background hover:bg-muted/10 cursor-pointer flex flex-col gap-1 shadow-xs border border-border/40"
                                        style={{ borderLeftColor: task.color }}
                                    >
                                        <div className="font-bold flex items-center justify-between gap-1">
                                            <span className="truncate">{task.title}</span>
                                            <Badge variant="outline" className="text-[9px] uppercase tracking-wider scale-90 py-0 px-1 border-foreground/20">
                                                {task.category}
                                            </Badge>
                                        </div>
                                        {task.description && (
                                            <p className="text-[10px] text-muted-foreground line-clamp-1">{task.description}</p>
                                        )}
                                        <div className="flex items-center justify-between mt-1 text-[9px] text-muted-foreground border-t pt-1">
                                            <span className="flex items-center gap-0.5">
                                                <Clock className="w-2.5 h-2.5" />
                                                {new Date(task.date).toLocaleTimeString("pt-BR", {hour: '2-digit', minute:'2-digit'})}
                                            </span>
                                            <button 
                                                onClick={(e) => handleDeleteTask(task.id, e)}
                                                className="text-red-500 hover:bg-red-500/10 p-0.5 rounded-sm"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                {/* Study Sessions */}
                                {daySessions.map(session => (
                                    <div 
                                        key={session.id}
                                        className="p-2 rounded-md bg-blue-500/10 border-l-4 border-blue-500 text-xs flex flex-col gap-1 text-blue-700 dark:text-blue-300"
                                    >
                                        <div className="font-semibold flex items-center gap-1">
                                            <Clock className="w-3.5 h-3.5 text-blue-500" />
                                            <span>Estudo: {session.topicName}</span>
                                        </div>
                                        <div className="text-[10px] opacity-80">
                                            Matéria: {session.subjectName} • {session.durationMinutes} min
                                        </div>
                                    </div>
                                ))}

                                {dayExams.length === 0 && dayTasks.length === 0 && daySessions.length === 0 && (
                                    <span className="text-[10px] text-muted-foreground/60 italic block py-4 text-center">
                                        Nenhum evento
                                    </span>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
        )
    }

    // DAY VIEW GENERATION LOGIC
    const renderDayGrid = () => {
        const localMonth = String(currentDate.getMonth() + 1).padStart(2, "0")
        const localDay = String(currentDate.getDate()).padStart(2, "0")
        const dateStr = `${currentDate.getFullYear()}-${localMonth}-${localDay}`
        
        const { dayTasks, dayExams, daySessions } = getEventsForDay(dateStr)
        const dayName = currentDate.toLocaleDateString("pt-BR", { weekday: "long" })
        const formattedDate = currentDate.toLocaleDateString("pt-BR", { day: "numeric", month: "long" })

        return (
            <div className="border border-border/60 rounded-md p-4 bg-card space-y-4">
                {/* Day title info */}
                <div className="flex justify-between items-center border-b pb-3">
                    <div>
                        <h2 className="text-lg font-bold capitalize">{dayName}</h2>
                        <p className="text-xs text-muted-foreground">{formattedDate}</p>
                    </div>
                    <Button onClick={() => openCreateModal(dateStr)} size="sm" className="gap-1 cursor-pointer">
                        <Plus className="w-4 h-4" /> Add Compromisso
                    </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Tasks & Exams Column */}
                    <div className="space-y-3">
                        <h3 className="text-sm font-bold border-l-2 border-primary pl-2 mb-2">Compromissos e Provas</h3>
                        
                        {/* Exams list */}
                        {dayExams.map(exam => {
                            const pct = getExamProgressPercentage(exam)
                            return (
                                <Card key={exam.id} className={`shadow-xs border-l-4 ${getExamProgressBorder(exam)} bg-rose-500/5`}>
                                    <CardHeader className="p-4 pb-2">
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-xs font-bold text-rose-700 dark:text-rose-300 uppercase tracking-wider flex items-center gap-1">
                                                <BookOpen className="w-3.5 h-3.5 text-rose-500" />
                                                Prova Importante
                                            </CardTitle>
                                            <Badge variant="outline" className="text-[10px] text-rose-600 bg-rose-50 dark:bg-rose-950/20">
                                                {pct}% Estudado
                                            </Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-4 pt-0">
                                        <p className="text-sm font-semibold">{exam.subject_name}</p>
                                        <div className="mt-2 text-xs text-muted-foreground">
                                            <p className="font-medium text-foreground mb-1">Tópicos Vinculados:</p>
                                            <ul className="list-disc pl-4 space-y-0.5">
                                                {exam.topics.map(t => (
                                                    <li key={t.id} className={t.is_completed ? "line-through text-muted-foreground/60" : ""}>
                                                        {t.name}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        })}

                        {/* Tasks list */}
                        {dayTasks.map(task => (
                            <Card key={task.id} className="shadow-xs border-l-4" style={{ borderLeftColor: task.color }}>
                                <CardHeader className="p-4 pb-2">
                                    <div className="flex justify-between items-center">
                                        <Badge variant="outline" className="scale-90 tracking-wide font-bold" style={{ borderColor: task.color, color: task.color }}>
                                            {task.category.toUpperCase()}
                                        </Badge>
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                            <Clock className="w-3.5 h-3.5" />
                                            {new Date(task.date).toLocaleTimeString("pt-BR", {hour: '2-digit', minute:'2-digit'})}
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-4 pt-0 flex justify-between items-start gap-4">
                                    <div>
                                        <p className="text-sm font-semibold">{task.title}</p>
                                        {task.description && <p className="text-xs text-muted-foreground mt-1">{task.description}</p>}
                                    </div>
                                    <div className="flex gap-1">
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="w-7 h-7 hover:bg-muted cursor-pointer"
                                            onClick={() => openEditModal(task)}
                                        >
                                            <Settings className="w-3.5 h-3.5" />
                                        </Button>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="w-7 h-7 text-red-500 hover:bg-red-500/10 cursor-pointer"
                                            onClick={(e) => handleDeleteTask(task.id, e)}
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}

                        {dayExams.length === 0 && dayTasks.length === 0 && (
                            <div className="text-center py-8 border border-dashed rounded-md text-xs text-muted-foreground">
                                Sem tarefas ou provas para hoje.
                            </div>
                        )}
                    </div>

                    {/* Study Sessions Column */}
                    <div>
                        <h3 className="text-sm font-bold border-l-2 border-blue-500 pl-2 mb-2">Sessões de Estudo do Cronograma</h3>
                        
                        {daySessions.length > 0 ? (
                            <div className="space-y-3">
                                {daySessions.map(session => (
                                    <Card key={session.id} className="shadow-xs border-l-4 border-blue-500 bg-blue-500/5">
                                        <CardContent className="p-4 flex items-center justify-between gap-4">
                                            <div className="space-y-1">
                                                <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">
                                                    {session.sessionType === "spaced_review" 
                                                        ? "Revisão Espaçada" 
                                                        : session.sessionType === "pre_exam_review" 
                                                            ? "Revisão Geral" 
                                                            : "Conteúdo Novo"}
                                                </p>
                                                <p className="text-sm font-semibold">{session.topicName}</p>
                                                <p className="text-xs text-muted-foreground">Disciplina: {session.subjectName}</p>
                                            </div>
                                            <div className="flex flex-col items-end gap-1.5">
                                                <Badge className="bg-blue-500 text-white font-bold">{session.durationMinutes} min</Badge>
                                                {session.status === "completed" ? (
                                                    <span className="text-[10px] text-green-600 font-semibold flex items-center gap-0.5">
                                                        <CheckCircle className="w-3 h-3" /> Concluído
                                                    </span>
                                                ) : (
                                                    <span className="text-[10px] text-muted-foreground italic">Pendente</span>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 border border-dashed rounded-md text-xs text-muted-foreground">
                                Nenhuma sessão de estudos agendada para hoje.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* INSTRUCTIONS PANEL */}
            <Alert className="bg-muted/30 border-border/60">
                <Info className="h-4 w-4 shrink-0 text-muted-foreground" />
                <AlertTitle className="text-xs font-bold flex items-center gap-1">
                    Instruções do Calendário
                </AlertTitle>
                <AlertDescription className="text-[11px] text-muted-foreground space-y-1 mt-1 leading-relaxed">
                    <p>• Clique em qualquer quadrado do dia para criar uma tarefa personalizada.</p>
                    <p>• **Legenda de Provas**: Provas acadêmicas importantes exibem uma borda de progresso correspondente aos tópicos estudados.</p>
                    <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <span className="flex items-center gap-1 text-[10px] font-medium"><span className="w-2.5 h-2.5 bg-red-500 rounded-xs shrink-0"></span> Baixo Progresso (&lt;30%)</span>
                        <span className="flex items-center gap-1 text-[10px] font-medium"><span className="w-2.5 h-2.5 bg-amber-500 rounded-xs shrink-0"></span> Médio Progresso (30%-70%)</span>
                        <span className="flex items-center gap-1 text-[10px] font-medium"><span className="w-2.5 h-2.5 bg-emerald-500 rounded-xs shrink-0"></span> Alto Progresso (&gt;70%)</span>
                    </div>
                </AlertDescription>
            </Alert>

            {/* CONTROL PANEL */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-muted/20 p-2.5 rounded-lg border border-border/40">
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-0.5 bg-background border rounded-md p-0.5">
                        <Button variant="ghost" size="icon" className="w-7 h-7 rounded-sm cursor-pointer" onClick={handlePrev}>
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="w-7 h-7 rounded-sm cursor-pointer" onClick={handleNext}>
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                    <Button variant="outline" size="sm" className="h-8 cursor-pointer" onClick={handleToday}>
                        Hoje
                    </Button>
                    <h2 className="text-sm font-bold capitalize text-foreground ml-2 min-w-[120px]">
                        {monthYearTitle}
                    </h2>
                </div>

                <div className="flex items-center gap-2.5">
                    {/* Study Sessions Filter Toggle */}
                    <div className="flex items-center gap-1.5 border-r pr-3 border-border/60">
                        <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                        <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 cursor-pointer select-none">
                            <input 
                                type="checkbox" 
                                checked={showStudySessions} 
                                onChange={(e) => setShowStudySessions(e.target.checked)}
                                className="rounded-sm border-input text-primary focus:ring-primary w-3.5 h-3.5"
                            />
                            Mostrar Sessões de Estudo
                        </label>
                    </div>

                    {/* View Modes */}
                    <div className="flex bg-background border rounded-md p-0.5">
                        {(["month", "week", "day"] as const).map(mode => (
                            <Button 
                                key={mode}
                                variant="ghost" 
                                size="sm" 
                                className={`h-7 px-3 rounded-sm font-semibold capitalize text-xs cursor-pointer ${
                                    viewMode === mode ? "bg-muted text-foreground" : "text-muted-foreground"
                                }`}
                                onClick={() => setViewMode(mode)}
                            >
                                {mode === "month" ? "Mês" : mode === "week" ? "Semana" : "Dia"}
                            </Button>
                        ))}
                    </div>
                </div>
            </div>

            {/* CALENDAR BODY */}
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-20 border border-dashed rounded-lg space-y-2">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                    <span className="text-xs text-muted-foreground font-medium">Buscando compromissos...</span>
                </div>
            ) : error ? (
                <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-700 dark:text-red-300 rounded-md text-xs font-semibold text-center">
                    {error}
                </div>
            ) : (
                <div className="animate-fade-in duration-200">
                    {viewMode === "month" && renderMonthGrid()}
                    {viewMode === "week" && renderWeekGrid()}
                    {viewMode === "day" && renderDayGrid()}
                </div>
            )}

            {/* TASK FORM MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
                    <Card className="w-full max-w-md bg-card border-border shadow-lg p-6 relative">
                        <Button 
                            variant="ghost" 
                            size="icon" 
                            className="absolute top-4 right-4 rounded-full w-7 h-7 cursor-pointer"
                            onClick={() => setIsModalOpen(false)}
                        >
                            <X className="w-4 h-4" />
                        </Button>
                        <h3 className="text-sm font-extrabold mb-4 flex items-center gap-1.5">
                            <CalendarIcon className="w-4 h-4 text-primary" />
                            {editingTask ? "Editar Tarefa" : "Nova Tarefa"}
                        </h3>
                        <TaskForm 
                            task={editingTask ?? undefined}
                            defaultDate={selectedDateForNewTask ?? undefined}
                            onSuccess={handleFormSuccess}
                            onCancel={() => setIsModalOpen(false)}
                        />
                    </Card>
                </div>
            )}
        </div>
    )
}

// Inline loader icon helper if Loader2 isn't imported from lucide-react (or falls back)
function Loader2(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            {...props}
        >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
    )
}

// Simple alert fallback components inside code in case shadcn Alert isn't fully set up in target environment
function Alert({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={`rounded-lg border p-4 flex gap-3 ${className}`} role="alert" {...props}>
            {children}
        </div>
    )
}

function AlertTitle({ children, className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
    return (
        <h5 className={`font-semibold leading-none tracking-tight ${className}`} {...props}>
            {children}
        </h5>
    )
}

function AlertDescription({ children, className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
    return (
        <div className={`text-xs opacity-90 [&_p]:leading-relaxed ${className}`} {...props}>
            {children}
        </div>
    )
}
