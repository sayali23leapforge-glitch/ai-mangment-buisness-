import React, { createContext, useContext, useState, useEffect } from "react";
import { UserRole } from "../utils/rolePermissions";
import { useAuth } from "./AuthContext";
import { getTeamMemberByEmail } from "../utils/teamStorage";

interface RoleContextType {
  originalRole: UserRole | null;
  currentRole: UserRole | null;
  setRole: (role: UserRole) => void;
  switchRole: (role: UserRole) => void;
  resetRole: () => void;
  isRoleSwitched: boolean;
}

const RoleContext = createContext<RoleContextType | undefined>(undefined);

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [originalRole, setOriginalRole] = useState<UserRole | null>(null);
  const [currentRole, setCurrentRole] = useState<UserRole | null>(null);
  const [isRoleSwitched, setIsRoleSwitched] = useState(false);

  useEffect(() => {
    const initializeRole = async () => {
      // Check localStorage first for already authenticated users
      const storedRole = localStorage.getItem("userRole") as UserRole | null;
      const loginType = localStorage.getItem("loginType");
      
      if (storedRole) {
        setOriginalRole(storedRole);
        setCurrentRole(storedRole);
        console.log("✅ Role loaded from localStorage:", storedRole);
        return;
      }

      // For owner accounts in Firebase Auth
      if (user?.email) {
        try {
          const teamMember = await getTeamMemberByEmail(user.email);
          if (teamMember) {
            const memberRole = teamMember.role as UserRole;
            setOriginalRole(memberRole);
            setCurrentRole(memberRole);
            localStorage.setItem("userRole", memberRole);
            console.log("✅ Employee role loaded from Firestore:", memberRole, "for", user.email);
          } else {
            // Owner not found in team members, set as owner
            setOriginalRole("owner");
            setCurrentRole("owner");
            localStorage.setItem("userRole", "owner");
          }
        } catch (error) {
          console.error("❌ Error loading role:", error);
          setOriginalRole("employee");
          setCurrentRole("employee");
        }
      } else if (loginType === "employee") {
        // Employee logged in (not in Firebase Auth)
        const employeeEmail = localStorage.getItem("employeeEmail");
        const storedRole = localStorage.getItem("userRole");
        if (storedRole && employeeEmail) {
          setOriginalRole(storedRole as UserRole);
          setCurrentRole(storedRole as UserRole);
          console.log("✅ Employee role loaded from localStorage:", storedRole, "for", employeeEmail);
        }
      }
    };

    initializeRole();
  }, [user?.email]);

  const setRole = (role: UserRole) => {
    setOriginalRole(role);
    setCurrentRole(role);
    localStorage.setItem("userRole", role);
    setIsRoleSwitched(false);
  };

  const switchRole = (role: UserRole) => {
    if (originalRole === "owner") {
      setCurrentRole(role);
      setIsRoleSwitched(true);
      console.log(`🔄 Role switched to: ${role} (original: ${originalRole})`);
    }
  };

  const resetRole = () => {
    if (originalRole) {
      setCurrentRole(originalRole);
      setIsRoleSwitched(false);
    }
  };

  return (
    <RoleContext.Provider value={{
      originalRole,
      currentRole,
      setRole,
      switchRole,
      resetRole,
      isRoleSwitched,
    }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole() {
  const context = useContext(RoleContext);
  if (!context) {
    throw new Error("useRole must be used within RoleProvider");
  }
  return context;
}
