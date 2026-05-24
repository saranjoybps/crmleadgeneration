import { getOrganizationContextOrRedirect } from "@/lib/organizations";
import { apiRequest } from "@/lib/api-server";
import type { EmployeeSalary, SalaryComponent } from "@/lib/types";
import EmployeesContent from "./EmployeesContent";

type PageProps = {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
};

export default async function PayrollEmployeesPage({ params, searchParams }: PageProps) {
  const { orgSlug } = await params;
  const query = await searchParams;
  await getOrganizationContextOrRedirect(orgSlug);

  const permsRes = await apiRequest<{
    modules: Array<{ key: string; permissions: { can_view: boolean; can_create: boolean; can_edit: boolean; can_delete: boolean } }>;
  }>("/api/v1/auth/permissions", { orgSlug, cache: "no-store" });
  const payrollPerm = permsRes.data?.modules.find((m) => m.key === "payroll")?.permissions ?? {
    can_view: false, can_create: false, can_edit: false, can_delete: false,
  };
  if (!payrollPerm.can_view) {
    return <p className="p-6 text-red-600">You do not have permission to view payroll.</p>;
  }

  const [salariesRes, compsRes] = await Promise.all([
    apiRequest<EmployeeSalary[]>("/api/v1/payroll/employees", { orgSlug }),
    apiRequest<SalaryComponent[]>("/api/v1/payroll/components", { orgSlug }),
  ]);
  const salaries = salariesRes.data;
  const components = compsRes.data;

  return (
    <EmployeesContent
      orgSlug={orgSlug}
      salaries={salaries}
      components={components}
      query={query}
      payrollPerm={payrollPerm}
    />
  );
}
