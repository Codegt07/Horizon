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
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:py-4">
          <div className="flex items-center gap-4 sm:gap-8">
            <Link to="/" className="text-xl font-bold text-[#0F172A] sm:text-2xl">
              InvestMate
            </Link>
            <Link
              to={dashboardLink}
              className="hidden text-sm font-medium text-[#64748B] transition-colors hover:text-[#0F172A] sm:block"
            >
              Dashboard
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium text-[#0F172A]">{user?.name}</p>
              <p className="text-xs capitalize text-[#64748B]">{user?.role}</p>
            </div>
            <button
              onClick={handleLogout}
              className="cursor-pointer rounded-md border border-[#E2E8F0] bg-white px-3 py-1.5 text-sm font-medium text-[#0F172A] transition-colors hover:bg-[#F8FAFC] sm:px-4 sm:py-2"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:py-8">
          {title && <h1 className="mb-4 text-2xl font-bold text-[#0F172A] sm:mb-6 sm:text-3xl">{title}</h1>}
          {children}
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;

