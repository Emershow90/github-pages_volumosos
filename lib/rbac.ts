/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { UserRole } from "../types/Usuario";

export interface CanUser {
  role: UserRole;
  setoresAutorizados?: string[];
}

/**
 * Centralized Role-Based Access Control (RBAC) with Double Validation (Role + Sector).
 * Checks if a user has permission to perform a specific action on a resource.
 * 
 * @param user The user object or UserRole string.
 * @param action The action being requested.
 * @param resource Optional resource identifier (e.g. sector ID like "87").
 */
export function can(
  user: CanUser | UserRole | null | undefined,
  action: string,
  resource?: string
): boolean {
  if (!user) return false;

  const role = typeof user === "string" ? (user as UserRole) : user.role;
  const sectors = typeof user === "object" && user.setoresAutorizados ? user.setoresAutorizados : [];

  const isAdmin = role === UserRole.Admin;
  const isCoordinator = role === UserRole.Coordenador;
  const isLeader = role === UserRole.Lider;
  const isReferente = role === UserRole.Referente;

  // Double Validation: If a specific sector resource is targetted, verify if user has explicit access.
  // Admins and Coordenadores have global bypass, while others must be authorized for that sector.
  if (resource && !isAdmin && !isCoordinator) {
    const normalizedResource = resource.toUpperCase().replace(/\D/g, ""); // e.g. "87"
    const hasSectorAccess = sectors.some(
      (sec) => sec.toUpperCase().replace(/\D/g, "") === normalizedResource
    );
    if (!hasSectorAccess) {
      return false;
    }
  }

  switch (action) {
    // Config / Ajustes Tab Actions
    case "edit_leadership":
      return isAdmin || isCoordinator;
    case "edit_referents":
      return isAdmin || isCoordinator || isLeader;
    case "manage_sectors": // Create/delete sectors
      return isAdmin;
    case "edit_sector_params": // Metas, Universos
    case "toggle_safety": // Alternar status de segurança visual
      return isAdmin || isCoordinator || isLeader || isReferente;
    case "manage_stores":
      return isAdmin || isCoordinator;
    case "import_data": // Ingestion / OCR
      return isAdmin || isCoordinator;
    case "delete_all_data": // Complete Database Purge
      return isAdmin;
    case "import_backup":
      return isAdmin;
    case "configure_screensaver":
      return isAdmin || isCoordinator || isLeader;

    // Default fallback
    default:
      console.warn(`[RBAC_UNKNOWN_ACTION] Action "${action}" is not recognized in RBAC. Denying access by default.`);
      return false;
  }
}
