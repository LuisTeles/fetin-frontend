"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  Edit,
  Sparkles,
  Briefcase,
  Moon,
  GraduationCap,
  HeartHandshake,
  MoreHorizontal,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Zap,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

import {
  fetchAvailabilitySchedule,
  createRoutineBlock,
  updateRoutineBlock,
  deleteRoutineBlock,
  syncRoutineBlocks,
  RoutineBlock,
  StudyWindow,
  RoutineCategory,
} from "@/lib/api/availability"

const DAYS = [
  { id: 0, short: "Dom", full: "Domingo" },
  { id: 1, short: "Seg", full: "Segunda-feira" },
  { id: 2, short: "Ter", full: "Terça-feira" },
  { id: 3, short: "Qua", full: "Quarta-feira" },
  { id: 4, short: "Qui", full: "Quinta-feira" },
  { id: 5, short: "Sex", full: "Sexta-feira" },
  { id: 6, short: "Sáb", full: "Sábado" },
]

const CATEGORIES: { id: RoutineCategory; label: string; icon: any; colorClass: string }[] = [
  { id: "WORK", label: "Trabalho", icon: Briefcase, colorClass: "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800" },
  { id: "SLEEP", label: "Sono / Descanso", icon: Moon, colorClass: "bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800" },
  { id: "CLASS", label: "Aulas / Faculdade", icon: GraduationCap, colorClass: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800" },
  { id: "PERSONAL", label: "Pessoal / Lazer", icon: HeartHandshake, colorClass: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800" },
  { id: "OTHER", label: "Outros", icon: MoreHorizontal, colorClass: "bg-gray-500/15 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-800" },
]

export default function AvailabilityPage() {
  const searchParams = useSearchParams()
  const impersonateUserId = searchParams.get("userId")

  const [routineBlocks, setRoutineBlocks] = useState<RoutineBlock[]>([])
  const [studyWindows, setStudyWindows] = useState<StudyWindow[]>([])
  const [totalHours, setTotalHours] = useState<number>(0)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Form State
  const [showModal, setShowModal] = useState<boolean>(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formTitle, setFormTitle] = useState<string>("")
  const [formCategory, setFormCategory] = useState<RoutineCategory>("WORK")
  const [selectedDays, setSelectedDays] = useState<number[]>([1, 2, 3, 4, 5])
  const [formStartTime, setFormStartTime] = useState<string>("08:00")
  const [formEndTime, setFormEndTime] = useState<string>("17:00")

  // Selected Day View Tab
  const [activeDayTab, setActiveDayTab] = useState<number>(1) // Monday default

  async function loadData() {
    setIsLoading(true)
    setError(null)
    try {
      const data = await fetchAvailabilitySchedule(impersonateUserId)
      setRoutineBlocks(data.routineBlocks || [])
      setStudyWindows(data.studyWindows || [])
      setTotalHours(data.totalStudyHours || 0)
    } catch (err: any) {
      setError(err.message || "Erro ao carregar dados da rotina.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [impersonateUserId])

  function openCreateModal() {
    setEditingId(null)
    setFormTitle("")
    setFormCategory("WORK")
    setSelectedDays([1, 2, 3, 4, 5])
    setFormStartTime("08:00")
    setFormEndTime("17:00")
    setShowModal(true)
  }

  function openEditModal(block: RoutineBlock) {
    if (!block.id) return
    setEditingId(block.id)
    setFormTitle(block.title)
    setFormCategory(block.category)
    setSelectedDays([block.dayOfWeek])
    setFormStartTime(block.startTime)
    setFormEndTime(block.endTime)
    setShowModal(true)
  }

  async function handleSubmitForm(e: React.FormEvent) {
    e.preventDefault()
    if (!formTitle.trim()) {
      setError("Por favor, informe o título do compromisso.")
      return
    }
    if (selectedDays.length === 0) {
      setError("Selecione pelo menos um dia da semana.")
      return
    }
    if (formStartTime >= formEndTime) {
      setError("O horário de término deve ser estritamente posterior ao início.")
      return
    }

    setIsSubmitting(true)
    setError(null)
    setSuccessMessage(null)

    try {
      if (editingId) {
        // Edit single block
        const updated = await updateRoutineBlock(
          editingId,
          {
            title: formTitle.trim(),
            category: formCategory,
            dayOfWeek: selectedDays[0],
            startTime: formStartTime,
            endTime: formEndTime,
          },
          impersonateUserId
        )
        setRoutineBlocks(updated.routineBlocks || [])
        setStudyWindows(updated.studyWindows || [])
        setTotalHours(updated.totalStudyHours || 0)
        setSuccessMessage("Compromisso atualizado com sucesso!")
      } else {
        // Create block for each selected day
        let currentData
        for (const day of selectedDays) {
          currentData = await createRoutineBlock(
            {
              title: formTitle.trim(),
              category: formCategory,
              dayOfWeek: day,
              startTime: formStartTime,
              endTime: formEndTime,
            },
            impersonateUserId
          )
        }
        if (currentData) {
          setRoutineBlocks(currentData.routineBlocks || [])
          setStudyWindows(currentData.studyWindows || [])
          setTotalHours(currentData.totalStudyHours || 0)
        }
        setSuccessMessage("Compromisso(s) de rotina adicionado(s) com sucesso!")
      }
      setShowModal(false)
    } catch (err: any) {
      setError(err.message || "Erro ao salvar compromisso.")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Tem certeza que deseja remover este compromisso da rotina?")) return
    setIsSubmitting(true)
    setError(null)
    try {
      const updated = await deleteRoutineBlock(id, impersonateUserId)
      setRoutineBlocks(updated.routineBlocks || [])
      setStudyWindows(updated.studyWindows || [])
      setTotalHours(updated.totalStudyHours || 0)
      setSuccessMessage("Compromisso removido da rotina!")
    } catch (err: any) {
      setError(err.message || "Erro ao remover compromisso.")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Presets
  async function applyPreset(presetType: "WORK_AND_SLEEP" | "COLLEGE_STUDENT" | "CLEAR_ALL") {
    setIsSubmitting(true)
    setError(null)
    setSuccessMessage(null)

    try {
      let blocks: Omit<RoutineBlock, "id">[] = []

      if (presetType === "WORK_AND_SLEEP") {
        // Mon-Fri Work 08:00-17:00, Sun-Sat Sleep 23:00-07:00
        for (let d = 1; d <= 5; d++) {
          blocks.push({ title: "Trabalho Comercial", category: "WORK", dayOfWeek: d, startTime: "08:00", endTime: "17:00" })
        }
        for (let d = 0; d <= 6; d++) {
          blocks.push({ title: "Sono Noturno", category: "SLEEP", dayOfWeek: d, startTime: "00:00", endTime: "07:00" })
          blocks.push({ title: "Sono Noturno", category: "SLEEP", dayOfWeek: d, startTime: "23:00", endTime: "23:59" })
        }
      } else if (presetType === "COLLEGE_STUDENT") {
        // Mon-Fri College 08:00-12:00, Internship 14:00-18:00, Sleep 23:00-07:00
        for (let d = 1; d <= 5; d++) {
          blocks.push({ title: "Aulas da Faculdade", category: "CLASS", dayOfWeek: d, startTime: "08:00", endTime: "12:00" })
          blocks.push({ title: "Estágio", category: "WORK", dayOfWeek: d, startTime: "14:00", endTime: "18:00" })
        }
        for (let d = 0; d <= 6; d++) {
          blocks.push({ title: "Sono", category: "SLEEP", dayOfWeek: d, startTime: "00:00", endTime: "07:00" })
          blocks.push({ title: "Sono", category: "SLEEP", dayOfWeek: d, startTime: "23:00", endTime: "23:59" })
        }
      }

      const updated = await syncRoutineBlocks(blocks, impersonateUserId)
      setRoutineBlocks(updated.routineBlocks || [])
      setStudyWindows(updated.studyWindows || [])
      setTotalHours(updated.totalStudyHours || 0)
      setSuccessMessage(
        presetType === "CLEAR_ALL"
          ? "Rotina redefinida! Toda a semana está agora livre para estudos."
          : "Template de rotina aplicado com sucesso!"
      )
    } catch (err: any) {
      setError(err.message || "Erro ao aplicar modelo de rotina.")
    } finally {
      setIsSubmitting(false)
    }
  }

  function getCategoryConfig(category: RoutineCategory) {
    return CATEGORIES.find((c) => c.id === category) || CATEGORIES[4]
  }

  const dayRoutineBlocks = routineBlocks.filter((b) => b.dayOfWeek === activeDayTab)
  const dayStudyWindows = studyWindows.filter((w) => w.dayOfWeek === activeDayTab)

  return (
    <section className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border/40 pb-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" /> Disponibilidade e Rotina Semanal
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Cadastre sua rotina fora dos estudos (trabalho, sono, aulas). O sistema gera automaticamente as janelas livres para agendamento de estudos.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button onClick={openCreateModal} size="sm" className="gap-1 text-xs">
            <Plus className="h-4 w-4" /> Adicionar Compromisso
          </Button>
          <Button onClick={loadData} variant="outline" size="sm" disabled={isLoading} className="gap-1 text-xs">
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} /> Sincronizar
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

      {/* Overview Metric Cards */}
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
        <Card className="border-border/60 bg-card shadow-xs">
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">
              Total de Horas para Estudos
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0 flex items-center justify-between">
            <div>
              <span className="text-2xl font-bold tracking-tight text-primary">{totalHours} hrs</span>
              <p className="text-[11px] text-muted-foreground">disponíveis nesta semana</p>
            </div>
            <div className="rounded-md bg-primary/10 p-2 text-primary">
              <Zap className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card shadow-xs">
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">
              Média Diária Disponível
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0 flex items-center justify-between">
            <div>
              <span className="text-2xl font-bold tracking-tight">{Math.round((totalHours / 7) * 10) / 10} hrs</span>
              <p className="text-[11px] text-muted-foreground">por dia para cronogramas</p>
            </div>
            <div className="rounded-md bg-muted p-2 text-muted-foreground">
              <Calendar className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/60 bg-card shadow-xs">
          <CardHeader className="p-4 pb-1">
            <CardDescription className="text-[10px] uppercase font-semibold tracking-wider text-muted-foreground">
              Bloqueios de Rotina
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 pt-0 flex items-center justify-between">
            <div>
              <span className="text-2xl font-bold tracking-tight">{routineBlocks.length}</span>
              <p className="text-[11px] text-muted-foreground">atividades cadastradas</p>
            </div>
            <div className="rounded-md bg-muted p-2 text-muted-foreground">
              <Briefcase className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Preset Quick Templates */}
      <Card className="border-border/60 bg-muted/30">
        <CardHeader className="p-4 pb-2">
          <CardTitle className="text-sm font-bold flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-amber-500" /> Modelos Rápidos de Rotina
          </CardTitle>
          <CardDescription className="text-xs">
            Aplique um modelo pré-definido para preencher rapidamente a sua semana com compromissos padrão.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 pt-0 flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={isSubmitting}
            onClick={() => applyPreset("WORK_AND_SLEEP")}
            className="text-xs bg-background"
          >
            Trabalho (8h-17h) + Sono (23h-7h)
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={isSubmitting}
            onClick={() => applyPreset("COLLEGE_STUDENT")}
            className="text-xs bg-background"
          >
            Faculdade (8h-12h) + Estágio (14h-18h)
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={isSubmitting}
            onClick={() => applyPreset("CLEAR_ALL")}
            className="text-xs text-destructive hover:bg-destructive/10"
          >
            Zerar Rotina
          </Button>
        </CardContent>
      </Card>

      {/* Day Selector Tabs */}
      <div className="space-y-4">
        <div className="flex overflow-x-auto gap-1 border-b border-border pb-1 no-scrollbar">
          {DAYS.map((day) => {
            const hasRoutine = routineBlocks.some((b) => b.dayOfWeek === day.id)
            const dayWindows = studyWindows.filter((w) => w.dayOfWeek === day.id)
            const dayMins = dayWindows.reduce((sum, w) => sum + w.durationMinutes, 0)
            const dayHrs = Math.round((dayMins / 60) * 10) / 10

            return (
              <button
                key={day.id}
                onClick={() => setActiveDayTab(day.id)}
                className={`flex-1 min-w-[100px] py-2 px-3 rounded-t-md text-left transition-colors text-xs border-b-2 ${
                  activeDayTab === day.id
                    ? "border-primary bg-primary/5 text-primary font-bold"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50"
                }`}
              >
                <div className="font-semibold text-sm">{day.short}</div>
                <div className="text-[10px] text-muted-foreground flex items-center justify-between mt-0.5">
                  <span>{dayHrs}h estudos</span>
                  {hasRoutine && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                </div>
              </button>
            )
          })}
        </div>

        {/* Day Content: Blockers + Free Study Windows */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left Column: Routine Blockers */}
          <Card className="border-border/60">
            <CardHeader className="p-4 border-b border-border/40 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm font-bold">
                  Compromissos ({DAYS.find((d) => d.id === activeDayTab)?.full})
                </CardTitle>
                <CardDescription className="text-xs">Atividades em que você NÃO está estudando</CardDescription>
              </div>
              <Button size="sm" variant="ghost" onClick={openCreateModal} className="h-7 px-2 text-xs">
                <Plus className="h-3.5 w-3.5 mr-1" /> Criar
              </Button>
            </CardHeader>
            <CardContent className="p-4 space-y-2">
              {dayRoutineBlocks.length === 0 ? (
                <div className="text-center py-6 text-xs text-muted-foreground">
                  Nenhum compromisso cadastrado para este dia. O dia inteiro está livre para estudos!
                </div>
              ) : (
                dayRoutineBlocks.map((block) => {
                  const catConfig = getCategoryConfig(block.category)
                  const Icon = catConfig.icon

                  return (
                    <div
                      key={block.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-card text-xs hover:border-border transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-md border ${catConfig.colorClass}`}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div>
                          <p className="font-semibold text-foreground">{block.title}</p>
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                            <span className="font-medium">{block.startTime} às {block.endTime}</span>
                            <span>•</span>
                            <span>{catConfig.label}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => openEditModal(block)}
                        >
                          <Edit className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => block.id && handleDelete(block.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>

          {/* Right Column: Calculated Free Study Windows */}
          <Card className="border-border/60 bg-card">
            <CardHeader className="p-4 border-b border-border/40">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Zap className="h-4 w-4 text-emerald-500" /> Janelas Livres para Estudo
              </CardTitle>
              <CardDescription className="text-xs">
                Geradas automaticamente por inversão (mínimo 30min por janela — RN-AVL-04)
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-2">
              {dayStudyWindows.length === 0 ? (
                <div className="text-center py-6 text-xs text-muted-foreground">
                  Sem janelas de estudo superiores a 30 minutos disponíveis neste dia.
                </div>
              ) : (
                dayStudyWindows.map((win) => {
                  const hrs = Math.floor(win.durationMinutes / 60)
                  const mins = win.durationMinutes % 60
                  const timeLabel = hrs > 0 ? `${hrs}h${mins > 0 ? ` ${mins}m` : ""}` : `${mins} min`

                  return (
                    <div
                      key={win.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-emerald-500" />
                        <span className="font-semibold text-foreground">
                          {win.startTime} — {win.endTime}
                        </span>
                      </div>
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[11px]">
                        {timeLabel} de estudo
                      </Badge>
                    </div>
                  )
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal / Dialog for Add / Edit Routine Block */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-lg border bg-background p-6 shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-sm">
                {editingId ? "Editar Compromisso" : "Adicionar Compromisso de Rotina"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-4 text-xs">
              <div className="space-y-1.5">
                <Label htmlFor="title" className="text-xs">Título da Atividade</Label>
                <Input
                  id="title"
                  placeholder="Ex: Trabalho, Sono Noturno, Aulas"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="text-xs"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="category" className="text-xs">Categoria</Label>
                <select
                  id="category"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as RoutineCategory)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              {!editingId && (
                <div className="space-y-1.5">
                  <Label className="text-xs">Dias da Semana</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {DAYS.map((day) => {
                      const isSelected = selectedDays.includes(day.id)
                      return (
                        <button
                          type="button"
                          key={day.id}
                          onClick={() => {
                            if (isSelected) {
                              if (selectedDays.length > 1) {
                                setSelectedDays(selectedDays.filter((d) => d !== day.id))
                              }
                            } else {
                              setSelectedDays([...selectedDays, day.id])
                            }
                          }}
                          className={`px-2.5 py-1 rounded text-xs border transition-colors ${
                            isSelected
                              ? "bg-primary text-primary-foreground border-primary font-semibold"
                              : "bg-muted text-muted-foreground border-border hover:bg-muted/80"
                          }`}
                        >
                          {day.short}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="startTime" className="text-xs">Horário de Início</Label>
                  <Input
                    id="startTime"
                    type="time"
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    className="text-xs"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="endTime" className="text-xs">Horário de Término</Label>
                  <Input
                    id="endTime"
                    type="time"
                    value={formEndTime}
                    onChange={(e) => setFormEndTime(e.target.value)}
                    className="text-xs"
                    required
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowModal(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" size="sm" disabled={isSubmitting}>
                  {isSubmitting ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}
