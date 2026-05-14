"use client";

import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Shield, Eye, PlusCircle, Edit3, Trash } from "lucide-react";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/api-client";

interface Role {
  id: string;
  key: string;
  label: string;
  created_at: string;
}

interface Module {
  id: string;
  key: string;
  label: string;
  created_at: string;
}

interface Permission {
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

interface RolePermissions {
  role: Role;
  permissions: Record<string, Permission>;
}

interface RBACData {
  roles: Role[];
  modules: Module[];
  permissions: RolePermissions[];
}

interface RBACManagerProps {
  orgSlug: string;
}

export function RBACManager({ orgSlug }: RBACManagerProps) {
  const [data, setData] = useState<RBACData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Role management
  const [showCreateRole, setShowCreateRole] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [roleForm, setRoleForm] = useState({ key: "", label: "" });

  // Module management
  const [showCreateModule, setShowCreateModule] = useState(false);
  const [moduleForm, setModuleForm] = useState({ key: "", label: "" });

  // Permission updates
  const [updatingPermissions, setUpdatingPermissions] = useState<Set<string>>(new Set());
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);

  useEffect(() => {
    loadRBACData();
  }, []);

  const loadRBACData = async () => {
    try {
      setLoading(true);
      const result = await apiRequest<RBACData>("/api/v1/rbac/permissions", { orgSlug });
      if (result.error) {
        throw new Error(result.error);
      }

      setData(result.data);
      const firstRoleId = result.data?.roles?.[0]?.id ?? null;
      setSelectedRoleId((prev) => prev || firstRoleId);
    } catch (err) {
      console.error("Load RBAC data error:", err);
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const createRole = async () => {
    try {
      const result = await apiRequest("/api/v1/rbac/roles", {
        method: "POST",
        body: roleForm,
        orgSlug,
      });

      if (result.error) {
        throw new Error(result.error);
      }

      setShowCreateRole(false);
      setRoleForm({ key: "", label: "" });
      loadRBACData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create role");
    }
  };

  const updateRole = async () => {
    if (!editingRole) return;

    try {
      const result = await apiRequest(`/api/v1/rbac/roles/${editingRole.id}`, {
        method: "PATCH",
        body: { label: roleForm.label },
        orgSlug,
      });

      if (result.error) {
        throw new Error(result.error);
      }

      setEditingRole(null);
      setRoleForm({ key: "", label: "" });
      loadRBACData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update role");
    }
  };

  const deleteRole = async (roleId: string) => {
    if (!confirm("Are you sure you want to delete this role?")) return;

    try {
      const result = await apiRequest(`/api/v1/rbac/roles/${roleId}`, {
        method: "DELETE",
        orgSlug,
      });

      if (result.error) {
        throw new Error(result.error);
      }

      if (selectedRoleId === roleId) {
        setSelectedRoleId(null);
      }
      loadRBACData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete role");
    }
  };

  const createModule = async () => {
    try {
      const result = await apiRequest("/api/v1/rbac/modules", {
        method: "POST",
        body: moduleForm,
        orgSlug,
      });

      if (result.error) {
        throw new Error(result.error);
      }

      setShowCreateModule(false);
      setModuleForm({ key: "", label: "" });
      loadRBACData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create module");
    }
  };

  const deleteModule = async (moduleId: string) => {
    if (!confirm("Are you sure you want to delete this module?")) return;

    try {
      const result = await apiRequest(`/api/v1/rbac/modules/${moduleId}`, {
        method: "DELETE",
        orgSlug,
      });

      if (result.error) {
        throw new Error(result.error);
      }

      loadRBACData();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete module");
    }
  };

  const updatePermission = async (roleId: string, moduleKey: string, permission: keyof Permission, value: boolean) => {
    const key = `${roleId}-${moduleKey}-${permission}`;
    setUpdatingPermissions(prev => new Set(prev).add(key));

    try {
      const payload = {
        role_id: roleId,
        module_key: moduleKey,
        [permission]: value,
      };

      const result = await apiRequest("/api/v1/rbac/permissions", {
        method: "PUT",
        body: payload,
        orgSlug,
      });

      if (result.error) {
        throw new Error(result.error);
      }

      // Update local state optimistically
      setData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          permissions: prev.permissions.map(rp => {
            if (rp.role.id === roleId) {
              return {
                ...rp,
                permissions: {
                  ...rp.permissions,
                  [moduleKey]: {
                    ...rp.permissions[moduleKey],
                    [permission]: value,
                  },
                },
              };
            }
            return rp;
          }),
        };
      });
    } catch (err) {
      alert("Failed to update permission");
      loadRBACData(); // Reload on error
    } finally {
      setUpdatingPermissions(prev => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-600"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 text-center text-red-600">
        <p>Error loading RBAC data: {error}</p>
        <Button onClick={loadRBACData} className="mt-4">
          Retry
        </Button>
      </div>
    );
  }

  const systemRoles = ["owner", "admin", "member", "client"];

