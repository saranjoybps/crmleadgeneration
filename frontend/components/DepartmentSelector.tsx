"use client";

import { useState, useEffect } from "react";
import { Building } from "lucide-react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

import { Department } from "@/lib/types";
import { apiRequest } from "@/lib/api-client";

interface DepartmentSelectorProps {
  orgSlug: string;
  value?: string;
  name?: string;
  onChange?: (departmentId: string) => void;
  placeholder?: string;
  showAllOption?: boolean;
  className?: string;
}

export function DepartmentSelector({
  orgSlug,
  value,
  name,
  onChange,
  placeholder = "Select department...",
  showAllOption = false,
  className = ""
}: DepartmentSelectorProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    loadDepartments();
  }, []);

  const loadDepartments = async () => {
    try {
      setLoading(true);
      const result = await apiRequest<Department[]>("/api/v1/departments", { orgSlug });
      if (result.error) {
        console.error("Load departments error:", result.error);
        return;
      }
      setDepartments(result.data || []);
    } catch (err) {
      console.error("Load departments error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (val: string) => {
    if (onChange) {
      onChange(val);
    } else if (name) {
      const params = new URLSearchParams(searchParams.toString());
      if (val) {
        params.set(name, val);
      } else {
        params.delete(name);
      }
      router.push(`${pathname}?${params.toString()}`);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <select
        name={name}
        value={value || ""}
        onChange={(e) => handleChange(e.target.value)}
        className="w-full px-4 py-3 rounded-xl border border-soft bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all appearance-none"
        disabled={loading}
      >
        <option value="">{loading ? "Loading..." : placeholder}</option>
        {showAllOption && <option value="">All Departments</option>}
        {departments.map((dept) => (
          <option key={dept.id} value={dept.id}>
            {dept.name}
          </option>
        ))}
      </select>
      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
        <Building className="h-4 w-4 text-muted" />
      </div>
    </div>
  );
}