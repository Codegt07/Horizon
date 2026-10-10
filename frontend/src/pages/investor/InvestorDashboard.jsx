import { Routes, Route, Navigate } from "react-router-dom";
import Overview from "./Overview";
import BrowseOpportunities from "./BrowseOpportunities";
import OpportunityDetails from "./OpportunityDetails";
import MyInvestments from "./MyInvestments";
import Wallet from "./Wallet";

const InvestorDashboard = () => {
  return (
    <Routes>
      <Route index element={<Overview />} />
      <Route path="opportunities" element={<BrowseOpportunities />} />
      <Route path="opportunities/:id" element={<OpportunityDetails />} />
      <Route path="investments" element={<MyInvestments />} />
      <Route path="wallet" element={<Wallet />} />
      <Route path="*" element={<Navigate to="/investor" replace />} />
    </Routes>
  );
};

export default InvestorDashboard;

