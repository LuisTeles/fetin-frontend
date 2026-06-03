export default function AuthLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_20%_20%,oklch(0.95_0.03_250),transparent_35%),radial-gradient(circle_at_80%_80%,oklch(0.93_0.02_120),transparent_40%),oklch(0.98_0_0)] p-4">
            <div className="w-full max-w-md">{children}</div>
        </div>
    )
}