  return (
    <div className="space-y-8">
      {/* Roles Management */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-black text-main">Roles</h3>
            <p className="text-sm text-muted">Manage roles in your organization</p>
          </div>
          <Button onClick={() => setShowCreateRole(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Create Role
          </Button>
        </div>

        <div className="space-y-4">
          {data.roles.map((role) => (
            <div key={role.id} className="flex items-center justify-between p-4 border border-soft rounded-xl">
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-violet-600" />
                <div>
                  <p className="font-semibold text-main">{role.label}</p>
                  <p className="text-sm text-muted">{role.key}</p>
                </div>
                {systemRoles.includes(role.key) && (
                  <Badge variant="secondary" className="text-xs">System</Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingRole(role);
                    setRoleForm({ key: role.key, label: role.label });
                  }}
                  disabled={systemRoles.includes(role.key)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => deleteRole(role.id)}
                  disabled={systemRoles.includes(role.key)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-black text-main">Modules</h3>
            <p className="text-sm text-muted">Add and delete modules used in permission settings.</p>
          </div>
          <Button onClick={() => setShowCreateModule(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Add Module
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-soft text-sm text-muted">
                <th className="py-3 px-4">Module</th>
                <th className="py-3 px-4">Key</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.modules.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-6 px-4 text-center text-muted">
                    No modules found. Add a module to configure permissions.
                  </td>
                </tr>
              ) : (
                data.modules.map((module) => (
                  <tr key={module.id} className="border-b border-soft/60 hover:bg-slate-50">
                    <td className="py-3 px-4 font-medium text-main">{module.label}</td>
                    <td className="py-3 px-4 text-sm text-muted">{module.key}</td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteModule(module.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Permissions Matrix */}
      <Card className="p-6">
        <div className="mb-6">
          <h3 className="text-lg font-black text-main">Permissions</h3>
          <p className="text-sm text-muted">Configure what each role can do in each module</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-soft">
                <th className="text-left py-3 px-4 font-semibold text-main">Role</th>
                {data.modules.map((module) => (
                  <th key={module.key} className="text-center py-3 px-2 font-semibold text-main min-w-[120px]">
                    {module.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.permissions.map((rolePerm) => (
                <tr key={rolePerm.role.id} className="border-b border-soft/50">
                  <td className="py-4 px-4 font-medium text-main">
                    {rolePerm.role.label}
                  </td>
                  {data.modules.map((module) => {
                    const perms = rolePerm.permissions[module.key];
                    return (
                      <td key={module.key} className="py-4 px-2">
                        <div className="flex justify-center gap-1">
                          {[
                            { key: "can_view", icon: Eye, label: "View" },
                            { key: "can_create", icon: PlusCircle, label: "Create" },
                            { key: "can_edit", icon: Edit3, label: "Edit" },
                            { key: "can_delete", icon: Trash, label: "Delete" },
                          ].map(({ key, icon: Icon, label }) => {
                            const permKey = key as keyof Permission;
                            const isUpdating = updatingPermissions.has(`${rolePerm.role.id}-${module.key}-${permKey}`);
                            return (
                              <button
                                key={key}
                                onClick={() => updatePermission(rolePerm.role.id, module.key, permKey, !perms[permKey])}
                                disabled={isUpdating}
                                className={cn(
                                  "p-1.5 rounded-md transition-all",
                                  perms[permKey]
                                    ? "bg-violet-100 text-violet-600 hover:bg-violet-200"
                                    : "bg-slate-100 text-slate-400 hover:bg-slate-200",
                                  isUpdating && "opacity-50 cursor-not-allowed"
                                )}
                                title={label}
                              >
                                <Icon className="h-4 w-4" />
                              </button>
                            );
                          })}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create Role Modal */}
      <Modal
        isOpen={showCreateRole}
        onClose={() => {
          setShowCreateRole(false);
          setRoleForm({ key: "", label: "" });
        }}
        title="Create New Role"
      >
        <div className="space-y-4">
          <Input
            label="Role Key"
            value={roleForm.key}
            onChange={(e) => setRoleForm(prev => ({ ...prev, key: e.target.value }))}
            placeholder="e.g., manager, developer"
          />
          <Input
            label="Role Label"
            value={roleForm.label}
            onChange={(e) => setRoleForm(prev => ({ ...prev, label: e.target.value }))}
            placeholder="e.g., Manager, Developer"
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateRole(false);
                setRoleForm({ key: "", label: "" });
              }}
            >
              Cancel
            </Button>
            <Button onClick={createRole}>
              Create Role
            </Button>
          </div>
        </div>
      </Modal>

      {/* Create Module Modal */}
      <Modal
        isOpen={showCreateModule}
        onClose={() => {
          setShowCreateModule(false);
          setModuleForm({ key: "", label: "" });
        }}
        title="Add New Module"
      >
        <div className="space-y-4">
          <Input
            label="Module Key"
            value={moduleForm.key}
            onChange={(e) => setModuleForm(prev => ({ ...prev, key: e.target.value }))}
            placeholder="e.g., sales, purchase"
          />
          <Input
            label="Module Label"
            value={moduleForm.label}
            onChange={(e) => setModuleForm(prev => ({ ...prev, label: e.target.value }))}
            placeholder="e.g., Sales, Purchase"
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowCreateModule(false);
                setModuleForm({ key: "", label: "" });
              }}
            >
              Cancel
            </Button>
            <Button onClick={createModule}>
              Add Module
            </Button>
          </div>
        </div>
      </Modal>

      {/* Edit Role Modal */}
      <Modal
        isOpen={!!editingRole}
        onClose={() => {
          setEditingRole(null);
          setRoleForm({ key: "", label: "" });
        }}
        title="Edit Role"
      >
        <div className="space-y-4">
          <Input
            label="Role Key"
            value={roleForm.key}
            disabled
            className="opacity-50"
          />
          <Input
            label="Role Label"
            value={roleForm.label}
            onChange={(e) => setRoleForm(prev => ({ ...prev, label: e.target.value }))}
            placeholder="e.g., Manager, Developer"
          />
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setEditingRole(null);
                setRoleForm({ key: "", label: "" });
              }}
            >
              Cancel
            </Button>
            <Button onClick={updateRole}>
              Update Role
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}