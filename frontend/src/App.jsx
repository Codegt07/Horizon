import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import RoleRoute from "./components/RoleRoute";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";
import CompleteProfile from "./pages/CompleteProfile";

// Placeholder dashboards - will be built in Phase 8+
const InvestorDashboard = () => (
  <div className="flex h-screen items-center justify-center bg-[#F8FAFC]">
    <div className="text-center">
      <h1 className="text-3xl font-bold text-[#123B32]">Investor Dashboard</h1>
      <p className="mt-2 text-[#64748B]">Coming soon in Phase 8</p>
    </div>
  </div>
);

const FundraiserDashboard = () => (
  <div className="flex h-screen items-center justify-center bg-[#F8FAFC]">
    <div className="text-center">
      <h1 className="text-3xl font-bold text-[#123B32]">Fundraiser Dashboard</h1>
      <p className="mt-2 text-[#64748B]">Coming soon in Phase 8</p>
    </div>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/complete-profile" element={<CompleteProfile />} />

          {/* Dashboard redirect - backend uses this after OAuth */}
          <Route path="/dashboard" element={<Navigate to="/" replace />} />

          {/* Protected investor routes */}
          <Route
            path="/investor/*"
            element={
              <ProtectedRoute>
                <RoleRoute allowedRoles={["investor"]}>
                  <InvestorDashboard />
                </RoleRoute>
              </ProtectedRoute>
            }
          />

          {/* Protected fundraiser routes */}
          <Route
            path="/fundraiser/*"
            element={
              <ProtectedRoute>
                <RoleRoute allowedRoles={["fundraiser"]}>
                  <FundraiserDashboard />
                </RoleRoute>
              </ProtectedRoute>
            }
          />

          {/* Catch-all redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
