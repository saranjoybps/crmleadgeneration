"use client";

import { useEffect, useState } from "react";
import { Building, Edit, Plus, Trash2, Users } from "lucide-react";

import { apiRequest } from "@/lib/api-client";
import { User } from "@/lib/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";

interface DepartmentMember {
  user_id: string;
  full_name: string | null;
  email: string;
  avatar_url: string | null;
  joined_at?: string | null;
}

interface Department {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  member_count?: number;
  members?: DepartmentMember[];
}

interface DepartmentManagerProps {
  orgSlug: string;
}

export function DepartmentManager({ orgSlug }: DepartmentManagerProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [showCreateDepartment, setShowCreateDepartment] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [departmentForm, setDepartmentForm] = useState({ name: "", slug: "", description: "" });

  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberForm, setMemberForm] = useState({ user_id: "" });

  useEffect(() => {
    loadDepartments();
    loadUsers();
  }, []);

  const loadDepartments = async () => {
    try {
      setLoading(true);
      const result = await apiRequest<Department[]>("/api/v1/departments", { orgSlug });
      if (result.error) throw new Error(result.error);
      setDepartments(result.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    const result = await apiRequest<User[]>("/api/v1/users", { orgSlug });
    setUsers(result.error ? [] : result.data || []);
  };

  const loadDepartmentDetails = async (deptId: string) => {
    const result = await apiRequest<Department>(`/api/v1/departments/${deptId}/details`, { orgSlug });
    if (result.error) throw new Error(result.error);
    setDepartments((prev) => prev.map((d) => (d.id === deptId ? { ...d, ...result.data } : d)));
    return result.data;
  };

  const createDepartment = async () => {
    const result = await apiRequest("/api/v1/departments", { method: "POST", body: departmentForm, orgSlug });
    if (result.error) throw new Error(result.error);
    setShowCreateDepartment(false);
    setDepartmentForm({ name: "", slug: "", description: "" });
    await loadDepartments();
  };

  const updateDepartment = async () => {
    if (!editingDepartment) return;
    const result = await apiRequest(`/api/v1/departments/${editingDepartment.id}`, {
      method: "PUT",
      body: { name: departmentForm.name, description: departmentForm.description },
      orgSlug,
    });
    if (result.error) throw new Error(result.error);
    setEditingDepartment(null);
    setDepartmentForm({ name: "", slug: "", description: "" });
    await loadDepartments();
  };

  const deleteDepartment = async (deptId: string) => {
    if (!confirm("Delete this department? Members will be unassigned from it.")) return;
    const result = await apiRequest(`/api/v1/departments/${deptId}`, { method: "DELETE", orgSlug });
    if (result.error) throw new Error(result.error);
    await loadDepartments();
  };

  const addMemberToDepartment = async () => {
    if (!selectedDepartment) return;
    const result = await apiRequest(`/api/v1/departments/${selectedDepartment.id}/members`, {
      method: "POST",
      body: { user_id: memberForm.user_id },
      orgSlug,
    });
    if (result.error) throw new Error(result.error);
    setMemberForm({ user_id: "" });
    await loadDepartmentDetails(selectedDepartment.id);
  };

  const removeMemberFromDepartment = async (userId: string) => {
    if (!selectedDepartment) return;
    const result = await apiRequest(`/api/v1/departments/${selectedDepartment.id}/members/${userId}`, {
      method: "DELETE",
      orgSlug,
    });
    if (result.error) throw new Error(result.error);
    await loadDepartmentDetails(selectedDepartment.id);
  };

  if (loading) return <div className="py-8 text-sm text-muted">Loading departments...</div>;
  if (error) return <div className="py-8 text-sm text-red-600">Error loading departments: {error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-black text-main">Department Management</h3>
          <p className="text-sm text-muted">Manage departments and assign users.</p>
        </div>
        <Button onClick={() => setShowCreateDepartment(true)} className="gap-2">
          <Plus className="h-4 w-4" /> Create Department
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {departments.map((dept) => (
          <Card key={dept.id} className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="rounded-lg bg-violet-100 p-2"><Building className="h-4 w-4 text-violet-600" /></div>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={() => { setEditingDepartment(dept); setDepartmentForm({ name: dept.name, slug: dept.slug, description: dept.description || "" }); }}><Edit className="h-3 w-3" /></Button>
                <Button size="sm" variant="ghost" onClick={() => deleteDepartment(dept.id)}><Trash2 className="h-3 w-3" /></Button>
              </div>
            </div>
            <p className="font-bold">{dept.name}</p>
            <p className="text-xs uppercase text-muted">{dept.slug}</p>
            {dept.description && <p className="mt-2 text-sm text-muted">{dept.description}</p>}
            <div className="mt-3 flex items-center justify-between">
              <span className="inline-flex items-center gap-1 text-sm text-muted"><Users className="h-4 w-4" /> {dept.members?.length || dept.member_count || 0} members</span>
              <Button size="sm" variant="ghost" onClick={async () => { setSelectedDepartment(dept); await loadDepartmentDetails(dept.id); setShowAddMember(true); }}>Manage</Button>
            </div>
          </Card>
        ))}
      </div>

      <Modal isOpen={showCreateDepartment} onClose={() => setShowCreateDepartment(false)} title="Create Department">
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); createDepartment().catch((err) => alert(err instanceof Error ? err.message : "Failed")); }}>
          <Input label="Department Name" value={departmentForm.name} onChange={(e) => setDepartmentForm((p) => ({ ...p, name: e.target.value }))} required />
          <Input label="Slug" value={departmentForm.slug} onChange={(e) => setDepartmentForm((p) => ({ ...p, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-") }))} required />
          <Input label="Description" value={departmentForm.description} onChange={(e) => setDepartmentForm((p) => ({ ...p, description: e.target.value }))} />
          <div className="flex justify-end"><Button type="submit">Create</Button></div>
        </form>
      </Modal>

      <Modal isOpen={!!editingDepartment} onClose={() => setEditingDepartment(null)} title="Edit Department">
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); updateDepartment().catch((err) => alert(err instanceof Error ? err.message : "Failed")); }}>
          <Input label="Department Name" value={departmentForm.name} onChange={(e) => setDepartmentForm((p) => ({ ...p, name: e.target.value }))} required />
          <Input label="Slug" value={departmentForm.slug} disabled required />
          <Input label="Description" value={departmentForm.description} onChange={(e) => setDepartmentForm((p) => ({ ...p, description: e.target.value }))} />
          <div className="flex justify-end"><Button type="submit">Update</Button></div>
        </form>
      </Modal>

      <Modal isOpen={showAddMember} onClose={() => setShowAddMember(false)} title={`Manage Members - ${selectedDepartment?.name || ""}`}>
        <div className="space-y-4">
          <div className="space-y-2">
            {(selectedDepartment?.members || []).map((member) => (
              <div key={member.user_id} className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
                <div>
                  <p className="font-medium">{member.full_name || member.email}</p>
                  <p className="text-sm text-muted">{member.email}</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => removeMemberFromDepartment(member.user_id).catch((err) => alert(err instanceof Error ? err.message : "Failed"))}><Trash2 className="h-3 w-3" /></Button>
              </div>
            ))}
          </div>

          <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); addMemberToDepartment().catch((err) => alert(err instanceof Error ? err.message : "Failed")); }}>
            <select
              value={memberForm.user_id}
              onChange={(e) => setMemberForm({ user_id: e.target.value })}
              className="w-full rounded-xl border border-soft bg-white px-4 py-3"
              required
            >
              <option value="">Choose a user...</option>
              {users.filter((u) => !selectedDepartment?.members?.some((m) => m.user_id === u.id)).map((u) => (
                <option key={u.id} value={u.id}>{u.full_name || u.email} ({u.email})</option>
              ))}
            </select>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setShowAddMember(false)}>Done</Button>
              <Button type="submit" disabled={!memberForm.user_id}>Add Member</Button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}
