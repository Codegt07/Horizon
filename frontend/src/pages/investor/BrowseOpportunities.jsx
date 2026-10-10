import { useState, useEffect } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import OpportunityCard from "../../components/OpportunityCard";
import LoadingSpinner from "../../components/LoadingSpinner";
import EmptyState from "../../components/EmptyState";
import api from "../../api/axios";

const BrowseOpportunities = () => {
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
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

    fetchOpportunities();
  }, []);

  if (loading) {
    return (
      <DashboardLayout title="Browse Opportunities">
        <LoadingSpinner />
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Browse Opportunities">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Browse Opportunities">
      {opportunities.length === 0 ? (
        <EmptyState
          title="No opportunities available"
          description="There are no active investment opportunities at the moment. Check back later!"
        />
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {opportunities.map((opportunity) => (
            <OpportunityCard
              key={opportunity._id}
              opportunity={opportunity}
              linkTo={`/investor/opportunities/${opportunity._id}`}
            />
          ))}
        </div>
      )}
    </DashboardLayout>
  );
};

export default BrowseOpportunities;

