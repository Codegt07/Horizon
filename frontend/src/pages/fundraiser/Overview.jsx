import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../../components/DashboardLayout";
import StatCard from "../../components/StatCard";
import LoadingSpinner from "../../components/LoadingSpinner";
import api from "../../api/axios";

const Overview = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalOpportunities: 0,
    totalRaised: 0,
    activeCount: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await api.get("/api/opportunities");
        const opportunities = response.data.data;

        const totalRaised = opportunities.reduce((sum, opp) => sum + opp.raisedAmount, 0);
        const activeCount = opportunities.filter((opp) => opp.status === "active").length;

        setStats({
          totalOpportunities: opportunities.length,
          totalRaised,
          activeCount,
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
          title="Total Opportunities"
          value={stats.totalOpportunities}
          subtitle="All time"
          icon={
            <svg
              className="h-6 w-6 text-[#36A96A]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          }
        />
        <StatCard
          title="Total Raised"
          value={`₹${stats.totalRaised.toLocaleString()}`}
          subtitle="Across all opportunities"
          icon={
            <svg
              className="h-6 w-6 text-[#36A96A]"
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
          }
        />
        <StatCard
          title="Active Opportunities"
          value={stats.activeCount}
          subtitle="Currently accepting investments"
          icon={
            <svg
              className="h-6 w-6 text-[#36A96A]"
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
      </div>

      {/* Quick Actions */}
      <div className="grid gap-6 md:grid-cols-2">
        <Link
          to="/fundraiser/opportunities/create"
          className="rounded-lg border border-[#E2E8F0] bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-[#E8F8ED]">
            <svg
              className="h-6 w-6 text-[#36A96A]"
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
          <h3 className="mb-2 text-lg font-semibold text-[#0F172A]">Create New Opportunity</h3>
          <p className="text-sm text-[#64748B]">
            Start a new funding campaign to raise capital for your project
          </p>
        </Link>

        <Link
          to="/fundraiser/opportunities"
          className="rounded-lg border border-[#E2E8F0] bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-[#E8F8ED]">
            <svg
              className="h-6 w-6 text-[#36A96A]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          </div>
          <h3 className="mb-2 text-lg font-semibold text-[#0F172A]">Manage Opportunities</h3>
          <p className="text-sm text-[#64748B]">
            View, edit, and track progress of your funding campaigns
          </p>
        </Link>
      </div>
    </DashboardLayout>
  );
};

export default Overview;

