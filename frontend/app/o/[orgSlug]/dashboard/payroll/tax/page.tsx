import { getOrganizationContextOrRedirect } from "@/lib/organizations";
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
  await getOrganizationContextOrRedirect(orgSlug);

  const permsRes = await apiRequest<{
    modules: Array<{ key: string; permissions: { can_view: boolean; can_create: boolean; can_delete: boolean } }>;
  }>("/api/v1/auth/permissions", { orgSlug, cache: "no-store" });
  const payrollPerm = permsRes.data?.modules.find((m) => m.key === "payroll")?.permissions ?? {
    can_view: false, can_create: false, can_delete: false,
  };
  if (!payrollPerm.can_view) {
    return <p className="p-6 text-red-600">You do not have permission to view payroll.</p>;
  }

  const currentYear = new Date().getFullYear();
  const defaultFY = `${currentYear}-${currentYear + 1}`;
  const { data: slabs } = await apiRequest<TaxSlab[]>(`/api/v1/payroll/tax-slabs?financial_year=${defaultFY}`, { orgSlug });

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
