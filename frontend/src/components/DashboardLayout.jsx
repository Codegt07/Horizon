import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const DashboardLayout = ({ children, title }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  const dashboardLink = user?.role === "investor" ? "/investor" : "/fundraiser";

  return (
    <div className="flex min-h-screen flex-col bg-[#F8FAFC]">
      {/* Header */}
      <header className="border-b border-[#E2E8F0] bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-8">
            <Link to="/" className="text-2xl font-bold text-[#0F172A]">
              InvestMate
            </Link>
            <Link
              to={dashboardLink}
              className="text-sm font-medium text-[#64748B] transition-colors hover:text-[#0F172A]"
            >
              Dashboard
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-sm font-medium text-[#0F172A]">{user?.name}</p>
              <p className="text-xs text-[#64748B] capitalize">{user?.role}</p>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-md border border-[#E2E8F0] bg-white px-4 py-2 text-sm font-medium text-[#0F172A] transition-colors hover:bg-[#F8FAFC]"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-8">
          {title && <h1 className="mb-6 text-3xl font-bold text-[#0F172A]">{title}</h1>}
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
