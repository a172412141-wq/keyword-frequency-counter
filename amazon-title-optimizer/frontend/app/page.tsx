import { UploadTable } from "@/components/UploadTable";

export default function Home() {
  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-col gap-3 border-b border-slate-200 pb-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-blue-700">Amazon Compliance MVP</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Amazon Title Batch Optimizer Tool
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 sm:text-base">
              Batch upload product titles, detect compliance issues, and generate cleaner titles capped at 75 characters.
            </p>
          </div>
          <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700">
            v1.0
          </div>
        </header>

        <UploadTable />
      </div>
    </main>
  );
}
