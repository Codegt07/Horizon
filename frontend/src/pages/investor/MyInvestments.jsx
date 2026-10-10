import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../../components/DashboardLayout";
import LoadingSpinner from "../../components/LoadingSpinner";
import EmptyState from "../../components/EmptyState";
import api from "../../api/axios";

const MyInvestments = () => {
  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchInvestments = async () => {
      try {
        const response = await api.get("/api/investments/my");
        setInvestments(response.data.data);
      } catch (err) {
        setError("Failed to load investments. Please try again.");
        console.error("Failed to fetch investments:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchInvestments();
  }, []);

  if (loading) {
    return (
      <DashboardLayout title="My Investments">
        <LoadingSpinner />
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="My Investments">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      </DashboardLayout>
    );
  }

  const totalInvested = investments.reduce((sum, inv) => sum + inv.amount, 0);

  return (
    <DashboardLayout title="My Investments">
      {investments.length === 0 ? (
        <EmptyState
          title="No investments yet"
          description="You haven't invested in any opportunities yet. Start exploring!"
          action={
            <Link
              to="/investor/opportunities"
              className="rounded-md bg-[#57C97F] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#45B76A]"
            >
              Browse Opportunities
            </Link>
          }
        />
      ) : (
        <>
          {/* Summary */}
          <div className="mb-6 rounded-lg border border-[#E2E8F0] bg-white p-6 shadow-sm">
            <div className="grid gap-6 md:grid-cols-3">
              <div>
                <p className="text-sm text-[#64748B]">Total Invested</p>
                <p className="mt-1 text-2xl font-bold text-[#0F172A]">
                  ₹{totalInvested.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-[#64748B]">Number of Investments</p>
                <p className="mt-1 text-2xl font-bold text-[#0F172A]">{investments.length}</p>
              </div>
              <div>
                <p className="text-sm text-[#64748B]">Active Opportunities</p>
                <p className="mt-1 text-2xl font-bold text-[#0F172A]">
                  {investments.filter((inv) => inv.opportunityId?.status === "active").length}
                </p>
              </div>
            </div>
          </div>

          {/* Investments List */}
          <div className="space-y-4">
            {investments.map((investment) => {
              const opportunity = investment.opportunityId;
              if (!opportunity) {
                return null; // Opportunity might be deleted
              }

              const progress = (opportunity.raisedAmount / opportunity.targetAmount) * 100;

              return (
                <div
                  key={investment._id}
                  className="rounded-lg border border-[#E2E8F0] bg-white p-6 shadow-sm"
                >
                  <div className="grid gap-6 lg:grid-cols-3">
                    {/* Opportunity Info */}
                    <div className="lg:col-span-2">
                      <div className="mb-2 flex items-start justify-between">
                        <h3 className="text-lg font-semibold text-[#0F172A]">
                          {opportunity.title}
                        </h3>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                            opportunity.status === "active"
                              ? "bg-[#E8F8ED] text-[#0F172A]"
                              : opportunity.status === "closed"
                              ? "bg-gray-100 text-gray-600"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {opportunity.status}
                        </span>
                      </div>

                      {/* Progress */}
                      <div className="mb-4">
                        <div className="mb-1 flex justify-between text-sm">
                          <span className="text-[#64748B]">
                            ₹{opportunity.raisedAmount.toLocaleString()} raised of ₹
                            {opportunity.targetAmount.toLocaleString()}
                          </span>
                          <span className="text-[#64748B]">{progress.toFixed(0)}%</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-gray-200">
                          <div
                            className="h-full rounded-full bg-[#57C97F]"
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          />
                        </div>
                      </div>

                      <p className="text-sm text-[#64748B]">
                        Deadline: {new Date(opportunity.deadline).toLocaleDateString()}
                      </p>
                    </div>

                    {/* Investment Info */}
                    <div className="flex flex-col justify-between rounded-lg bg-[#F8FAFC] p-4">
                      <div>
                        <p className="mb-1 text-xs text-[#64748B]">Your investment</p>
                        <p className="text-2xl font-bold text-[#0F172A]">
                          ₹{investment.amount.toLocaleString()}
                        </p>
                        <p className="mt-2 text-xs text-[#64748B]">
                          Invested on {new Date(investment.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      {opportunity.status === "active" && (
                        <Link
                          to={`/investor/opportunities/${opportunity._id}`}
                          className="mt-4 text-sm font-medium text-[#57C97F] hover:text-[#45B76A]"
                        >
                          View details →
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </DashboardLayout>
  );
};

export default MyInvestments;
