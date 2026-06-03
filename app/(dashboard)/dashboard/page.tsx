import { DashboardActions } from "@/components/auth/dashboard-actions"
import { ProfilePanel } from "@/components/auth/profile-panel"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function DashboardPage() {
    return (
        <section className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>Painel de validacao de backend</CardTitle>
                    <CardDescription>
                        Esta tela valida login, refresh de sessao, perfil e logout sem CRUD completo de dominio.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <DashboardActions />
                </CardContent>
            </Card>

            <ProfilePanel />
        </section>
    )
}
