"use client";

import { Building } from "lucide-react";

import { Badge } from "@/components/ui/Badge";

interface DepartmentBadgeProps {
  departmentName: string;
  className?: string;
}

export function DepartmentBadge({ departmentName, className = "" }: DepartmentBadgeProps) {
  return (
    <Badge variant="secondary" className={`gap-1 text-xs ${className}`}>
      <Building className="h-3 w-3" />
      {departmentName}
    </Badge>
  );
}