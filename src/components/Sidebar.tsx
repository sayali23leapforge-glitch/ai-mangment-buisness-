import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Wallet, Boxes, ShoppingCart, BarChart2, PlusSquare,
  QrCode, Sparkles, ReceiptText, Banknote, Link as LinkIcon,
  Users, CreditCard, Settings, Zap, TrendingUp
} from "lucide-react";
import { useRole } from "../context/RoleContext";
import { hasPermission } from "../utils/rolePermissions";
import "../styles/Dashboard.css";

interface SidebarProps {
  sidebarOpen: boolean;
  onMenuClick: () => void;
}

export default function Sidebar({ sidebarOpen, onMenuClick }: SidebarProps) {
  const location = useLocation();
  const { currentRole } = useRole();
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    const storedProfile = localStorage.getItem("userProfile");
    if (storedProfile) setUserProfile(JSON.parse(storedProfile));
  }, []);

  const menuItems = [
    { icon: Wallet, label: "Finance Overview", feature: "finance" },
    { icon: Boxes, label: "Inventory Dashboard", feature: "inventory_dashboard" },
    { icon: ShoppingCart, label: "Record Sale", feature: "record_sale" },
    { icon: BarChart2, label: "Inventory Manager", feature: "inventory_manager" },
    { icon: PlusSquare, label: "Add Product", feature: "add_product" },
    { icon: QrCode, label: "QR & Barcodes", feature: "qr_barcodes" },
    { icon: Sparkles, label: "AI Insights", feature: "ai_insights" },
    { icon: ReceiptText, label: "Financial Reports", feature: "financial_reports" },
    { icon: Banknote, label: "Tax Center", feature: "tax_center" },
    { icon: LinkIcon, label: "Integrations", feature: "integrations" },
    { icon: Users, label: "Team Management", feature: "team_management" },
    { icon: CreditCard, label: "Billing & Plan", feature: "billing" },
    { icon: Zap, label: "Improvement Hub", feature: "improvement_hub" },
    { icon: Settings, label: "Settings", feature: "settings" },
  ];

  const makeRoute = (label: string) =>
    "/" + label.toLowerCase().replace(/ & /g, "-").replace(/ /g, "-").replace(/-/g, "-");

  return (
    <aside className={`sidebar ${sidebarOpen ? "open" : "closed"}`}>
      <div className="sidebar-header">
        <img src="/nayance-logo.jpeg" alt="Logo" className="sidebar-logo" />
        {sidebarOpen && <span className="company-name">| Golden Goods Inc.</span>}
      </div>

      <nav className="sidebar-nav">
        {menuItems
          .filter(item => hasPermission(currentRole as any, item.feature))
          .map((item, idx) => {
          const IconComponent = item.icon;
          const isActive = location.pathname === makeRoute(item.label);
          return (
            <Link
              key={idx}
              to={makeRoute(item.label)}
              className={`nav-item ${isActive ? "active" : ""}`}
            >
              <IconComponent size={18} className="nav-icon" />
              {sidebarOpen && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {sidebarOpen && userProfile && (
        <div className="sidebar-footer">
          <div className="location-main">
            {userProfile?.city && userProfile?.province 
              ? `${userProfile.city}, ${userProfile.province}` 
              : "Add Location"}
          </div>
          <div className="location-sub">
            {userProfile?.businessName || "Business Name"}
          </div>
        </div>
      )}
    </aside>
  );
}
