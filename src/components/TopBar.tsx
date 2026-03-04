import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, Bell, LogOut, User as UserIcon, AlertCircle, TrendingUp } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useRole } from "../context/RoleContext";
import SwitchRole from "./SwitchRole";
import { signOut } from "firebase/auth";
import { auth } from "../config/firebase";
import { getNotifications } from "../utils/smartNotifications";
import { isShopifyConnected } from "../utils/shopifyDataFetcher";
import "../styles/TopBar.css";

interface TopBarProps {
  onMenuClick: () => void;
  onRoleChange?: (role: string) => void;
}

interface Notification {
  id: string;
  type: "email" | "stock" | "report";
  title: string;
  message: string;
  time: string;
  icon: any;
}

export default function TopBar({ onMenuClick, onRoleChange }: TopBarProps) {
  const [userDropdown, setUserDropdown] = useState(false);
  const [notificationDropdown, setNotificationDropdown] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const notificationRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();
  const { currentRole } = useRole();
  const navigate = useNavigate();

  // Function to load real notifications from Smart Notifications service
  const loadNotifications = () => {
    try {
      // Only show notifications if Shopify is connected
      if (!isShopifyConnected()) {
        setNotifications([]);
        return;
      }

      // Get real notifications from Smart Notifications service
      const realNotifications = getNotifications();
      
      // Convert Smart Notifications to UI format
      const displayNotifications: Notification[] = realNotifications
        .filter(n => !n.read) // Only show unread notifications
        .slice(0, 5) // Show top 5
        .map(n => ({
          id: n.id,
          type: n.type === "low-stock" ? "stock" : "report",
          title: n.title,
          message: n.message,
          time: new Date(n.timestamp).toLocaleString(),
          icon: n.type === "low-stock" ? AlertCircle : TrendingUp
        }));

      setNotifications(displayNotifications);
      console.log(`📬 TopBar: Loaded ${displayNotifications.length} real notifications (Shopify connected)`);
    } catch (err) {
      console.error("Error loading notifications:", err);
    }
  };

  // Load notifications on mount and listen for notification changes
  useEffect(() => {
    loadNotifications();

    // Listen for storage changes (when new notifications are added)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "nayance_notifications") {
        loadNotifications();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    
    // Refresh notifications every 5 seconds to get real-time updates
    const interval = setInterval(loadNotifications, 5000);
    
    return () => {
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  // Close notification dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) {
        setNotificationDropdown(false);
      }
    };

    if (notificationDropdown) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [notificationDropdown]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      
      // Clear authentication data from localStorage
      localStorage.removeItem("userRole");
      localStorage.removeItem("loginType");
      localStorage.removeItem("employeeEmail");
      localStorage.removeItem("userProfile");
      
      // Clear Remember Me data
      localStorage.removeItem("rememberMe");
      localStorage.removeItem("rememberedEmail");
      
      console.log("✅ Logged out - localStorage cleared");
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const userName = user?.displayName || user?.email?.split("@")[0] || "User";
  const userEmail = user?.email || "no-email@example.com";

  return (
    <div className="top-bar">
      <button className="sidebar-toggle" onClick={onMenuClick}>
        <Menu size={20} />
      </button>

      <div className="topbar-right">
        <SwitchRole />

        <div className="user-menu">
          <div className="notification-wrapper" ref={notificationRef}>
            <button 
              className="notif-icon-btn"
              onClick={() => setNotificationDropdown(!notificationDropdown)}
              title="Notifications"
            >
              <Bell size={20} className="notif-icon" />
              {notifications.length > 0 && (
                <span className="notification-badge">{notifications.length}</span>
              )}
            </button>

            {notificationDropdown && (
              <div className="notification-dropdown">
                <div className="notification-header">
                  <h3>Notifications</h3>
                  {notifications.length > 0 && (
                    <span className="notification-count">{notifications.length}</span>
                  )}
                </div>
                
                {notifications.length > 0 ? (
                  <div className="notification-list">
                    {notifications.map((notif) => {
                      const Icon = notif.icon;
                      return (
                        <div key={notif.id} className={`notification-item notif-${notif.type}`}>
                          <div className="notif-icon-container">
                            <Icon size={18} />
                          </div>
                          <div className="notif-content">
                            <div className="notif-title">{notif.title}</div>
                            <div className="notif-message">{notif.message}</div>
                            <div className="notif-time">{notif.time}</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="notification-empty">
                    <Bell size={32} className="empty-icon" />
                    <p>No notifications</p>
                    <small>Enable toggles in Settings to receive notifications</small>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="user-menu-wrapper">
            <button
              className="user-profile-btn"
              onClick={() => setUserDropdown(!userDropdown)}
            >
              <div className="user-avatar">{userName.charAt(0).toUpperCase()}</div>
              <div className="user-info">
                <div className="user-name">{userName}</div>
                <div className="user-role" style={{ textTransform: 'capitalize' }}>{currentRole}</div>
              </div>
            </button>

            {userDropdown && (
              <div className="user-dropdown-menu">
                <div className="user-dropdown-header">
                  <div className="user-avatar-large">{userName.charAt(0).toUpperCase()}</div>
                  <div>
                    <div className="dropdown-user-name">{userName}</div>
                    <div className="dropdown-user-email">{userEmail}</div>
                  </div>
                </div>
                <div className="dropdown-divider"></div>
                <div className="dropdown-item" onClick={() => {
                  navigate("/settings");
                  setUserDropdown(false);
                }}>
                  <UserIcon size={16} />
                  Profile Settings
                </div>
                <div className="dropdown-divider"></div>
                <div className="dropdown-item logout" onClick={handleLogout}>
                  <LogOut size={16} />
                  Logout
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
