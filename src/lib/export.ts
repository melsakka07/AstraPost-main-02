/**
 * CSV export utilities for admin panels
 */

/**
 * Download CSV content as a file
 * @param filename - e.g., "transactions.csv"
 * @param csvContent - Raw CSV string
 */
export function downloadCsv(filename: string, csvContent: string): void {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);

  link.click();

  // Cleanup
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Fetch CSV export from API and trigger download
 * @param url - API endpoint URL (e.g., "/api/admin/billing/transactions/export")
 * @param filename - File to save as (e.g., "transactions.csv")
 * @param toastFn - Optional toast function for feedback
 * @returns Promise that resolves after download is triggered
 */
export async function fetchAndDownloadCsv(
  url: string,
  filename: string,
  toastFn?: { success: (msg: string) => void; error: (msg: string) => void }
): Promise<void> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Export failed: ${response.statusText}`);
    }

    const contentType = response.headers.get("content-type") || "";

    let csvContent: string;

    if (contentType.includes("application/json")) {
      // API returned JSON { data: "csv string" }
      const json = await response.json();
      csvContent = json.data;
      if (typeof csvContent !== "string") {
        throw new Error("Invalid CSV data format");
      }
    } else if (contentType.includes("text/csv")) {
      // API returned plain CSV
      csvContent = await response.text();
    } else {
      throw new Error("Unexpected response format");
    }

    downloadCsv(filename, csvContent);

    if (toastFn?.success) {
      toastFn.success(`Exported to ${filename}`);
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to export CSV";
    if (toastFn?.error) {
      toastFn.error(message);
    }
    throw err;
  }
}
