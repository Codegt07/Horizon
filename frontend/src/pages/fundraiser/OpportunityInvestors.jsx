import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import DashboardLayout from "../../components/DashboardLayout";
import LoadingSpinner from "../../components/LoadingSpinner";
import EmptyState from "../../components/EmptyState";
import api from "../../api/axios";

const OpportunityInvestors = () => {
  const { id } = useParams();
  const [opportunity, setOpportunity] = useState(null);
  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [oppRes, invRes] = await Promise.all([
          api.get(`/api/opportunities/${id}`),
          api.get(`/api/investments/opportunity/${id}`),
        ]);

        setOpportunity(oppRes.data.data);
        setInvestments(invRes.data.data);
      } catch (err) {
        if (err.response?.status === 404 || err.response?.status === 403) {
          setError("Opportunity not found or access denied.");
        } else {
          setError("Failed to load investors.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  if (loading) {
    return (
      <DashboardLayout title="Investors">
        <LoadingSpinner />
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Investors">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
        <Link
          to="/fundraiser/opportunities"
          className="mt-4 inline-block text-sm font-medium text-[#57C97F] hover:text-[#45B76A]"
        >
          ← Back to opportunities
        </Link>
      </DashboardLayout>
    );
  }

  const totalInvested = investments.reduce((sum, inv) => sum + inv.amount, 0);

  return (
    <DashboardLayout title={opportunity.title}>
      <Link
        to="/fundraiser/opportunities"
        className="mb-6 inline-flex items-center text-sm font-medium text-[#57C97F] hover:text-[#45B76A]"
      >
        <svg className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to opportunities
      </Link>

      {/* Summary Card */}
      <div className="mb-6 rounded-lg border border-[#E2E8F0] bg-white p-6 shadow-sm">
        <div className="grid gap-6 md:grid-cols-4">
          <div>
            <p className="text-sm text-[#64748B]">Total Investors</p>
            <p className="mt-1 text-2xl font-bold text-[#0F172A]">{investments.length}</p>
          </div>
          <div>
            <p className="text-sm text-[#64748B]">Total Raised</p>
            <p className="mt-1 text-2xl font-bold text-[#0F172A]">
              ₹{totalInvested.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-[#64748B]">Target Amount</p>
            <p className="mt-1 text-2xl font-bold text-[#0F172A]">
              ₹{opportunity.targetAmount.toLocaleString()}
            </p>
          </div>
          <div>
            <p className="text-sm text-[#64748B]">Progress</p>
            <p className="mt-1 text-2xl font-bold text-[#0F172A]">
              {((opportunity.raisedAmount / opportunity.targetAmount) * 100).toFixed(1)}%
            </p>
          </div>
        </div>
      </div>

      {/* Investors List */}
      {investments.length === 0 ? (
        <EmptyState
          title="No investors yet"
          description="Once investors start funding this opportunity, they'll appear here."
        />
      ) : (
        <div className="rounded-lg border border-[#E2E8F0] bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-[#E2E8F0] bg-[#F8FAFC]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#64748B]">
                    Investor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#64748B]">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#64748B]">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-[#64748B]">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {investments.map((investment) => (
                  <tr key={investment._id} className="hover:bg-[#F8FAFC]">
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-[#0F172A]">
                      {investment.investorId?.name || "Unknown"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-[#64748B]">
                      {investment.investorId?.email || "—"}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm font-semibold text-[#0F172A]">
                      ₹{investment.amount.toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-[#64748B]">
                      {new Date(investment.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
};

export default OpportunityInvestors;
