import { Briefcase, Ticket, CheckSquare, Clock, CalendarCheck, Timer, UserPlus, Users } from "lucide-react";
import type { ReactNode } from "react";
import type { Column, FilterConfig } from "@/components/ReportCard";

export type ReportConfig = {
  key: string;
  title: string;
  description: string;
  icon: ReactNode;
  columns: Column[];
  filters: FilterConfig[];
};

export const REPORTS: ReportConfig[] = [
  {
    key: "projects",
    title: "Projects",
    description: "Project status, members, and task/ticket counts",
    icon: <Briefcase className="h-5 w-5" />,
    columns: [
      { key: "name", label: "Project Name" },
      { key: "status", label: "Status" },
      { key: "member_count", label: "Members" },
      { key: "task_count", label: "Tasks" },
      { key: "ticket_count", label: "Tickets" },
      { key: "created_at", label: "Created" },
    ],
    filters: [
      { key: "status", label: "Status", type: "status", options: [
        { label: "All", value: "" },
        { label: "Active", value: "active" },
        { label: "On Hold", value: "on_hold" },
        { label: "Completed", value: "completed" },
        { label: "Archived", value: "archived" },
      ]},
    ],
  },
  {
    key: "tickets",
    title: "Tickets",
    description: "All tickets with type, priority, status, and assignee",
    icon: <Ticket className="h-5 w-5" />,
    columns: [
      { key: "title", label: "Title" },
      { key: "type", label: "Type" },
      { key: "priority", label: "Priority" },
      { key: "status", label: "Status" },
      { key: "project_name", label: "Project" },
      { key: "created_by_name", label: "Created By" },
      { key: "created_at", label: "Created" },
      { key: "due_date", label: "Due Date" },
    ],
    filters: [
      { key: "from_date", label: "From", type: "date" },
      { key: "to_date", label: "To", type: "date" },
      { key: "status", label: "Status", type: "status", options: [
        { label: "All", value: "" },
        { label: "Open", value: "open" },
        { label: "In Progress", value: "in_progress" },
        { label: "Review", value: "review" },
        { label: "Hold", value: "hold" },
        { label: "Closed", value: "closed" },
      ]},
      { key: "priority", label: "Priority", type: "priority", options: [
        { label: "All", value: "" },
        { label: "Low", value: "low" },
        { label: "Medium", value: "medium" },
        { label: "High", value: "high" },
        { label: "Urgent", value: "urgent" },
      ]},
    ],
  },
  {
    key: "tasks",
    title: "Tasks",
    description: "Task status, priority, assignees, and due dates",
    icon: <CheckSquare className="h-5 w-5" />,
    columns: [
      { key: "title", label: "Title" },
      { key: "status", label: "Status" },
      { key: "priority", label: "Priority" },
      { key: "project_name", label: "Project" },
      { key: "assignees", label: "Assignees" },
      { key: "due_date", label: "Due Date" },
      { key: "created_at", label: "Created" },
    ],
    filters: [
      { key: "from_date", label: "From", type: "date" },
      { key: "to_date", label: "To", type: "date" },
      { key: "status", label: "Status", type: "status", options: [
        { label: "All", value: "" },
        { label: "Open", value: "open" },
        { label: "In Progress", value: "in_progress" },
        { label: "Review", value: "review" },
        { label: "Hold", value: "hold" },
        { label: "Closed", value: "closed" },
      ]},
    ],
  },
  {
    key: "attendance",
    title: "Attendance",
    description: "Daily attendance records per employee",
    icon: <Clock className="h-5 w-5" />,
    columns: [
      { key: "user_id", label: "User" },
      { key: "date", label: "Date" },
      { key: "status", label: "Status" },
      { key: "check_in_time", label: "Check In" },
      { key: "check_out_time", label: "Check Out" },
      { key: "working_minutes", label: "Minutes Worked" },
    ],
    filters: [
      { key: "from_date", label: "From Date", type: "date" },
      { key: "to_date", label: "To Date", type: "date" },
      { key: "status", label: "Status", type: "status", options: [
        { label: "All", value: "" },
        { label: "Present", value: "present" },
        { label: "Late", value: "late" },
        { label: "Absent", value: "absent" },
        { label: "Half Day", value: "half_day" },
        { label: "On Leave", value: "on_leave" },
      ]},
    ],
  },
  {
    key: "leave",
    title: "Leave",
    description: "Leave requests with type, duration, and approval status",
    icon: <CalendarCheck className="h-5 w-5" />,
    columns: [
      { key: "leave_type_name", label: "Leave Type" },
      { key: "start_date", label: "Start Date" },
      { key: "end_date", label: "End Date" },
      { key: "duration_days", label: "Days" },
      { key: "status", label: "Status" },
      { key: "reason", label: "Reason" },
      { key: "user_name", label: "Applied By" },
      { key: "approved_by_name", label: "Approved By" },
    ],
    filters: [
      { key: "from_date", label: "From", type: "date" },
      { key: "to_date", label: "To", type: "date" },
      { key: "status", label: "Status", type: "status", options: [
        { label: "All", value: "" },
        { label: "Pending", value: "pending" },
        { label: "Approved", value: "approved" },
        { label: "Rejected", value: "rejected" },
        { label: "Cancelled", value: "cancelled" },
      ]},
    ],
  },
  {
    key: "time-entries",
    title: "Time Entries",
    description: "Logged hours per task and project",
    icon: <Timer className="h-5 w-5" />,
    columns: [
      { key: "user_name", label: "User" },
      { key: "task_title", label: "Task" },
      { key: "project_name", label: "Project" },
      { key: "duration_minutes", label: "Minutes" },
      { key: "note", label: "Note" },
      { key: "started_at", label: "Date" },
    ],
    filters: [
      { key: "from_date", label: "From", type: "date" },
      { key: "to_date", label: "To", type: "date" },
    ],
  },
  {
    key: "recruitment",
    title: "Recruitment",
    description: "Candidates, positions, status, and interview history",
    icon: <UserPlus className="h-5 w-5" />,
    columns: [
      { key: "first_name", label: "First Name" },
      { key: "last_name", label: "Last Name" },
      { key: "email", label: "Email" },
      { key: "position", label: "Position" },
      { key: "status", label: "Status" },
      { key: "source", label: "Source" },
      { key: "experience_years", label: "Experience" },
      { key: "created_at", label: "Applied" },
    ],
    filters: [
      { key: "from_date", label: "From", type: "date" },
      { key: "to_date", label: "To", type: "date" },
      { key: "status", label: "Status", type: "status", options: [
        { label: "All", value: "" },
        { label: "Applied", value: "applied" },
        { label: "Screening", value: "screening" },
        { label: "Interview Scheduled", value: "interview_scheduled" },
        { label: "Technical Round", value: "technical_round" },
        { label: "HR Round", value: "hr_round" },
        { label: "Selected", value: "selected" },
        { label: "Rejected", value: "rejected" },
        { label: "On Hold", value: "on_hold" },
      ]},
    ],
  },
  {
    key: "users",
    title: "Users",
    description: "Team members, roles, departments, and status",
    icon: <Users className="h-5 w-5" />,
    columns: [
      { key: "full_name", label: "Name" },
      { key: "email", label: "Email" },
      { key: "role", label: "Role" },
      { key: "departments", label: "Departments" },
      { key: "is_active", label: "Active" },
      { key: "created_at", label: "Joined" },
    ],
    filters: [],
  },
];

export function getReportConfig(key: string): ReportConfig | undefined {
  return REPORTS.find((r) => r.key === key);
}
