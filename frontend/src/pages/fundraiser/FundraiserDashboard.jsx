import { Routes, Route, Navigate } from "react-router-dom";
import Overview from "./Overview";
import MyOpportunities from "./MyOpportunities";
import CreateOpportunity from "./CreateOpportunity";
import EditOpportunity from "./EditOpportunity";
import OpportunityInvestors from "./OpportunityInvestors";

const FundraiserDashboard = () => {
  return (
    <Routes>
      <Route index element={<Overview />} />
      <Route path="opportunities" element={<MyOpportunities />} />
      <Route path="opportunities/create" element={<CreateOpportunity />} />
      <Route path="opportunities/:id/edit" element={<EditOpportunity />} />
      <Route path="opportunities/:id/investors" element={<OpportunityInvestors />} />
      <Route path="*" element={<Navigate to="/fundraiser" replace />} />
    </Routes>
  );
};

export default FundraiserDashboard;
