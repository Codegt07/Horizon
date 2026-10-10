import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Home = () => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
        <div className="text-lg text-[#0F172A]">Loading...</div>
      </div>
    );
  }

  // If authenticated, show personalized greeting
  if (isAuthenticated && user) {
    const dashboardLink = user.role === "investor" ? "/investor" : "/fundraiser";

    return (
      <div className="flex min-h-screen flex-col bg-[#F8FAFC]">
        {/* Header */}
        <header className="border-b border-[#E2E8F0] bg-white">
          <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
            <h1 className="text-2xl font-bold text-[#123B32]">InvestMate</h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-[#64748B]">Welcome, {user.name}</span>
              <Link
                to={dashboardLink}
                className="rounded-md bg-[#123B32] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0F2E27]"
              >
                Go to Dashboard
              </Link>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex flex-1 items-center justify-center">
          <div className="text-center">
            <h2 className="text-4xl font-bold text-[#123B32]">
              Welcome to InvestMate
            </h2>
            <p className="mt-4 text-lg text-[#64748B]">
              Your investment simulation platform
            </p>
          </div>
        </main>
      </div>
    );
  }

  // Public landing page
  return (
    <div className="flex min-h-screen flex-col bg-[#F8FAFC]">
      {/* Header */}
      <header className="border-b border-[#E2E8F0] bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4">
          <h1 className="text-2xl font-bold text-[#123B32]">InvestMate</h1>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="rounded-md border border-[#E2E8F0] bg-white px-4 py-2 text-sm font-medium text-[#0F172A] transition-colors hover:bg-[#F8FAFC]"
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className="rounded-md bg-[#123B32] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0F2E27]"
            >
              Sign up
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="max-w-3xl text-center">
          <h2 className="text-5xl font-bold text-[#123B32]">
            Investment Simulation Platform
          </h2>
          <p className="mt-6 text-xl text-[#64748B]">
            Practice investing and fundraising in a risk-free environment.
            Build your portfolio, create opportunities, and learn how capital markets work.
          </p>
          <div className="mt-10 flex justify-center gap-4">
            <Link
              to="/register"
              className="rounded-md bg-[#123B32] px-6 py-3 text-base font-medium text-white transition-colors hover:bg-[#0F2E27]"
            >
              Get started
            </Link>
            <Link
              to="/login"
              className="rounded-md border border-[#E2E8F0] bg-white px-6 py-3 text-base font-medium text-[#0F172A] transition-colors hover:bg-[#F8FAFC]"
            >
              Sign in
            </Link>
          </div>

          {/* Features */}
          <div className="mt-20 grid gap-8 md:grid-cols-2">
            <div className="rounded-lg border border-[#E2E8F0] bg-white p-6 text-left">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-[#F0FDF4]">
                <svg
                  className="h-6 w-6 text-[#16A34A]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-[#123B32]">For Investors</h3>
              <p className="mt-2 text-sm text-[#64748B]">
                Browse investment opportunities, build a diverse portfolio, and track your returns
                in real-time.
              </p>
            </div>

            <div className="rounded-lg border border-[#E2E8F0] bg-white p-6 text-left">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-lg bg-[#F0FDF4]">
                <svg
                  className="h-6 w-6 text-[#16A34A]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-[#123B32]">For Fundraisers</h3>
              <p className="mt-2 text-sm text-[#64748B]">
                Create funding opportunities, attract investors, and manage your campaigns from
                start to finish.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Home;
