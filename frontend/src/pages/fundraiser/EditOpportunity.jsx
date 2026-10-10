import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import DashboardLayout from "../../components/DashboardLayout";
import OpportunityForm from "../../components/OpportunityForm";
import LoadingSpinner from "../../components/LoadingSpinner";
import api from "../../api/axios";

const EditOpportunity = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [opportunity, setOpportunity] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState("");

  useEffect(() => {
    const fetchOpportunity = async () => {
      try {
        const response = await api.get(`/api/opportunities/${id}`);
        setOpportunity(response.data.data);
      } catch (err) {
        if (err.response?.status === 404) {
          setError("Opportunity not found.");
        } else {
          setError("Failed to load opportunity.");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchOpportunity();
  }, [id]);

  const handleSubmit = async (formData) => {
    setApiError("");
    setIsSubmitting(true);

    try {
      await api.patch(`/api/opportunities/${id}`, formData);
      navigate("/fundraiser/opportunities");
    } catch (err) {
      if (err.response?.data?.message) {
        setApiError(err.response.data.message);
      } else if (err.response?.data?.errors) {
        setApiError(err.response.data.errors.map((e) => e.message).join(", "));
      } else {
        setApiError("Failed to update opportunity. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Edit Opportunity">
        <LoadingSpinner />
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Edit Opportunity">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
        <Link
          to="/fundraiser/opportunities"
          className="mt-4 inline-block text-sm font-medium text-[#36A96A] hover:text-[#2D8A57]"
        >
          ← Back to opportunities
        </Link>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Edit Opportunity">
      <Link
        to="/fundraiser/opportunities"
        className="mb-6 inline-flex items-center text-sm font-medium text-[#36A96A] hover:text-[#2D8A57]"
      >
        <svg className="mr-1 h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to opportunities
      </Link>

      <div className="rounded-lg border border-[#E2E8F0] bg-white p-6 shadow-sm">
        {apiError && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            {apiError}
          </div>
        )}

        <OpportunityForm
          initialData={opportunity}
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          submitLabel="Update Opportunity"
        />
      </div>
    </DashboardLayout>
  );
};

export default EditOpportunity;

