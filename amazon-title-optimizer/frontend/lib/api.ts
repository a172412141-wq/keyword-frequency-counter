export type ComplianceStatus = "PASS" | "FAIL";

export type OptimizationResult = {
  original: string;
  status: ComplianceStatus;
  issues: string[];
  optimized_title: string;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000";

export async function batchOptimizeTitleFile(file: File): Promise<OptimizationResult[]> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE_URL}/api/title/batch-optimize`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  return response.json();
}

async function readApiError(response: Response): Promise<string> {
  try {
    const payload = await response.json();
    if (typeof payload.detail === "string") {
      return payload.detail;
    }
  } catch {
    return "Unable to process the workbook.";
  }

  return "Unable to process the workbook.";
}
