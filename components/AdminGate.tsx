"use client";

import type { FormEvent, ReactNode } from "react";
import { useEffect, useState } from "react";

const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || "admin@1sme.local";
const ADMIN_PASSWORD_HASH =
  process.env.NEXT_PUBLIC_ADMIN_PASSWORD_SHA256 ||
  "87214111a6ff79a7593712c8fd5ca55bfc3022ba046bf8e48cc7a541c6df3ce6";
const ADMIN_SESSION_KEY = "1sme-admin-session";

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function AdminGate({ children }: { children: ReactNode }) {
  const [email, setEmail] = useState(ADMIN_EMAIL);
  const [password, setPassword] = useState("");
  const [authenticated, setAuthenticated] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setAuthenticated(window.localStorage.getItem(ADMIN_SESSION_KEY) === "ok");
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const emailMatches = email.trim().toLocaleLowerCase() === ADMIN_EMAIL.toLocaleLowerCase();
    const passwordMatches = (await sha256(password)) === ADMIN_PASSWORD_HASH;
    if (!emailMatches || !passwordMatches) {
      setError("账号或密码不正确。");
      return;
    }
    window.localStorage.setItem(ADMIN_SESSION_KEY, "ok");
    setAuthenticated(true);
  }

  function logout() {
    window.localStorage.removeItem(ADMIN_SESSION_KEY);
    setPassword("");
    setAuthenticated(false);
  }

  if (authenticated) {
    return (
      <div>
        <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">ADMIN SESSION</p>
            <h2 className="mt-1 text-base font-bold text-slate-950">{ADMIN_EMAIL}</h2>
          </div>
          <button
            type="button"
            onClick={logout}
            className="min-h-10 rounded-lg border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
          >
            退出管理员
          </button>
        </div>
        {children}
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wide text-teal-700">ADMIN ONLY</p>
      <h1 className="mt-2 text-2xl font-bold text-slate-950">管理员登录</h1>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        本地密码用于隐藏管理入口；公网部署时请再用 Cloudflare Access 按你的邮箱做真正的账号放行。
      </p>
      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-700">管理员账号</span>
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
            autoComplete="username"
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-700">密码</span>
          <input
            value={password}
            type="password"
            onChange={(event) => setPassword(event.target.value)}
            className="h-11 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm text-slate-900 outline-none transition focus:border-slate-400 focus:bg-white"
            autoComplete="current-password"
          />
        </label>
        {error ? <p className="text-sm font-medium text-rose-600">{error}</p> : null}
        <button
          type="submit"
          className="min-h-11 w-full rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-700"
        >
          进入管理员页面
        </button>
      </form>
      <p className="mt-4 text-xs leading-5 text-slate-400">
        当前管理员账号：{ADMIN_EMAIL}。上线前请更换环境变量，并用 Cloudflare Access 做邮箱放行。
      </p>
    </section>
  );
}
