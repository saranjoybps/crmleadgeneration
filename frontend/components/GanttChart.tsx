"use client";

import React, { useMemo } from 'react';
import { Gantt, Task, ViewMode } from 'gantt-task-react';
import "gantt-task-react/dist/index.css";

interface GanttChartProps {
  tasks: any[];
  milestones?: any[];
  tickets?: any[];
  onTaskChange?: (task: Task) => void;
}

export function GanttChart({ tasks, milestones, tickets, onTaskChange }: GanttChartProps) {
  const ganttTasks: Task[] = useMemo(() => {
    const items: Task[] = [];

    if (milestones && milestones.length > 0) {
      milestones.forEach(m => {
        // Add Milestone marker
        items.push({
          start: new Date(m.due_date),
          end: new Date(m.due_date),
          name: `🚩 ${m.name}`,
          id: m.id,
          type: 'milestone',
          progress: m.status === 'completed' ? 100 : 0,
          isDisabled: true,
          styles: {
            progressColor: '#f59e0b',
            progressSelectedColor: '#d97706',
            barColor: '#fef3c7',
            barSelectedColor: '#fde68a',
          },
          project: m.project_id,
        });

        // Add tickets linked to this milestone
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
              progressColor: '#10b981',
              progressSelectedColor: '#059669',
              barColor: '#d1fae5',
              barSelectedColor: '#a7f3d0',
            },
            project: t.project_id,
          });

          // Add tasks linked to this ticket
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
                progressColor: '#7c3aed',
                progressSelectedColor: '#6d28d9',
                barColor: '#ddd6fe',
                barSelectedColor: '#c4b5fd',
              },
              project: tsk.project_id,
              dependencies: tsk.dependencies?.map((d: any) => d.depends_on_task_id) || [],
            });
          });
        });
      });
    } else {
      // If no milestones, just show tasks
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
              progressColor: '#7c3aed',
              progressSelectedColor: '#6d28d9',
              barColor: '#ddd6fe',
              barSelectedColor: '#c4b5fd',
            },
            project: t.project_id,
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
        listCellWidth="200px"
        columnWidth={60}
        fontSize="12px"
        barCornerRadius={8}
        handleSize={8}
      />
    </div>
  );
}
