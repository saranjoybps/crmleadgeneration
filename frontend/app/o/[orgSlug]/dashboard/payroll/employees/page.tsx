import { getOrganizationContextOrRedirect } from "@/lib/organizations";
import { getPermissions } from "@/lib/api-data";
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
  const [orgAndPerms, salariesRes, compsRes] = await Promise.all([
    Promise.all([getOrganizationContextOrRedirect(orgSlug), getPermissions(orgSlug)]),
    apiRequest<EmployeeSalary[]>("/api/v1/payroll/employees", { orgSlug }),
    apiRequest<SalaryComponent[]>("/api/v1/payroll/components", { orgSlug }),
  ]);

  const permsRes = orgAndPerms[1];
  const payrollPerm = permsRes.data?.modules.find((m) => m.key === "payroll")?.permissions ?? {
    can_view: false, can_create: false, can_edit: false, can_delete: false,
  };
  if (!payrollPerm.can_view) {
    return <p className="p-6 text-red-600">You do not have permission to view payroll.</p>;
  }
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
