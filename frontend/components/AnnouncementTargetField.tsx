"use client";

import { useState } from "react";

import { MultiSelect } from "@/components/MultiSelect";

type Props = {
  departments: Array<{ id: string; name: string }>;
  users: Array<{ id: string; full_name: string; email: string }>;
  initialTargetType?: string;
  initialTargetIds?: string[];
};

export function AnnouncementTargetField({ departments, users, initialTargetType = "all", initialTargetIds = [] }: Props) {
  const [targetType, setTargetType] = useState(initialTargetType);
  const [targetIds, setTargetIds] = useState<string[]>(initialTargetIds);

  const deptOptions = departments.map((d) => ({ label: d.name, value: d.id }));
  const userOptions = users.map((u) => ({ label: u.full_name || u.email, value: u.id }));

  const buttonClass = (active: boolean) =>
    `rounded-xl px-4 py-2 text-sm font-bold transition ${active ? "bg-violet-600 text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`;

  return (
    <div className="space-y-4">
      <input type="hidden" name="target_type" value={targetType} />
      {targetIds.map((id) => (
        <input key={id} type="hidden" name="target_ids" value={id} />
      ))}

      <div className="space-y-1.5">
        <label className="text-sm font-bold uppercase tracking-wider text-muted">Target Audience</label>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => { setTargetType("all"); setTargetIds([]); }} className={buttonClass(targetType === "all")}>
            All Users
          </button>
          <button type="button" onClick={() => { setTargetType("department"); setTargetIds([]); }} className={buttonClass(targetType === "department")}>
            Department
          </button>
          <button type="button" onClick={() => { setTargetType("user"); setTargetIds([]); }} className={buttonClass(targetType === "user")}>
            Specific Users
          </button>
        </div>
      </div>

      {targetType === "department" && (
        <MultiSelect label="Departments" name="target_ids" options={deptOptions} values={targetIds} onChange={setTargetIds} />
      )}
      {targetType === "user" && (
        <MultiSelect label="Users" name="target_ids" options={userOptions} values={targetIds} onChange={setTargetIds} />
      )}
    </div>
  );
}
