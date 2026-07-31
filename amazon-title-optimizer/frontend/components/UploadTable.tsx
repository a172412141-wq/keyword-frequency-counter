"use client";

import { ChangeEvent, DragEvent, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  Loader2,
  Upload,
  XCircle,
} from "lucide-react";
import { OptimizationResult, batchOptimizeTitleFile } from "@/lib/api";

export function UploadTable() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [fileName, setFileName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<OptimizationResult[]>([]);

  async function processFile(file: File | undefined) {
    if (!file) {
      return;
    }

    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      setError("Upload a valid .xlsx workbook.");
      setResults([]);
      setFileName("");
      return;
    }

    setIsLoading(true);
    setError("");
    setFileName(file.name);

    try {
      const response = await batchOptimizeTitleFile(file);
      setResults(response);
    } catch (caughtError) {
      setResults([]);
      setError(caughtError instanceof Error ? caughtError.message : "Unable to process the workbook.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleInputChange(event: ChangeEvent<HTMLInputElement>) {
    void processFile(event.target.files?.[0]);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    void processFile(event.dataTransfer.files?.[0]);
  }

  function clearResults() {
    setResults([]);
    setError("");
    setFileName("");
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }

  const passCount = results.filter((result) => result.status === "PASS").length;
  const failCount = results.filter((result) => result.status === "FAIL").length;

  return (
    <div className="space-y-6">
      <section className="rounded-lg border border-slate-200 bg-white p-5 shadow-soft">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Upload Excel Workbook</h2>
            <p className="mt-1 text-sm text-slate-600">Required column: Title. Optional columns: Brand, Category.</p>
          </div>
          {(fileName || results.length > 0 || error) && (
            <button
              type="button"
              onClick={clearResults}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-slate-300 px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              <XCircle className="h-4 w-4" aria-hidden="true" />
              Clear
            </button>
          )}
        </div>

        <div
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`flex min-h-48 flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-8 text-center transition ${
            isDragging ? "border-blue-500 bg-blue-50" : "border-slate-300 bg-slate-50"
          }`}
        >
          <FileSpreadsheet className="h-10 w-10 text-blue-700" aria-hidden="true" />
          <div className="mt-3 text-base font-semibold text-slate-950">
            {fileName || "Drop your .xlsx file here"}
          </div>
          <p className="mt-1 max-w-md text-sm text-slate-600">
            The backend reads each row, applies the Amazon title compliance rules, and returns optimized titles.
          </p>

          <input
            ref={inputRef}
            type="file"
            accept=".xlsx"
            onChange={handleInputChange}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={isLoading}
            className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-md bg-blue-700 px-4 text-sm font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Upload className="h-4 w-4" aria-hidden="true" />
            )}
            {isLoading ? "Processing" : "Choose File"}
          </button>
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            <AlertCircle className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}
      </section>

      <section className="rounded-lg border border-slate-200 bg-white shadow-soft">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">Optimization Results</h2>
            <p className="mt-1 text-sm text-slate-600">
              {results.length ? `${results.length} titles processed` : "Results appear after upload."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-sm">
            <SummaryPill label="Pass" value={passCount} tone="pass" />
            <SummaryPill label="Fail" value={failCount} tone="fail" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" className="min-w-72 px-4 py-3 font-semibold">Original Title</th>
                <th scope="col" className="w-28 px-4 py-3 font-semibold">Status</th>
                <th scope="col" className="min-w-64 px-4 py-3 font-semibold">Issues</th>
                <th scope="col" className="min-w-72 px-4 py-3 font-semibold">Optimized Title</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {results.map((result, index) => (
                <tr key={`${result.original}-${index}`} className="align-top">
                  <td className="px-4 py-4 text-slate-800">{result.original}</td>
                  <td className="px-4 py-4">
                    <StatusBadge status={result.status} />
                  </td>
                  <td className="px-4 py-4">
                    {result.issues.length ? (
                      <div className="flex flex-wrap gap-1.5">
                        {result.issues.map((issue) => (
                          <span
                            key={issue}
                            className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-medium text-amber-800"
                          >
                            {issue}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-slate-500">None</span>
                    )}
                  </td>
                  <td className="px-4 py-4 font-medium text-slate-950">{result.optimized_title}</td>
                </tr>
              ))}

              {!results.length && (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-sm text-slate-500">
                    Upload a workbook to analyze titles.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function StatusBadge({ status }: { status: OptimizationResult["status"] }) {
  const pass = status === "PASS";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
        pass ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
      }`}
    >
      {pass ? (
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
      ) : (
        <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
      )}
      {status}
    </span>
  );
}

function SummaryPill({ label, value, tone }: { label: string; value: number; tone: "pass" | "fail" }) {
  return (
    <span
      className={`inline-flex min-w-20 items-center justify-between gap-2 rounded-md border px-3 py-2 font-medium ${
        tone === "pass"
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-red-200 bg-red-50 text-red-800"
      }`}
    >
      <span>{label}</span>
      <span>{value}</span>
    </span>
  );
}
