"use client";

import { useState, useEffect } from "react";
import { Eye, PlusCircle, Edit3, Trash } from "lucide-react";

import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/api-client";

interface Permission {
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
}

interface Role {
  id: string;
  key: string;
  label: string;
}

interface Module {
  id: string;
  key: string;
  label: string;
}

interface RolePermissions {
  role: Role;
  permissions: Record<string, Permission>;
}

interface PermissionsMatrixProps {
  orgSlug: string;
}

export function PermissionsMatrix({ orgSlug }: PermissionsMatrixProps) {
  const [modules, setModules] = useState<Module[]>([]);
  const [permissions, setPermissions] = useState<RolePermissions[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingPermissions, setUpdatingPermissions] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const result = await apiRequest<{
        roles: Role[];
        modules: Module[];
        permissions: RolePermissions[];
      }>("/api/v1/rbac/permissions", { orgSlug });
      if (result.error) throw new Error(result.error);
      setModules(result.data?.modules ?? []);
      setPermissions(result.data?.permissions ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const updatePermission = async (roleId: string, moduleKey: string, permission: keyof Permission, value: boolean) => {
    const key = `${roleId}-${moduleKey}-${permission}`;
    setUpdatingPermissions(prev => new Set(prev).add(key));

    try {
      const result = await apiRequest("/api/v1/rbac/permissions", {
        method: "PUT",
        body: { role_id: roleId, module_key: moduleKey, [permission]: value },
        orgSlug,
      });
      if (result.error) throw new Error(result.error);

      setPermissions(prev => prev.map(rp => {
        if (rp.role.id === roleId) {
          return {
            ...rp,
            permissions: {
              ...rp.permissions,
              [moduleKey]: { ...rp.permissions[moduleKey], [permission]: value },
            },
          };
        }
        return rp;
      }));
    } catch {
      loadData();
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

  if (error) {
    return (
      <div className="p-8 text-center text-red-600">
        <p>Error loading permissions: {error}</p>
      </div>
    );
  }

  return (
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
              {modules.map((module) => (
                <th key={module.key} className="text-center py-3 px-2 font-semibold text-main min-w-[120px]">
                  {module.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {permissions.map((rolePerm) => (
              <tr key={rolePerm.role.id} className="border-b border-soft/50">
                <td className="py-4 px-4 font-medium text-main">
                  {rolePerm.role.label}
                </td>
                {modules.map((module) => {
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
  );
}
