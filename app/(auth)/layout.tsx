export default function AuthLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[radial-gradient(circle_at_20%_20%,oklch(0.96_0_0),transparent_40%),radial-gradient(circle_at_80%_80%,oklch(0.94_0_0),transparent_40%),oklch(0.98_0_0)] dark:bg-neutral-950 p-4">
            <div className="w-full max-w-sm">{children}</div>
        </div>
    )
}
