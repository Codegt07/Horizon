import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import RoleRoute from "./components/RoleRoute";

// Placeholder pages - will be built in Phase 7+
const HomePage = () => (
  <div className="flex h-screen items-center justify-center">
    <h1 className="text-3xl font-bold">InvestMate - Home</h1>
  </div>
);

const LoginPage = () => (
  <div className="flex h-screen items-center justify-center">
    <h1 className="text-3xl font-bold">Login Page</h1>
  </div>
);

const InvestorDashboard = () => (
  <div className="flex h-screen items-center justify-center">
    <h1 className="text-3xl font-bold">Investor Dashboard</h1>
  </div>
);

const FundraiserDashboard = () => (
  <div className="flex h-screen items-center justify-center">
    <h1 className="text-3xl font-bold">Fundraiser Dashboard</h1>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />

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
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
