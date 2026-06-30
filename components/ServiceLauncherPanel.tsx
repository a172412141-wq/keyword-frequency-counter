"use client";

import { useEffect, useMemo, useState } from "react";

const LAUNCHER_URL = process.env.NEXT_PUBLIC_LAUNCHER_URL || "http://127.0.0.1:8787";

type LauncherService = {
  id: string;
  label: string;
  description: string;
  url: string;
  running: boolean;
  missing: boolean;
  logPath: string;
};

const FALLBACK_SERVICES: LauncherService[] = [
  {
    id: "bulk",
    label: "Bulk 表分析",
    description: "Amazon Ads Bulk 诊断表生成器",
    url: "http://127.0.0.1:8000/",
    running: false,
    missing: false,
    logPath: ".launcher-logs/bulk.log",
  },
  {
    id: "business",
    label: "经营分析",
    description: "Amazon 库存利润经营分析工具",
    url: "http://127.0.0.1:8501/",
    running: false,
    missing: false,
    logPath: ".launcher-logs/business.log",
  },
];

type ServicesResponse = {
  services: LauncherService[];
};

export function ServiceLauncherPanel() {
  const [services, setServices] = useState<LauncherService[]>(FALLBACK_SERVICES);
  const [launcherOnline, setLauncherOnline] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const runningCount = useMemo(
    () => services.filter((service) => service.running).length,
    [services],
  );

  async function refresh() {
    try {
      const response = await fetch(`${LAUNCHER_URL}/api/services`, { cache: "no-store" });
      if (!response.ok) throw new Error(`Launcher returned ${response.status}`);
      const data = (await response.json()) as ServicesResponse;
      setServices(data.services);
      setLauncherOnline(true);
      setMessage("");
    } catch {
      setLauncherOnline(false);
      setServices((current) => current.map((service) => ({ ...service, running: false })));
    }
  }

  async function startService(serviceId: string) {
    setBusyId(serviceId);
    setMessage("");
    try {
      const response = await fetch(`${LAUNCHER_URL}/api/services/${serviceId}/start`, {
        method: "POST",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "启动失败");
      await refresh();
      setMessage(data.alreadyRunning ? "服务已经在运行。" : "启动请求已发送。");
    } catch (error) {
      const detail = error instanceof Error ? error.message : "启动失败";
      setMessage(`无法启动：${detail}`);
      setLauncherOnline(false);
    } finally {
      setBusyId(null);
    }
  }

  async function startAll() {
    setBusyId("all");
    setMessage("");
    try {
      const response = await fetch(`${LAUNCHER_URL}/api/services/start-all`, { method: "POST" });
      if (!response.ok) throw new Error(`Launcher returned ${response.status}`);
      await refresh();
      setMessage("启动请求已发送。");
    } catch (error) {
      const detail = error instanceof Error ? error.message : "启动失败";
      setMessage(`无法启动：${detail}`);
      setLauncherOnline(false);
    } finally {
      setBusyId(null);
    }
  }

  useEffect(() => {
    const initial = window.setTimeout(() => {
      void refresh();
    }, 0);
    const timer = window.setInterval(() => {
      void refresh();
    }, 5000);
    return () => {
      window.clearTimeout(initial);
      window.clearInterval(timer);
    };
  }, []);

  return (
    <section className="mb-8 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-bold text-slate-950">本地工具启动中心</h2>
            <span
              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                launcherOnline ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
              }`}
            >
              {launcherOnline ? `已连接 · ${runningCount}/${services.length} 运行中` : "启动器未连接"}
            </span>
          </div>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            先启动这里的本地服务，再切到对应工具页上传文件分析。
          </p>
        </div>
        <button
          type="button"
          onClick={startAll}
          disabled={!launcherOnline || busyId !== null}
          className="min-h-10 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {busyId === "all" ? "启动中..." : "一键启动全部"}
        </button>
      </div>

      {!launcherOnline ? (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
          请先双击项目里的 <span className="font-semibold">启动1SME工具平台.command</span>，或运行
          <code className="mx-1 rounded bg-white/70 px-1.5 py-0.5">python3 platform_launcher.py</code>
          后刷新页面。
        </div>
      ) : null}

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        {services.map((service) => (
          <article
            key={service.id}
            className="rounded-xl border border-slate-200 bg-slate-50/70 p-4"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-bold text-slate-950">{service.label}</h3>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                      service.running ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    {service.running ? "运行中" : "未启动"}
                  </span>
                </div>
                <p className="mt-1 text-sm leading-6 text-slate-500">{service.description}</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => startService(service.id)}
                  disabled={!launcherOnline || service.running || busyId !== null || service.missing}
                  className="min-h-9 rounded-lg bg-teal-600 px-3 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {busyId === service.id ? "启动中" : service.running ? "已启动" : "启动"}
                </button>
                <a
                  href={service.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-9 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
                >
                  打开
                </a>
              </div>
            </div>
            {service.missing ? (
              <p className="mt-3 text-xs leading-5 text-rose-600">未找到工具目录，请检查本地路径。</p>
            ) : (
              <p className="mt-3 break-words text-xs leading-5 text-slate-400">日志：{service.logPath}</p>
            )}
          </article>
        ))}
      </div>

      {message ? <p className="mt-3 text-sm font-medium text-slate-600">{message}</p> : null}
    </section>
  );
}
