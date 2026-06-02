import { getOrganizationContextOrRedirect } from "@/lib/organizations";
import { getPermissions } from "@/lib/api-data";
import { apiRequest } from "@/lib/api-server";
import type { TaxSlab } from "@/lib/types";
import TaxContent from "./TaxContent";

type TaxPageProps = {
  params: Promise<{ orgSlug: string }>;
  searchParams: Promise<{ error?: string; success?: string }>;
};

export default async function PayrollTaxPage({ params, searchParams }: TaxPageProps) {
  const { orgSlug } = await params;
  const query = await searchParams;
  const currentYear = new Date().getFullYear();
  const defaultFY = `${currentYear}-${currentYear + 1}`;

  const [orgAndPerms, { data: slabs }] = await Promise.all([
    Promise.all([getOrganizationContextOrRedirect(orgSlug), getPermissions(orgSlug)]),
    apiRequest<TaxSlab[]>(`/api/v1/payroll/tax-slabs?financial_year=${defaultFY}`, { orgSlug }),
  ]);

  const permsRes = orgAndPerms[1];
  const payrollPerm = permsRes.data?.modules.find((m) => m.key === "payroll")?.permissions ?? {
    can_view: false, can_create: false, can_edit: false, can_delete: false,
  };
  if (!payrollPerm.can_view) {
    return <p className="p-6 text-red-600">You do not have permission to view payroll.</p>;
  }

  return (
    <TaxContent
      orgSlug={orgSlug}
      slabs={slabs}
      query={query}
      payrollPerm={payrollPerm}
      defaultFY={defaultFY}
    />
  );
}
