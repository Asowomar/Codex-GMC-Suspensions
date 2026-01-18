import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user) {
    redirect("/api/auth/signin");
  }

  return (
    <div className="min-h-screen bg-fog">
      <header className="px-6 md:px-10 lg:px-16 py-6 flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-500">GMC Compliance Scanner</p>
          <h1 className="font-display text-2xl">E-commerce Dashboard</h1>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <a href="/app/custom-rules" className="text-slate-600 hover:text-ink">
            Custom rules
          </a>
          <span className="text-slate-600">{session.user.email}</span>
        </div>
      </header>
      <main className="section max-w-6xl mx-auto">{children}</main>
    </div>
  );
}
