import { DashboardActions } from "@/components/auth/dashboard-actions"
import { ProfilePanel } from "@/components/auth/profile-panel"

export default function MePage() {
    return (
        <section className="space-y-4">
            <ProfilePanel />
            <DashboardActions />
        </section>
    )
}
