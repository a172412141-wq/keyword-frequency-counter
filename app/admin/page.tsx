"use client";

import { AdminGate } from "@/components/AdminGate";
import { ServiceLauncherPanel } from "@/components/ServiceLauncherPanel";

export default function AdminPage() {
  return (
    <main className="min-h-screen px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <nav className="mb-8 flex w-full flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-sm sm:inline-flex sm:w-auto">
          <a
            href="../"
            className="inline-flex min-h-10 items-center rounded-lg px-4 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            返回平台
          </a>
          <span className="inline-flex min-h-10 items-center rounded-lg bg-teal-600 px-4 text-sm font-semibold text-white shadow-sm">
            管理员
          </span>
        </nav>

        <AdminGate>
          <header className="mb-8 max-w-4xl sm:mb-10">
            <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-teal-700">
              <span className="h-px w-8 bg-teal-500" />
              ADMIN CONSOLE
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">
              管理员页面
            </h1>
            <p className="mt-4 text-base leading-7 text-slate-600 sm:text-lg">
              管理本地工具启动器、查看服务状态，并按 0 成本公网方案配置访问控制。
            </p>
          </header>

          <ServiceLauncherPanel />

          <section className="grid gap-4 lg:grid-cols-3">
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-bold text-slate-950">0 成本公网方式</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                用 Cloudflare Tunnel 暴露本机或服务器服务，再用 Cloudflare Access 按你的邮箱放行。
              </p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-bold text-slate-950">建议访问策略</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                `/admin` 只允许你的邮箱；上传工具可允许团队邮箱，或同样只允许你本人。
              </p>
            </article>
            <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-base font-bold text-slate-950">上线前要改</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                设置 `NEXT_PUBLIC_ADMIN_EMAIL` 和 `NEXT_PUBLIC_ADMIN_PASSWORD_SHA256`，不要使用默认本地密码。
              </p>
            </article>
          </section>
        </AdminGate>
      </div>
    </main>
  );
}
