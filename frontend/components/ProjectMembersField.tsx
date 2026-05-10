"use client";

import { useMemo, useState } from "react";

import { MultiSelect } from "@/components/MultiSelect";

type ProjectMembersFieldProps = {
  users: Array<{ user_id: string; email: string }>;
};

export function ProjectMembersField({ users }: ProjectMembersFieldProps) {
  const [values, setValues] = useState<string[]>([]);

  const options = useMemo(
    () =>
      users.map((user) => ({
        label: `${user.email} (${user.user_id})`,
        value: user.user_id,
      })),
    [users],
  );

  return <MultiSelect label="Project Members" name="member_user_ids" options={options} values={values} onChange={setValues} />;
}
