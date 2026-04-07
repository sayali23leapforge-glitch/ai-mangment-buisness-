import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Users2, CheckCircle, Users, Lock, Search, Trash2, Eye, EyeOff, Wallet, BarChart2, LockIcon } from "lucide-react";
import TopBar from "../components/TopBar";
import Sidebar from "../components/Sidebar";
import { useAuth } from "../context/AuthContext";
import { useRole } from "../context/RoleContext";
import { hasPermission } from "../utils/rolePermissions";
import { useSubscription } from "../context/SubscriptionContext";
import {
  createTeamInvite,
  subscribeToTeamInvites,
  deleteTeamInvite,
  TeamInvite
} from "../utils/teamInviteStore";
import { addTeamMember, subscribeToTeamMembers, deleteTeamMember, TeamMember } from "../utils/teamStorage";
import { sendInviteEmail } from "../utils/sendInviteEmail";
import "../styles/teamManagement.css";

const TeamManagement = () => {
  const { user } = useAuth();
  const { currentRole } = useRole();
  const { tier, trialExpired } = useSubscription();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [_selectedRole, setSelectedRole] = useState("Owner (Full Access)");
  const [showModal, setShowModal] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [teamInvites, setTeamInvites] = useState<TeamInvite[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const storedProfile = localStorage.getItem("userProfile");
    if (storedProfile) setUserProfile(JSON.parse(storedProfile));
  }, []);

  const [currentTime, setCurrentTime] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState("");

  // Update time every minute to refresh "Last Active" display
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  // Subscribe to real-time team invites and team members
  useEffect(() => {
    if (!user?.email) return;

    const unsubscribeInvites = subscribeToTeamInvites((invites) => {
      setTeamInvites(invites);
    });

    const unsubscribeMembers = subscribeToTeamMembers(user.email, (members) => {
      setTeamMembers(members);
      console.log("✅ Team members loaded:", members);
    });

    return () => {
      unsubscribeInvites();
      unsubscribeMembers();
    };
  }, [user?.email]);

  const handleSendInvite = async () => {
    if (!email || !role || !password || !confirmPassword) {
      setSuccessMessage("✗ All fields are required");
      return;
    }

    // Sanitize passwords: trim, remove all whitespace, normalize
    const sanitizePassword = (pwd: string) => pwd.trim().replace(/\s+/g, "").normalize("NFKC");
    
    const trimmedPassword = sanitizePassword(password);
    const trimmedConfirmPassword = sanitizePassword(confirmPassword);

    if (trimmedPassword !== trimmedConfirmPassword) {
      setSuccessMessage("✗ Passwords do not match");
      return;
    }

    if (trimmedPassword.length < 6) {
      setSuccessMessage("✗ Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    setSuccessMessage("");

    try {
      // Map UI role names to system role format (lowercase)
      const roleMap: Record<string, string> = {
        "Owner": "owner",
        "Accountant": "accountant",
        "Manager": "manager",
        "Employee": "employee"
      };
      const systemRole = roleMap[role] || role.toLowerCase();

      console.log("🔹 Adding team member:", {
        email,
        role: systemRole,
        ownerEmail: user?.email
      });

      if (!user?.email) {
        setSuccessMessage("✗ Error: Owner email not available");
        setLoading(false);
        return;
      }

      // Add team member to Firestore with password (NOT in Firebase Auth)
      const memberId = await addTeamMember({
        email,
        role: systemRole as any,
        password: trimmedPassword, // Use sanitized password
        name: email.split("@")[0],
        createdBy: user?.email || "admin",
        createdAt: new Date().toISOString()
      });

      console.log("✅ Team member creation result:", {
        memberId,
        email,
        role: systemRole
      });

      if (memberId) {
        setSuccessMessage(`✓ Employee added successfully: ${email} (${systemRole})`);
        setTimeout(() => {
          setShowModal(false);
          setEmail("");
          setPassword("");
          setConfirmPassword("");
          setRole("");
          setSuccessMessage("");
          setShowPassword(false);
          setShowConfirmPassword(false);
        }, 2000);
      } else {
        setSuccessMessage("✗ Failed to add employee to database");
      }
    } catch (error: any) {
      console.error("❌ Error adding employee:", error);
      setSuccessMessage(`Error: ${error.message}`);
    }

    setLoading(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return "pending";
      case "accepted":
        return "accepted";
      case "rejected":
        return "rejected";
      default:
        return "pending";
    }
  };

  // Count team members by role
  const accountantCount = teamMembers.filter((m) => m.role === "accountant").length;
  const managerCount = teamMembers.filter((m) => m.role === "manager").length;
  const employeeCount = teamMembers.filter((m) => m.role === "employee").length;

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Calculate time difference for "Last Active" display
  const getLastActiveTime = (timestamp: any, status: string): string => {
    if (status !== "accepted") {
      return "Not yet";
    }

    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const diffMs = currentTime.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} min${diffMins > 1 ? "s" : ""} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays} days ago`;
    
    // Show time of day for older timestamps
    const hours = date.getHours();
    const mins = date.getMinutes();
    const timeStr = `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`;
    return timeStr;
  };

  const handleDeleteInvite = async (inviteId: string) => {
    if (window.confirm("Are you sure you want to permanently delete this invite?")) {
      const result = await deleteTeamInvite(inviteId);
      if (result.success) {
        setSuccessMessage("✓ Invite deleted successfully");
        setTimeout(() => setSuccessMessage(""), 3000);
      } else {
        setSuccessMessage(`✗ Failed to delete: ${result.message}`);
      }
    }
  };

  const handleDeleteTeamMember = async (memberId: string) => {
    if (window.confirm("Are you sure you want to permanently delete this team member?")) {
      try {
        await deleteTeamMember(memberId);
        setSuccessMessage("✓ Team member deleted successfully");
        setTimeout(() => setSuccessMessage(""), 3000);
      } catch (error) {
        console.error("Error deleting team member:", error);
        setSuccessMessage("✗ Failed to delete team member");
      }
    }
  };

  // Filter team invites based on search query
  const filteredInvites = teamInvites.filter(invite => 
    invite.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    invite.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter team members based on search query
  const filteredMembers = teamMembers.filter(member =>
    member.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    member.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Check if user has access to Team Management (Growth+ plan required)
  if (tier === "free" || trialExpired) {
    return (
      <div className="dashboard-wrapper">
        <Sidebar sidebarOpen={sidebarOpen} onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
        <main className="dashboard-main">
          <TopBar onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
          <div className="scrollable-content">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "400px", flexDirection: "column", textAlign: "center", gap: "20px" }}>
              <LockIcon size={64} color="#999" />
              <h2>{trialExpired ? "Trial Expired - Upgrade to Continue" : "Team Management Requires Growth Plan"}</h2>
              <p style={{ color: "#666", maxWidth: "400px" }}>{trialExpired ? "Your trial period has ended. Choose a plan to continue managing team members." : "Add team members and manage access. Growth plan supports up to 5 team members, Pro plan supports unlimited members."}</p>
              <Link to="/billing-plan" style={{ marginTop: "10px", padding: "10px 20px", backgroundColor: "#007bff", color: "white", borderRadius: "5px", textDecoration: "none" }}>
                View Plans
              </Link>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="dashboard-wrapper">

      {/* Sidebar */}
      <Sidebar sidebarOpen={sidebarOpen} onMenuClick={() => setSidebarOpen(!sidebarOpen)} />

      {/* Main Content */}
      <main className="dashboard-main">

        {/* Top Bar */}
        <TopBar 
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          onRoleChange={(role) => setSelectedRole(role)}
        />

        <div className="scrollable-content">
          <div className="team-container">
            <div className="top-bar-row">
              <h2 className="section-title">Team Management</h2>
              <button className="add-employee-btn" onClick={() => setShowModal(true)}>
                ➕ Add Employee
              </button>
            </div>

            <p className="section-subtitle">Manage team members and their access levels</p>

            {/* Team Stats */}
            <div className="team-stats-row">
              <div className="team-stat-card">
                <div>
                  <h3>Total Members</h3>
                  <p>{teamMembers.length}</p>
                </div>
                <div className="stat-icon stat-total">
                  <Users2 size={24} />
                </div>
              </div>
              <div className="team-stat-card">
                <div>
                  <h3>Active Now</h3>
                  <p>{teamMembers.length}</p>
                </div>
                <div className="stat-icon stat-active">
                  <CheckCircle size={24} />
                </div>
              </div>
              <div className="team-stat-card">
                <div>
                  <h3>Accountants</h3>
                  <p>{accountantCount}</p>
                </div>
                <div className="stat-icon stat-accountant">
                  <Users size={24} />
                </div>
              </div>
              <div className="team-stat-card">
                <div>
                  <h3>Managers</h3>
                  <p>{managerCount}</p>
                </div>
                <div className="stat-icon stat-manager">
                  <Lock size={24} />
                </div>
              </div>
            </div>

            {/* Search Bar */}
            <div className="team-search-wrapper">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                className="team-search-bar"
                placeholder="Search team members..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Team Members Table */}
            {filteredMembers.length === 0 ? (
              <div className="empty-team-table">
                <p>{searchQuery ? "No matching team members found." : "No team members yet. Add your first employee to get started!"}</p>
              </div>
            ) : (
              <div className="team-table-container">
                <table className="team-members-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Added Date</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMembers.map((member) => {
                      const displayName = member.name || member.email.split("@")[0];
                      const initials = displayName.split(" ").map(n => n.charAt(0)).join("").toUpperCase().slice(0, 2);
                      const colors = ["#d4af37", "#4f46e5", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#06b6d4"];
                      const colorIndex = (member.id || member.email).charCodeAt(0) % colors.length;
                      const bgColor = colors[colorIndex];
                      const addedDate = new Date(member.createdAt).toLocaleDateString();
                      
                      return (
                        <tr key={member.id || member.email}>
                          <td>
                            <div className="member-info">
                              <div className="member-avatar" style={{ backgroundColor: bgColor }}>
                                {initials}
                              </div>
                              <span className="member-name">{displayName}</span>
                            </div>
                          </td>
                          <td className="member-email">{member.email}</td>
                          <td>
                            <span className={`role-badge role-${member.role.toLowerCase()}`}>
                              {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                            </span>
                          </td>
                          <td>{addedDate}</td>
                          <td>
                            <div className="action-buttons">
                              <button
                                className="action-btn action-delete"
                                onClick={() => handleDeleteTeamMember(member.id || member.email)}
                                title="Delete employee"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Role Access Levels */}
            <div className="role-access-section">
              <h3 className="role-access-title">Role Access Levels</h3>
              <div className="role-access-grid">
                <div className="role-card role-owner-card">
                  <div className="role-icon-badge role-owner-icon">
                    <Wallet size={20} />
                  </div>
                  <h4>Owner</h4>
                  <p>Full access to all features</p>
                </div>
                <div className="role-card role-accountant-card">
                  <div className="role-icon-badge role-accountant-icon">
                    <BarChart2 size={20} />
                  </div>
                  <h4>Accountant</h4>
                  <p>Manage financials and taxes</p>
                </div>
                <div className="role-card role-manager-card">
                  <div className="role-icon-badge role-manager-icon">
                    <Users size={20} />
                  </div>
                  <h4>Manager</h4>
                  <p>View and manage reports</p>
                </div>
                <div className="role-card role-employee-card">
                  <div className="role-icon-badge role-employee-icon">
                    <Lock size={20} />
                  </div>
                  <h4>Employee</h4>
                  <p>Input data only</p>
                </div>
              </div>
            </div>
          </div>
        </div>

      {/* ------------ ADD EMPLOYEE MODAL ------------ */}
      {showModal && (
        <div className="modal-overlay">
          <div className="add-employee-modal">
            {/* HEADER */}
            <div className="modal-header">
              <span className="modal-title">👤 Add Employee</span>
              <button 
                className="modal-close" 
                onClick={() => {
                  setShowModal(false);
                  setSuccessMessage("");
                }}
              >
                ✖
              </button>
            </div>

            <p className="modal-subtitle">Invite a new team member</p>

            {successMessage && (
              <div className="modal-message" style={{
                background: successMessage.startsWith("✗") || successMessage.startsWith("Error") 
                  ? "rgba(239, 68, 68, 0.1)" 
                  : "rgba(34, 197, 94, 0.1)",
                border: `1px solid ${
                  successMessage.startsWith("✗") || successMessage.startsWith("Error")
                    ? "#ef4444"
                    : "#22c55e"
                }`,
                color: successMessage.startsWith("✗") || successMessage.startsWith("Error")
                  ? "#fca5a5"
                  : "#86efac",
                padding: "12px",
                borderRadius: "6px",
                fontSize: "13px",
                marginBottom: "16px",
                textAlign: "center"
              }}>
                {successMessage}
              </div>
            )}

            {/* EMAIL FIELD */}
            <label>Email Address</label>
            <input
              type="email"
              className="modal-input"
              placeholder="colleague@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />

            {/* ROLE SELECT */}
            <label>Role</label>
            <select
              className="modal-select"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              disabled={loading}
            >
              <option value="">Select a role</option>
              <option value="Owner">Owner</option>
              <option value="Accountant">Accountant</option>
              <option value="Manager">Manager</option>
              <option value="Employee">Employee</option>
            </select>

            {/* PASSWORD FIELD */}
            <label>Password</label>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <input
                type={showPassword ? "text" : "password"}
                className="modal-input"
                placeholder="Enter password (min 6 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                style={{ paddingRight: "40px" }}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: "absolute",
                  right: "12px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#d4af37"
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* CONFIRM PASSWORD FIELD */}
            <label>Confirm Password</label>
            <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
              <input
                type={showConfirmPassword ? "text" : "password"}
                className="modal-input"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                style={{ paddingRight: "40px" }}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                style={{
                  position: "absolute",
                  right: "12px",
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#d4af37"
                }}
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* BUTTONS */}
            <div className="modal-button-row">
              <button
                className="btn-cancel"
                onClick={() => {
                  setShowModal(false);
                  setSuccessMessage("");
                  setPassword("");
                  setConfirmPassword("");
                  setShowPassword(false);
                  setShowConfirmPassword(false);
                }}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                className="btn-send"
                disabled={!email || !role || !password || !confirmPassword || loading}
                onClick={handleSendInvite}
              >
                {loading ? "Adding..." : "Add Employee"}
              </button>
            </div>
          </div>
        </div>
      )}
      </main>
    </div>
  );
};

export default TeamManagement;
