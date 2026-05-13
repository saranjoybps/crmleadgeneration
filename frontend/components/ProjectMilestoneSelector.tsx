"use client";

import { useState, useEffect } from "react";
import { Milestone } from "@/lib/types";

type ProjectMilestoneSelectorProps = {
  projects: Array<{ id: string; name: string }>;
  milestones: Milestone[];
  defaultProjectId?: string;
  defaultMilestoneId?: string;
  orgSlug: string;
};

export function ProjectMilestoneSelector({ 
  projects, 
  milestones: initialMilestones, 
  defaultProjectId = "", 
  defaultMilestoneId = "" 
}: ProjectMilestoneSelectorProps) {
  const [selectedProjectId, setSelectedProjectId] = useState(defaultProjectId);
  const [filteredMilestones, setFilteredMilestones] = useState<Milestone[]>([]);

  useEffect(() => {
    if (selectedProjectId) {
      setFilteredMilestones(initialMilestones.filter(m => m.project_id === selectedProjectId));
    } else {
      setFilteredMilestones([]);
    }
  }, [selectedProjectId, initialMilestones]);

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-main">Select Project</label>
        <select 
          name="project_id" 
          required 
          value={selectedProjectId}
          onChange={(e) => setSelectedProjectId(e.target.value)}
          className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500"
        >
          <option value="">Choose a project...</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-main">Milestone</label>
        <select 
          name="milestone_id" 
          defaultValue={defaultMilestoneId}
          className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500"
        >
          <option value="">None</option>
          {filteredMilestones.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </div>
    </div>
  );
}
