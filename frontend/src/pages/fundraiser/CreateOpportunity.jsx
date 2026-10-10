import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import DashboardLayout from "../../components/DashboardLayout";
import OpportunityForm from "../../components/OpportunityForm";
import api from "../../api/axios";

const CreateOpportunity = () => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState("");

  const handleSubmit = async (formData) => {
    setApiError("");
    setIsSubmitting(true);

    try {
      await api.post("/api/opportunities", formData);
      navigate("/fundraiser/opportunities");
    } catch (err) {
      if (err.response?.data?.message) {
        setApiError(err.response.data.message);
      } else if (err.response?.data?.errors) {
        setApiError(err.response.data.errors.map((e) => e.message).join(", "));
      } else {
        setApiError("Failed to create opportunity. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout title="Create Opportunity">
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
          onSubmit={handleSubmit}
          isSubmitting={isSubmitting}
          submitLabel="Create Opportunity"
        />
      </div>
    </DashboardLayout>
  );
};

export default CreateOpportunity;

