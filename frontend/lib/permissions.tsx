"use client";

import { createContext, useContext, ReactNode } from "react";

type ModulePermissions = {
  can_view: boolean;
  can_create: boolean;
  can_edit: boolean;
  can_delete: boolean;
};

type PermissionsContextType = {
  role: { key: string; label: string };
  modules: Array<{
    key: string;
    label: string;
    permissions: ModulePermissions;
  }>;
};

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

type PermissionsProviderProps = {
  children: ReactNode;
  permissions: PermissionsContextType;
};

export function PermissionsProvider({ children, permissions }: PermissionsProviderProps) {
  return (
    <PermissionsContext.Provider value={permissions}>
      {children}
    </PermissionsContext.Provider>
  );
}

export function usePermissions() {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error("usePermissions must be used within a PermissionsProvider");
  }
  return context;
}

export function useModulePermissions(moduleKey: string): ModulePermissions {
  const { modules } = usePermissions();
  const module = modules.find((m) => m.key === moduleKey);
  return module?.permissions || { can_view: false, can_create: false, can_edit: false, can_delete: false };
}