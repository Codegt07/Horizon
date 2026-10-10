import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../../components/DashboardLayout";
import StatCard from "../../components/StatCard";
import LoadingSpinner from "../../components/LoadingSpinner";
import api from "../../api/axios";

const Overview = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    walletBalance: 0,
    totalInvested: 0,
    investmentCount: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [balanceRes, investmentsRes] = await Promise.all([
          api.get("/api/wallet/balance"),
          api.get("/api/investments/my"),
        ]);

        const balance = balanceRes.data.data.walletBalance;
        const investments = investmentsRes.data.data;
        const totalInvested = investments.reduce((sum, inv) => sum + inv.amount, 0);

        setStats({
          walletBalance: balance,
          totalInvested,
          investmentCount: investments.length,
        });
      } catch (error) {
        console.error("Failed to fetch overview data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <DashboardLayout title="Dashboard">
        <LoadingSpinner />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Dashboard">
      {/* Stats Grid */}
      <div className="mb-8 grid gap-6 md:grid-cols-3">
        <StatCard
          title="Wallet Balance"
          value={`₹${stats.walletBalance.toLocaleString()}`}
          subtitle="Available to invest"
          icon={
            <svg
              className="h-6 w-6 text-[#57C97F]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
              />
            </svg>
          }
        />
        <StatCard
          title="Total Invested"
          value={`₹${stats.totalInvested.toLocaleString()}`}
          subtitle="Across all opportunities"
          icon={
            <svg
              className="h-6 w-6 text-[#57C97F]"
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
          }
        />
        <StatCard
          title="Active Investments"
          value={stats.investmentCount}
          subtitle="Opportunities invested in"
          icon={
            <svg
              className="h-6 w-6 text-[#57C97F]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />
      </div>

      {/* Quick Actions */}
      <div className="grid gap-6 md:grid-cols-2">
        <Link
          to="/investor/opportunities"
          className="rounded-lg border border-[#E2E8F0] bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-[#E8F8ED]">
            <svg
              className="h-6 w-6 text-[#57C97F]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <h3 className="mb-2 text-lg font-semibold text-[#0F172A]">Browse Opportunities</h3>
          <p className="text-sm text-[#64748B]">
            Discover and invest in active funding opportunities
          </p>
        </Link>

        <Link
          to="/investor/wallet"
          className="rounded-lg border border-[#E2E8F0] bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-[#E8F8ED]">
            <svg
              className="h-6 w-6 text-[#57C97F]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
          </div>
          <h3 className="mb-2 text-lg font-semibold text-[#0F172A]">Add Funds</h3>
          <p className="text-sm text-[#64748B]">
            Deposit money to your wallet and start investing
          </p>
        </Link>
      </div>
    </DashboardLayout>
  );
};

export default Overview;
