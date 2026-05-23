import { apiRequest } from "@/lib/api-server";
import { getOrganizationContextOrRedirect } from "@/lib/organizations";
import CalculateForm from "./calculate-form";

type CalculatePageProps = {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ month?: string; year?: string; user_id?: string }>;
};

export default async function CalculatePage({ params, searchParams }: CalculatePageProps) {
  const { orgSlug } = await params;
  const query = await searchParams;
  await getOrganizationContextOrRedirect(orgSlug);

  const permsRes = await apiRequest<{
    modules: Array<{ key: string; permissions: { can_view: boolean } }>;
  }>("/api/v1/auth/permissions", { orgSlug, cache: "no-store" });
  const payrollPerm = permsRes.data?.modules.find((m) => m.key === "payroll")?.permissions ?? { can_view: false };
  if (!payrollPerm.can_view) {
    return <p className="p-6 text-red-600">You do not have permission to view payroll.</p>;
  }

  const now = new Date();
  const selMonth = query.month ? parseInt(query.month) : now.getMonth() + 1;
  const selYear = query.year ? parseInt(query.year) : now.getFullYear();

  const { data: employees } = await apiRequest<Array<{ id: string; user_id: string; user?: { full_name?: string; email?: string } }>>(
    `/api/v1/payroll/employees?status=active`, { orgSlug }
  );

  let calculation: Record<string, unknown> | null = null;
  if (query.user_id) {
    const res = await apiRequest<Record<string, unknown>>(
      `/api/v1/payroll/calculate/${query.user_id}?month=${selMonth}&year=${selYear}`, { orgSlug }
    );
    if (res.data) calculation = res.data;
  }

  let allCalculations: Array<Record<string, unknown>> = [];
  if (!query.user_id) {
    const res = await apiRequest<Array<Record<string, unknown>>>(
      `/api/v1/payroll/calculate?month=${selMonth}&year=${selYear}`, { orgSlug }
    );
    if (res.data) allCalculations = res.data;
  }

  return (
    <CalculateForm
      orgSlug={orgSlug}
      selMonth={selMonth}
      selYear={selYear}
      selectedUserId={query.user_id || ""}
      employees={employees || []}
      calculation={calculation as any}
      allCalculations={allCalculations as any}
    />
  );
}
