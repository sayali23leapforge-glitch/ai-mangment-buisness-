// Role-Based Access Control (RBAC) System

export type UserRole = "owner" | "accountant" | "manager" | "employee";

export interface RolePermissions {
  [key: string]: boolean;
}

const rolePermissionsMap: Record<UserRole, RolePermissions> = {
  owner: {
    // Owner: Full access to everything
    finance: true,
    inventory_dashboard: true,
    record_sale: true,
    inventory_manager: true,
    add_product: true,
    qr_barcodes: true,
    ai_insights: true,
    financial_reports: true,
    tax_center: true,
    integrations: true,
    team_management: true,
    billing: true,
    improvement_hub: true,
    settings: true,
  },
  accountant: {
    // Accountant: Only financial screens
    finance: true,
    inventory_dashboard: false,
    record_sale: false,
    inventory_manager: false,
    add_product: false,
    qr_barcodes: false,
    ai_insights: false,
    financial_reports: true,
    tax_center: true,
    integrations: false,
    team_management: false,
    billing: true,
    improvement_hub: false,
    settings: false,
  },
  manager: {
    // Manager: All except tax, team, billing
    finance: true,
    inventory_dashboard: true,
    record_sale: true,
    inventory_manager: true,
    add_product: true,
    qr_barcodes: true,
    ai_insights: true,
    financial_reports: true,
    tax_center: false,
    integrations: true,
    team_management: false,
    billing: false,
    improvement_hub: true,
    settings: true,
  },
  employee: {
    // Employee: Limited access
    finance: true,
    inventory_dashboard: true,
    record_sale: true,
    inventory_manager: true,
    add_product: true,
    qr_barcodes: true,
    ai_insights: false,
    financial_reports: false,
    tax_center: false,
    integrations: false,
    team_management: false,
    billing: false,
    improvement_hub: true,
    settings: true,
  },
};

export function hasPermission(role: UserRole | undefined, feature: string): boolean {
  if (!role) return false;
  const permissions = rolePermissionsMap[role] || rolePermissionsMap.employee;
  return permissions[feature] === true;
}

export function getAccessibleFeatures(role: UserRole): string[] {
  const permissions = rolePermissionsMap[role];
  return Object.keys(permissions).filter(key => permissions[key] === true);
}

export function canManageUsers(role: UserRole): boolean {
  return role === "owner";
}

export function canSwitchRole(role: UserRole): boolean {
  return role === "owner";
}

export const ROLE_LABELS: Record<UserRole, string> = {
  owner: "Owner (Full Access)",
  accountant: "Accountant",
  manager: "Manager",
  employee: "Employee",
};

export const ROLE_COLORS: Record<UserRole, string> = {
  owner: "#ff6b6b",
  accountant: "#4dabf7",
  manager: "#51cf66",
  employee: "#ffd43b",
};
