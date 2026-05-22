import * as XLSX from "xlsx";

type Column = {
  key: string;
  label: string;
};

export function downloadExcel(data: Record<string, unknown>[], columns: Column[], filename: string): void {
  const wsData: unknown[][] = [columns.map((c) => c.label)];
  for (const row of data) {
    wsData.push(columns.map((c) => row[c.key] ?? ""));
  }
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Report");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function downloadCsv(data: Record<string, unknown>[], columns: Column[], filename: string): void {
  const wsData: unknown[][] = [columns.map((c) => c.label)];
  for (const row of data) {
    wsData.push(columns.map((c) => row[c.key] ?? ""));
  }
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const csv = XLSX.utils.sheet_to_csv(ws);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
