import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../../components/DashboardLayout";
import LoadingSpinner from "../../components/LoadingSpinner";
import EmptyState from "../../components/EmptyState";
import api from "../../api/axios";

const MyOpportunities = () => {
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState(null);

  const fetchOpportunities = async () => {
    try {
      const response = await api.get("/api/opportunities");
      setOpportunities(response.data.data);
    } catch (err) {
      setError("Failed to load opportunities. Please try again.");
      console.error("Failed to fetch opportunities:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOpportunities();
  }, []);

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this opportunity? This action cannot be undone.")) {
      return;
    }

    setDeletingId(id);

    try {
      await api.delete(`/api/opportunities/${id}`);
      // Refresh the list
      await fetchOpportunities();
    } catch (err) {
      const message = err.response?.data?.message || "Failed to delete opportunity";
      alert(message);
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="My Opportunities">
        <LoadingSpinner />
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="My Opportunities">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="My Opportunities">
      <div className="mb-6 flex items-center justify-between">
        <p className="text-sm text-[#64748B]">
          {opportunities.length} {opportunities.length === 1 ? "opportunity" : "opportunities"}
        </p>
        <Link
          to="/fundraiser/opportunities/create"
          className="cursor-pointer rounded-md bg-[#36A96A] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#2D8A57]"
        >
          Create New
        </Link>
      </div>

      {opportunities.length === 0 ? (
        <EmptyState
          title="No opportunities yet"
          description="Create your first funding opportunity to start raising capital for your project."
          action={
            <Link
              to="/fundraiser/opportunities/create"
              className="cursor-pointer rounded-md bg-[#36A96A] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#2D8A57]"
            >
              Create Opportunity
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {opportunities.map((opportunity) => (
            <div
              key={opportunity._id}
              className="rounded-lg border border-[#E2E8F0] bg-white p-6 shadow-sm"
            >
              <div className="grid gap-6 lg:grid-cols-4">
                {/* Opportunity Info */}
                <div className="lg:col-span-3">
                  <div className="mb-4 flex items-start justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-[#0F172A]">{opportunity.title}</h3>
                      <span
                        className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
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
                  </div>

                  <p className="mb-4 line-clamp-2 text-sm text-[#64748B]">
                    {opportunity.description}
                  </p>

                  {/* Progress */}
                  <div>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="font-medium text-[#0F172A]">
                        ₹{opportunity.raisedAmount.toLocaleString()} raised
                      </span>
                      <span className="text-[#64748B]">
                        of ₹{opportunity.targetAmount.toLocaleString()}
                      </span>
                    </div>
                    <div className="h-2 w-full rounded-full bg-gray-200">
                      <div
                        className="h-full rounded-full bg-[#36A96A]"
                        style={{
                          width: `${Math.min(
                            (opportunity.raisedAmount / opportunity.targetAmount) * 100,
                            100
                          )}%`,
                        }}
                      />
                    </div>
                    <p className="mt-1 text-sm text-[#64748B]">
                      Deadline: {new Date(opportunity.deadline).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-2">
                  <Link
                    to={`/fundraiser/opportunities/${opportunity._id}/investors`}
                    className="cursor-pointer rounded-md border border-[#E2E8F0] bg-white px-4 py-2 text-center text-sm font-medium text-[#0F172A] transition-colors hover:bg-[#F8FAFC]"
                  >
                    View Investors
                  </Link>
                  {opportunity.status !== "closed" && (
                    <Link
                      to={`/fundraiser/opportunities/${opportunity._id}/edit`}
                      className="cursor-pointer rounded-md border border-[#E2E8F0] bg-white px-4 py-2 text-center text-sm font-medium text-[#0F172A] transition-colors hover:bg-[#F8FAFC]"
                    >
                      Edit
                    </Link>
                  )}
                  {opportunity.status === "draft" && (
                    <button
                      onClick={() => handleDelete(opportunity._id)}
                      disabled={deletingId === opportunity._id}
                      className="cursor-pointer rounded-md border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {deletingId === opportunity._id ? "Deleting..." : "Delete"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

export default MyOpportunities;

