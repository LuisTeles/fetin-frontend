"use client"

import { useEffect, useState } from "react"
import { Clock } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"

const MIN_MINUTES = 30
const MAX_MINUTES = 1440

type SettingsResponse = { maxDailyStudyMinutes?: number; message?: string }

/** D4: the most study time any single day may hold, across all active schedules. */
export function StudySettingsCard() {
    const [saved, setSaved] = useState<number | null>(null)
    const [hours, setHours] = useState<string>("")
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const [isSaving, setIsSaving] = useState(false)

    useEffect(() => {
        let active = true
        async function load() {
            const response = await fetch("/api/settings", { cache: "no-store" })
            const payload = (await response.json().catch(() => ({}))) as SettingsResponse
            if (!active) return
            if (!response.ok || payload.maxDailyStudyMinutes === undefined) {
                setError(payload.message ?? "Não foi possível carregar as preferências.")
                return
            }
            setSaved(payload.maxDailyStudyMinutes)
            setHours(String(payload.maxDailyStudyMinutes / 60))
        }
        void load()
        return () => {
            active = false
        }
    }, [])

    const minutes = Math.round(Number(hours.replace(",", ".")) * 60)
    const isValid = Number.isFinite(minutes) && minutes >= MIN_MINUTES && minutes <= MAX_MINUTES

    async function handleSubmit(event: React.FormEvent) {
        event.preventDefault()
        if (!isValid) return
        setIsSaving(true)
        setError(null)
        setSuccess(null)
        try {
            const response = await fetch("/api/settings", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ maxDailyStudyMinutes: minutes }),
            })
            const payload = (await response.json().catch(() => ({}))) as SettingsResponse
            if (!response.ok || payload.maxDailyStudyMinutes === undefined) {
                setError(payload.message ?? "Não foi possível salvar.")
                return
            }
            setSaved(payload.maxDailyStudyMinutes)
            setSuccess("Limite salvo. Vale para os próximos cronogramas que você gerar.")
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                    <Clock className="h-4 w-4" /> Preferências de estudo
                </CardTitle>
                <CardDescription>
                    O cronograma nunca coloca mais do que isso em um único dia, somando todas as provas.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                {error && (
                    <Alert variant="destructive">
                        <AlertTitle>Atenção</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}
                {success && (
                    <Alert>
                        <AlertTitle>Pronto</AlertTitle>
                        <AlertDescription>{success}</AlertDescription>
                    </Alert>
                )}

                {saved === null && !error ? (
                    <Skeleton className="h-9 w-48" />
                ) : (
                    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
                        <div className="space-y-1">
                            <Label htmlFor="maxDailyStudyHours" className="text-xs">
                                Máximo de horas de estudo por dia
                            </Label>
                            <Input
                                id="maxDailyStudyHours"
                                inputMode="decimal"
                                value={hours}
                                onChange={(e) => setHours(e.target.value)}
                                className="w-32"
                                aria-invalid={!isValid}
                            />
                            <p className="text-xs text-muted-foreground">
                                Entre 0,5 h e 24 h. Padrão: 6 h.
                            </p>
                        </div>
                        <Button type="submit" size="sm" disabled={!isValid || isSaving || minutes === saved}>
                            {isSaving ? "Salvando..." : "Salvar"}
                        </Button>
                    </form>
                )}
            </CardContent>
        </Card>
    )
}
