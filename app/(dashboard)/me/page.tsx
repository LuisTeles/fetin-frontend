import { DashboardActions } from "@/components/auth/dashboard-actions"
import { ProfilePanel } from "@/components/auth/profile-panel"
import { StudySettingsCard } from "@/components/auth/study-settings-card"

export default function MePage() {
    return (
        <section className="space-y-4">
            <ProfilePanel />
            <StudySettingsCard />
            <DashboardActions />
        </section>
    )
}
