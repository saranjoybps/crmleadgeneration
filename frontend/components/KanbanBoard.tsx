"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { 
  DndContext, 
  DragOverlay, 
  closestCorners, 
  KeyboardSensor, 
  PointerSensor, 
  useSensor, 
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  defaultDropAnimationSideEffects,
  DropAnimation
} from "@dnd-kit/core";
import { 
  arrayMove, 
  SortableContext, 
  sortableKeyboardCoordinates, 
  verticalListSortingStrategy,
  useSortable
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Trash2, Ticket, Plus, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  ticket_id: string;
  project_id: string;
  task_assignees?: Array<{
    user_id: string;
    users?: { email: string; full_name?: string; avatar_url?: string }
  }>;
}

interface KanbanBoardProps {
  initialTasks: Task[];
  orgSlug: string;
  canManage: boolean;
  ticketTitleById: Map<string, string>;
  onStatusChange: (taskId: string, newStatus: string) => Promise<void>;
}

const KANBAN_STATUSES = ["open", "in_progress", "review", "hold", "closed"] as const;

export function KanbanBoard({ 
  initialTasks, 
  orgSlug, 
  canManage, 
  ticketTitleById, 
  onStatusChange,
}: KanbanBoardProps) {
  const [tasks, setTasks] = useState(initialTasks);
  const [activeTask, setActiveTask] = useState<Task | null>(null);

  // Sync internal state when initialTasks changes from server
  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const tasksByStatus = useMemo(() => {
    const map: Record<string, Task[]> = {};
    KANBAN_STATUSES.forEach(status => {
      map[status] = tasks.filter(t => t.status === status);
    });
    return map;
  }, [tasks]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const task = tasks.find(t => t.id === active.id);
    if (task) setActiveTask(task);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const isActiveATask = tasks.some(t => t.id === activeId);
    const isOverATask = tasks.some(t => t.id === overId);

    if (!isActiveATask) return;

    // Dropping a Task over another Task
    if (isActiveATask && isOverATask) {
      const activeTask = tasks.find(t => t.id === activeId)!;
      const overTask = tasks.find(t => t.id === overId)!;

      if (activeTask.status !== overTask.status) {
        setTasks(prev => {
          const activeIndex = prev.findIndex(t => t.id === activeId);
          const overIndex = prev.findIndex(t => t.id === overId);
          
          const updatedTasks = [...prev];
          updatedTasks[activeIndex] = { ...activeTask, status: overTask.status };
          return arrayMove(updatedTasks, activeIndex, overIndex);
        });
      }
    }

    // Dropping a Task over a Column
    const isOverAColumn = KANBAN_STATUSES.includes(overId as any);
    if (isActiveATask && isOverAColumn) {
      const activeTask = tasks.find(t => t.id === activeId)!;
      if (activeTask.status !== overId) {
        setTasks(prev => {
          const activeIndex = prev.findIndex(t => t.id === activeId);
          const updatedTasks = [...prev];
          updatedTasks[activeIndex] = { ...activeTask, status: overId as string };
          return arrayMove(updatedTasks, activeIndex, activeIndex);
        });
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const activeId = active.id;
    const overId = over.id;

    // Use initialTasks to find the original state of the task
    const originalTask = initialTasks.find(t => t.id === activeId);
    if (!originalTask) return;

    // Determine new status from the current (potentially moved) tasks state
    const currentTask = tasks.find(t => t.id === activeId);
    if (!currentTask) return;

    const newStatus = currentTask.status;

    if (newStatus !== originalTask.status) {
      await onStatusChange(activeId as string, newStatus);
    }
  };

  const dropAnimation: DropAnimation = {
    sideEffects: defaultDropAnimationSideEffects({
      styles: {
        active: {
          opacity: "0.5",
        },
      },
    }),
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex-1 overflow-x-auto pb-6">
        <div className="flex gap-6 h-full min-w-[1200px]">
          {KANBAN_STATUSES.map(status => (
            <Column 
              key={status} 
              status={status} 
              tasks={tasksByStatus[status]} 
              orgSlug={orgSlug} 
              canManage={canManage}
              ticketTitleById={ticketTitleById}
            />
          ))}
        </div>
      </div>

      <DragOverlay dropAnimation={dropAnimation}>
        {activeTask ? (
          <TaskCard 
            task={activeTask} 
            orgSlug={orgSlug} 
            canManage={canManage} 
            ticketTitleById={ticketTitleById}
            isOverlay
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function Column({ status, tasks, orgSlug, canManage, ticketTitleById }: { 
  status: string; 
  tasks: Task[]; 
  orgSlug: string; 
  canManage: boolean;
  ticketTitleById: Map<string, string>;
}) {
  const { setNodeRef } = useSortable({
    id: status,
    data: {
      type: "Column",
      status,
    },
  });

  return (
    <div ref={setNodeRef} className="flex w-80 flex-col rounded-3xl bg-slate-50/50 p-4 border border-soft/50">
      <div className="mb-4 flex items-center justify-between px-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={cn("border-none px-0 font-bold uppercase tracking-wider text-[10px]", 
            status === "in_progress" ? "text-violet-600" : "text-muted")}>
            {status.replace("_", " ")}
          </Badge>
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-600">
            {tasks.length}
          </span>
        </div>
        {canManage && (
          <Link href={`/o/${orgSlug}/dashboard/tasks?modal=create`}>
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg"><Plus className="h-4 w-4" /></Button>
          </Link>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 overflow-y-auto pr-1 min-h-[150px]">
        <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
          {tasks.map((task) => (
            <TaskCard 
              key={task.id} 
              task={task} 
              orgSlug={orgSlug} 
              canManage={canManage} 
              ticketTitleById={ticketTitleById}
            />
          ))}
        </SortableContext>
        {tasks.length === 0 && (
          <div className="flex h-24 items-center justify-center rounded-2xl border border-dashed border-slate-200 text-[11px] font-medium text-slate-400">
            No tasks here
          </div>
        )}
      </div>
    </div>
  );
}

function TaskCard({ task, orgSlug, canManage, ticketTitleById, isOverlay }: { 
  task: Task; 
  orgSlug: string; 
  canManage: boolean; 
  ticketTitleById: Map<string, string>;
  isOverlay?: boolean;
}) {
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: {
      type: "Task",
      task,
    },
    disabled: !canManage && task.status === "closed",
  });

  const style = {
    transition,
    transform: CSS.Translate.toString(transform),
  };

  if (isDragging && !isOverlay) {
    return (
      <div 
        ref={setNodeRef}
        style={style}
        className="rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50/30 p-4 min-h-[120px]"
      />
    );
  }

  return (
    <div 
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "group relative rounded-2xl border border-soft bg-white p-4 shadow-sm transition-all hover:border-violet-200 hover:shadow-md cursor-grab active:cursor-grabbing",
        isOverlay && "shadow-xl border-violet-300 rotate-2 scale-105"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <Link 
          href={`/o/${orgSlug}/dashboard/tasks?modal=edit&task_id=${task.id}`} 
          className="text-sm font-bold text-main hover:text-violet-600 leading-tight pr-6"
          onPointerDown={(e) => e.stopPropagation()} // Prevent drag start when clicking link
        >
          {task.title}
        </Link>
        <Link 
          href={`/o/${orgSlug}/dashboard/tasks?modal=delete&task_id=${task.id}`} 
          className="opacity-0 transition-opacity group-hover:opacity-100"
          onPointerDown={(e) => e.stopPropagation()}
        >
          <Trash2 className="h-3.5 w-3.5 text-muted hover:text-red-500" />
        </Link>
      </div>
      
      {task.description && (
        <p className="mt-2 line-clamp-2 text-[11px] text-muted leading-relaxed">
          {task.description}
        </p>
      )}

      <div className="mt-4 flex items-center justify-between border-t border-soft/50 pt-3">
        <div className="flex items-center gap-1.5 rounded-lg bg-slate-50 px-2 py-1 text-[10px] font-medium text-muted">
          <Ticket className="h-3 w-3" />
          <span className="truncate max-w-[100px]">{ticketTitleById.get(task.ticket_id) || "General"}</span>
        </div>
        
        {/* Assignees Avatars */}
        <div className="flex -space-x-1.5">
          {(task.task_assignees || []).slice(0, 3).map((a, i) => (
            <div 
              key={a.user_id} 
              className="h-6 w-6 rounded-full border-2 border-white bg-violet-100 flex items-center justify-center text-[10px] font-bold text-violet-700 shadow-sm overflow-hidden"
              title={a.users?.full_name || a.users?.email}
            >
              {a.users?.avatar_url ? (
                <img src={a.users.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                (a.users?.full_name || a.users?.email)?.[0].toUpperCase()
              )}
            </div>
          ))}
          {(task.task_assignees || []).length > 3 && (
            <div className="h-6 w-6 rounded-full border-2 border-white bg-slate-100 flex items-center justify-center text-[8px] font-bold text-slate-600 shadow-sm">
              +{(task.task_assignees || []).length - 3}
            </div>
          )}
          {(task.task_assignees || []).length === 0 && (
             <div className="h-6 w-6 rounded-full border-2 border-white bg-slate-50 flex items-center justify-center text-slate-300">
               <User className="h-3 w-3" />
             </div>
          )}
        </div>
      </div>
    </div>
  );
}
