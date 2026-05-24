"use client";

import React, { useMemo, memo } from 'react';
import { Gantt, Task, ViewMode } from '@wamra/gantt-task-react';
import type { TaskOrEmpty } from '@wamra/gantt-task-react';
import "@wamra/gantt-task-react/dist/style.css";

interface GanttChartProps {
  tasks: any[];
  milestones?: any[];
  tickets?: any[];
  onTaskChange?: (task: TaskOrEmpty) => void;
}

export const GanttChart = memo(function GanttChart({ tasks, milestones, tickets, onTaskChange }: GanttChartProps) {
  const ganttTasks: Task[] = useMemo(() => {
    const items: Task[] = [];

    if (milestones && milestones.length > 0) {
      milestones.forEach(m => {
        items.push({
          start: new Date(m.due_date),
          end: new Date(m.due_date),
          name: `🚩 ${m.name}`,
          id: m.id,
          type: 'milestone',
          progress: m.status === 'completed' ? 100 : 0,
          isDisabled: true,
          styles: {
            barProgressColor: '#f59e0b',
            barProgressSelectedColor: '#d97706',
            barBackgroundColor: '#fef3c7',
            barBackgroundSelectedColor: '#fde68a',
          },
          parent: m.project_id,
        });

        const linkedTickets = tickets?.filter(t => t.milestone_id === m.id) || [];
        linkedTickets.forEach(t => {
          items.push({
            start: t.start_date ? new Date(t.start_date) : new Date(t.created_at),
            end: t.due_date ? new Date(t.due_date) : new Date(new Date(t.start_date || t.created_at).getTime() + 24 * 60 * 60 * 1000),
            name: `🎟️ ${t.title}`,
            id: t.id,
            type: 'task',
            progress: t.status === 'closed' ? 100 : t.status === 'review' ? 80 : t.status === 'in_progress' ? 50 : 0,
            isDisabled: true,
            styles: {
            barProgressColor: '#10b981',
                barProgressSelectedColor: '#059669',
                barBackgroundColor: '#d1fae5',
                barBackgroundSelectedColor: '#a7f3d0',
            },
            parent: t.project_id,
          });

          const linkedTasks = tasks?.filter(tsk => tsk.ticket_id === t.id) || [];
          linkedTasks.forEach(tsk => {
             items.push({
              start: tsk.start_date ? new Date(tsk.start_date) : new Date(tsk.created_at),
              end: tsk.due_date ? new Date(tsk.due_date) : new Date(new Date(tsk.start_date || tsk.created_at).getTime() + 24 * 60 * 60 * 1000),
              name: tsk.title,
              id: tsk.id,
              type: 'task',
              progress: tsk.status === 'closed' ? 100 : tsk.status === 'review' ? 80 : tsk.status === 'in_progress' ? 50 : 0,
              isDisabled: false,
              styles: {
                barProgressColor: '#7c3aed',
                barProgressSelectedColor: '#6d28d9',
                barBackgroundColor: '#ddd6fe',
                barBackgroundSelectedColor: '#c4b5fd',
              },
              parent: tsk.project_id,
              dependencies: tsk.dependencies?.map((d: any) => d.depends_on_task_id) || [],
            });
          });
        });
      });
    } else {
      if (tasks && tasks.length > 0) {
        tasks.forEach(t => {
          items.push({
            start: t.start_date ? new Date(t.start_date) : new Date(t.created_at),
            end: t.due_date ? new Date(t.due_date) : new Date(new Date(t.start_date || t.created_at).getTime() + 24 * 60 * 60 * 1000),
            name: t.title,
            id: t.id,
            type: 'task',
            progress: t.status === 'closed' ? 100 : t.status === 'review' ? 80 : t.status === 'in_progress' ? 50 : 0,
            isDisabled: false,
            styles: {
            barProgressColor: '#7c3aed',
                barProgressSelectedColor: '#6d28d9',
                barBackgroundColor: '#ddd6fe',
                barBackgroundSelectedColor: '#c4b5fd',
            },
            parent: t.project_id,
            dependencies: t.dependencies?.map((d: any) => d.depends_on_task_id) || [],
          });
        });
      }
    }

    return items;
  }, [tasks, milestones, tickets]);

  if (ganttTasks.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-3xl border-2 border-dashed border-soft bg-slate-50/50 text-muted font-medium">
        No tasks with dates found for this roadmap.
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-soft bg-white p-4 shadow-sm overflow-hidden">
      <Gantt
        tasks={ganttTasks}
        viewMode={ViewMode.Day}
        onDateChange={onTaskChange}
        fontSize="12px"
        distances={{ tableWidth: 200, columnWidth: 60, barCornerRadius: 8 }}
      />
    </div>
  );
});
