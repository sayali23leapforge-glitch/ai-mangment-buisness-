import { useState } from "react";
import { useRole } from "../context/RoleContext";
import { canSwitchRole, ROLE_LABELS, UserRole } from "../utils/rolePermissions";
import "../styles/SwitchRole.css";

export default function SwitchRole() {
  const { originalRole, currentRole, switchRole, resetRole, isRoleSwitched } = useRole();
  const [isOpen, setIsOpen] = useState(false);

  if (!originalRole || !canSwitchRole(originalRole)) {
    return null;
  }

  const roles: UserRole[] = ["owner", "accountant", "manager", "employee"];

  const handleRoleSelect = (role: UserRole) => {
    if (role === originalRole) {
      resetRole();
    } else {
      switchRole(role);
    }
    setIsOpen(false);
  };

  return (
    <div className="switch-role-container">
      <button
        className={`switch-role-button ${isRoleSwitched ? "switched" : ""}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Switch role to preview other views"
      >
        {isRoleSwitched ? "👁️ " : "👤 "}
        {ROLE_LABELS[currentRole || "owner"]}
      </button>

      {isOpen && (
        <div className="switch-role-dropdown">
          <div className="dropdown-header">Preview as</div>
          {roles.map((role) => (
            <button
              key={role}
              className={`role-option ${role === currentRole ? "active" : ""} ${role === originalRole ? "original" : ""}`}
              onClick={() => handleRoleSelect(role)}
            >
              <span className="role-name">{ROLE_LABELS[role]}</span>
              {role === originalRole && <span className="original-badge">Your Role</span>}
              {role === currentRole && !isRoleSwitched && <span className="checkmark">✓</span>}
              {role === currentRole && isRoleSwitched && <span className="preview-badge">Preview</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
