"use client";

import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Users, Building, Shield } from "lucide-react";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/api-client";
import { User } from "@/lib/types";

interface Department {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
  member_count?: number;
  members?: DepartmentMember[];
}

interface DepartmentMember {
  user_id: string;
  user_email: string;
  user_full_name: string | null;
  department_role_key: string;
  department_role_label: string;
  joined_at: string;
}

interface DepartmentRole {
  id: string;
  key: string;
  label: string;
  created_at: string;
}

interface DepartmentManagerProps {
  orgSlug: string;
}

export function DepartmentManager({ orgSlug }: DepartmentManagerProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [departmentRoles, setDepartmentRoles] = useState<DepartmentRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Department management
  const [showCreateDepartment, setShowCreateDepartment] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [departmentForm, setDepartmentForm] = useState({ name: "", slug: "", description: "" });

  // Member management
  const [selectedDepartment, setSelectedDepartment] = useState<Department | null>(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberForm, setMemberForm] = useState({ user_id: "", role_key: "member" });

  // Role management
  const [showCreateRole, setShowCreateRole] = useState(false);
  const [roleForm, setRoleForm] = useState({ key: "", label: "" });

  useEffect(() => {
    loadDepartments();
    loadUsers();
    loadDepartmentRoles();
  }, []);

  const loadDepartments = async () => {
    try {
      setLoading(true);
      const result = await apiRequest<Department[]>("/api/v1/departments", { orgSlug });
      if (result.error) {
        throw new Error(result.error);
      }
      setDepartments(result.data || []);
    } catch (err) {
      console.error("Load departments error:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const result = await apiRequest<User[]>("/api/v1/users", { orgSlug });
      if (result.error) {
        throw new Error(result.error);
      }
      setUsers(result.data || []);
    } catch (err) {
      console.error("Load users error:", err);
      // Don't set main error for users, just log it
    }
  };

  const loadDepartmentRoles = async () => {
    try {
      const result = await apiRequest<DepartmentRole[]>("/api/v1/departments/roles/list", { orgSlug });
      if (result.error) {
        throw new Error(result.error);
      }
      setDepartmentRoles(result.data || []);
    } catch (err) {
      console.error("Load department roles error:", err);
      // Don't set main error for roles, just log it
    }
  };

  const loadDepartmentDetails = async (deptId: string) => {
    try {
      const result = await apiRequest<Department>(`/api/v1/departments/${deptId}/details`, { orgSlug });
      if (result.error) {
        throw new Error(result.error);
      }
      // Update the department in the list with member details
      setDepartments(prev => prev.map(dept => 
        dept.id === deptId ? { ...dept, ...result.data } : dept
      ));
      return result.data;
    } catch (err) {
      console.error("Load department details error:", err);
      throw err;
    }
  };

  const createDepartment = async () => {
    try {
      const result = await apiRequest("/api/v1/departments", {
        method: "POST",
        body: departmentForm,
        orgSlug,
      });

      if (result.error) {
        throw new Error(result.error);
      }

      setShowCreateDepartment(false);
      setDepartmentForm({ name: "", slug: "", description: "" });
      loadDepartments();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create department");
    }
  };

  const updateDepartment = async () => {
    if (!editingDepartment) return;

    try {
      const result = await apiRequest(`/api/v1/departments/${editingDepartment.id}`, {
        method: "PATCH",
        body: { name: departmentForm.name, description: departmentForm.description },
        orgSlug,
      });

      if (result.error) {
        throw new Error(result.error);
      }

      setEditingDepartment(null);
      setDepartmentForm({ name: "", slug: "", description: "" });
      loadDepartments();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update department");
    }
  };

  const deleteDepartment = async (deptId: string) => {
    if (!confirm("Are you sure you want to delete this department? All members will be removed.")) return;

    try {
      const result = await apiRequest(`/api/v1/departments/${deptId}`, {
        method: "DELETE",
        orgSlug,
      });

      if (result.error) {
        throw new Error(result.error);
      }

      loadDepartments();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete department");
    }
  };

  const addMemberToDepartment = async () => {
    if (!selectedDepartment) return;

    try {
      const result = await apiRequest(`/api/v1/departments/${selectedDepartment.id}/members`, {
        method: "POST",
        body: { user_id: memberForm.user_id, department_role_key: memberForm.role_key },
        orgSlug,
      });

      if (result.error) {
        throw new Error(result.error);
      }

      setShowAddMember(false);
      setMemberForm({ user_id: "", role_key: "member" });
      await loadDepartmentDetails(selectedDepartment.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to add member");
    }
  };

  const removeMemberFromDepartment = async (userId: string) => {
    if (!selectedDepartment) return;

    if (!confirm("Are you sure you want to remove this member from the department?")) return;

    try {
      const result = await apiRequest(`/api/v1/departments/${selectedDepartment.id}/members/${userId}`, {
        method: "DELETE",
        orgSlug,
      });

      if (result.error) {
        throw new Error(result.error);
      }

      await loadDepartmentDetails(selectedDepartment.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to remove member");
    }
  };

  const createDepartmentRole = async () => {
    try {
      const result = await apiRequest("/api/v1/departments/roles/create", {
        method: "POST",
        body: roleForm,
        orgSlug,
      });

      if (result.error) {
        throw new Error(result.error);
      }

      setShowCreateRole(false);
      setRoleForm({ key: "", label: "" });
      loadDepartmentRoles();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create role");
    }
  };

  const deleteDepartmentRole = async (roleId: string) => {
    if (!confirm("Are you sure you want to delete this role?")) return;

    try {
      const result = await apiRequest(`/api/v1/departments/roles/${roleId}`, {
        method: "DELETE",
        orgSlug,
      });

      if (result.error) {
        throw new Error(result.error);
      }

      loadDepartmentRoles();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete role");
    }
  };

  const openEditModal = (dept: Department) => {
    setEditingDepartment(dept);
    setDepartmentForm({ name: dept.name, slug: dept.slug, description: dept.description || "" });
  };

  const openMemberModal = async (dept: Department) => {
    setSelectedDepartment(dept);
    await loadDepartmentDetails(dept.id);
    setShowAddMember(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600 font-medium">Error loading departments: {error}</p>
        <Button onClick={loadDepartments} className="mt-4">
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Create Button */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-black text-main">Department Management</h3>
          <p className="text-sm font-medium text-muted mt-1">
            Organize your team into departments for better project management.
          </p>
        </div>
        <Button
          onClick={() => setShowCreateDepartment(true)}
          className="gap-2 shadow-lg shadow-violet-500/20"
        >
          <Plus className="h-4 w-4" />
          Create Department
        </Button>
      </div>

      {/* Departments Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {departments.map((dept) => (
          <Card key={dept.id} className="p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="h-10 w-10 rounded-xl bg-violet-100 flex items-center justify-center">
                <Building className="h-5 w-5 text-violet-600" />
              </div>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openEditModal(dept)}
                  className="h-8 w-8 p-0 hover:bg-violet-50"
                >
                  <Edit className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteDepartment(dept.id)}
                  className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="font-bold text-main">{dept.name}</h4>
              <p className="text-xs font-medium text-muted uppercase tracking-wider">
                {dept.slug}
              </p>
              {dept.description && (
                <p className="text-sm text-muted">{dept.description}</p>
              )}
              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted" />
                  <span className="text-sm font-medium text-muted">
                    {dept.members?.length || dept.member_count || 0} members
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => openMemberModal(dept)}
                  className="h-8 px-3 text-xs hover:bg-violet-50"
                >
                  Manage
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Department Roles Section */}
      <div className="mt-8 pt-8 border-t border-soft">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-black text-main">Department Roles</h3>
            <p className="text-sm font-medium text-muted mt-1">
              Define roles and permissions within departments.
            </p>
          </div>
          <Button
            onClick={() => setShowCreateRole(true)}
            variant="outline"
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Role
          </Button>
        </div>

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {departmentRoles.map((role) => (
            <Card key={role.id} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-main">{role.label}</h4>
                  <p className="text-xs font-medium text-muted uppercase tracking-wider mt-1">
                    {role.key}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteDepartmentRole(role.id)}
                  className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {departmentRoles.length === 0 && (
          <div className="text-center py-8">
            <Shield className="h-8 w-8 text-muted mx-auto mb-2" />
            <p className="text-muted text-sm">No custom roles created yet.</p>
          </div>
        )}
      </div>

      {/* Create Department Modal */}
      <Modal
        isOpen={showCreateDepartment}
        onClose={() => {
          setShowCreateDepartment(false);
          setDepartmentForm({ name: "", slug: "", description: "" });
        }}
        title="Create Department"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createDepartment();
          }}
          className="space-y-6"
        >
          <Input
            label="Department Name"
            value={departmentForm.name}
            onChange={(e) => setDepartmentForm(prev => ({ ...prev, name: e.target.value }))}
            placeholder="e.g., Engineering, Marketing, Sales"
            required
          />

          <Input
            label="Slug"
            value={departmentForm.slug}
            onChange={(e) => setDepartmentForm(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') }))}
            placeholder="e.g., engineering, marketing, sales"
            required
          />

          <Input
            label="Description (Optional)"
            value={departmentForm.description}
            onChange={(e) => setDepartmentForm(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Brief description of the department"
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowCreateDepartment(false);
                setDepartmentForm({ name: "", slug: "", description: "" });
              }}
            >
              Cancel
            </Button>
            <Button type="submit">Create Department</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Department Modal */}
      <Modal
        isOpen={!!editingDepartment}
        onClose={() => {
          setEditingDepartment(null);
          setDepartmentForm({ name: "", slug: "", description: "" });
        }}
        title="Edit Department"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateDepartment();
          }}
          className="space-y-6"
        >
          <Input
            label="Department Name"
            value={departmentForm.name}
            onChange={(e) => setDepartmentForm(prev => ({ ...prev, name: e.target.value }))}
            placeholder="e.g., Engineering, Marketing, Sales"
            required
          />

          <Input
            label="Slug"
            value={departmentForm.slug}
            onChange={(e) => setDepartmentForm(prev => ({ ...prev, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') }))}
            placeholder="e.g., engineering, marketing, sales"
            disabled
            required
          />

          <Input
            label="Description (Optional)"
            value={departmentForm.description}
            onChange={(e) => setDepartmentForm(prev => ({ ...prev, description: e.target.value }))}
            placeholder="Brief description of the department"
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditingDepartment(null);
                setDepartmentForm({ name: "", slug: "", description: "" });
              }}
            >
              Cancel
            </Button>
            <Button type="submit">Update Department</Button>
          </div>
        </form>
      </Modal>

      {/* Add Member Modal */}
      <Modal
        isOpen={showAddMember}
        onClose={() => {
          setShowAddMember(false);
          setMemberForm({ user_id: "", role_key: "member" });
          setSelectedDepartment(null);
        }}
        title={`Manage Members - ${selectedDepartment?.name || ""}`}
      >
        <div className="space-y-6">
          {/* Current Members */}
          {selectedDepartment?.members && selectedDepartment.members.length > 0 && (
            <div>
              <h4 className="font-bold text-main mb-3">Current Members</h4>
              <div className="space-y-2">
                {selectedDepartment.members.map((member) => (
                  <div key={member.user_id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="font-medium text-main">{member.user_full_name || member.user_email}</p>
                      <p className="text-sm text-muted">{member.user_email}</p>
                      <Badge variant="secondary" className="mt-1 text-xs">
                        {member.department_role_label}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeMemberFromDepartment(member.user_id)}
                      className="h-8 w-8 p-0 hover:bg-red-50 hover:text-red-600"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add New Member */}
          <div>
            <h4 className="font-bold text-main mb-3">Add New Member</h4>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                addMemberToDepartment();
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-sm font-bold uppercase tracking-wider text-muted ml-1">Select User</label>
                <select
                  value={memberForm.user_id}
                  onChange={(e) => setMemberForm(prev => ({ ...prev, user_id: e.target.value }))}
                  className="w-full mt-2 px-4 py-3 rounded-xl border border-soft bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                  required
                >
                  <option value="">Choose a user...</option>
                  {users
                    .filter(user => !selectedDepartment?.members?.some(m => m.user_id === user.id))
                    .map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.full_name || user.email} ({user.email})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-bold uppercase tracking-wider text-muted ml-1">Role</label>
                <select
                  value={memberForm.role_key}
                  onChange={(e) => setMemberForm(prev => ({ ...prev, role_key: e.target.value }))}
                  className="w-full mt-2 px-4 py-3 rounded-xl border border-soft bg-white focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
                >
                  <option value="member">Member</option>
                  <option value="lead">Lead</option>
                  <option value="manager">Manager</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowAddMember(false);
                    setMemberForm({ user_id: "", role_key: "member" });
                    setSelectedDepartment(null);
                  }}
                >
                  Done
                </Button>
                <Button type="submit" disabled={!memberForm.user_id}>
                  Add Member
                </Button>
              </div>
            </form>
          </div>
        </div>
      </Modal>

      {/* Create Role Modal */}
      <Modal
        isOpen={showCreateRole}
        onClose={() => {
          setShowCreateRole(false);
          setRoleForm({ key: "", label: "" });
        }}
        title="Create Department Role"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createDepartmentRole();
          }}
          className="space-y-6"
        >
          <Input
            label="Role Key"
            value={roleForm.key}
            onChange={(e) => setRoleForm(prev => ({ ...prev, key: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') }))}
            placeholder="e.g., lead, manager, senior-member"
            required
          />

          <Input
            label="Role Label"
            value={roleForm.label}
            onChange={(e) => setRoleForm(prev => ({ ...prev, label: e.target.value }))}
            placeholder="e.g., Team Lead, Manager, Senior Member"
            required
          />

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowCreateRole(false);
                setRoleForm({ key: "", label: "" });
              }}
            >
              Cancel
            </Button>
            <Button type="submit">Create Role</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}