import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";

const CompleteProfile = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, user, loading: authLoading } = useAuth();

  const [formData, setFormData] = useState({
    name: "",
    role: "",
  });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect authenticated users with complete profiles
  useEffect(() => {
    if (!authLoading && isAuthenticated && user?.isProfileComplete) {
      const destination = user.role === "investor" ? "/investor" : "/fundraiser";
      navigate(destination, { replace: true });
    }
  }, [isAuthenticated, user, authLoading, navigate]);

  const validateField = (name, value) => {
    switch (name) {
      case "name":
        if (!value.trim()) return "Name is required";
        if (value.trim().length > 100) return "Name cannot exceed 100 characters";
        return "";
      case "role":
        if (!value) return "Please select your role";
        if (!["investor", "fundraiser"].includes(value)) return "Invalid role selected";
        return "";
      default:
        return "";
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear field error on change
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
    // Clear API error on any change
    if (apiError) setApiError("");
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    const error = validateField(name, value);
    if (error) {
      setErrors((prev) => ({ ...prev, [name]: error }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError("");

    // Validate all fields
    const newErrors = {};
    Object.keys(formData).forEach((key) => {
      const error = validateField(key, formData[key]);
      if (error) newErrors[key] = error;
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await api.post("/api/auth/complete-profile", formData);
      const userData = response.data.data;

      // Update auth state with completed profile
      login(userData);

      // Navigate based on role
      const destination = userData.role === "investor" ? "/investor" : "/fundraiser";
      navigate(destination, { replace: true });
    } catch (error) {
      if (error.response?.status === 401) {
        // Partial token expired - redirect to login
        setApiError("Your session has expired. Please sign in again.");
        setTimeout(() => navigate("/login"), 2000);
      } else if (error.response?.data?.message) {
        setApiError(error.response.data.message);
      } else if (error.response?.data?.errors) {
        // Field-level validation errors from backend
        const backendErrors = {};
        error.response.data.errors.forEach((err) => {
          backendErrors[err.field] = err.message;
        });
        setErrors(backendErrors);
      } else {
        setApiError("Failed to complete profile. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
        <div className="text-lg text-[#0F172A]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-4 py-12">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-[#123B32]">Complete Your Profile</h1>
          <p className="mt-2 text-[#64748B]">
            We need a bit more information to set up your account
          </p>
        </div>

        {/* Card */}
        <div className="rounded-lg border border-[#E2E8F0] bg-white p-8 shadow-sm">
          {/* API Error */}
          {apiError && (
            <div className="mb-6 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {apiError}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate>
            {/* Name */}
            <div className="mb-4">
              <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-[#0F172A]">
                Full Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                onBlur={handleBlur}
                disabled={isSubmitting}
                className={`w-full rounded-md border px-3 py-2 text-[#0F172A] transition-colors focus:outline-none focus:ring-2 focus:ring-[#16A34A] disabled:cursor-not-allowed disabled:bg-gray-50 ${
                  errors.name ? "border-red-300 bg-red-50" : "border-[#E2E8F0] bg-white"
                }`}
                placeholder="John Doe"
              />
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
            </div>

            {/* Role Selection */}
            <div className="mb-6">
              <label className="mb-1.5 block text-sm font-medium text-[#0F172A]">
                I want to
              </label>
              <div className="space-y-2">
                <label className="flex cursor-pointer items-center rounded-md border border-[#E2E8F0] p-3 transition-colors hover:border-[#16A34A] has-[:checked]:border-[#16A34A] has-[:checked]:bg-[#F0FDF4]">
                  <input
                    type="radio"
                    name="role"
                    value="investor"
                    checked={formData.role === "investor"}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    className="h-4 w-4 border-[#E2E8F0] text-[#16A34A] focus:ring-2 focus:ring-[#16A34A] disabled:cursor-not-allowed"
                  />
                  <div className="ml-3">
                    <span className="block text-sm font-medium text-[#0F172A]">
                      Invest in opportunities
                    </span>
                    <span className="block text-xs text-[#64748B]">Browse and fund projects</span>
                  </div>
                </label>
                <label className="flex cursor-pointer items-center rounded-md border border-[#E2E8F0] p-3 transition-colors hover:border-[#16A34A] has-[:checked]:border-[#16A34A] has-[:checked]:bg-[#F0FDF4]">
                  <input
                    type="radio"
                    name="role"
                    value="fundraiser"
                    checked={formData.role === "fundraiser"}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    className="h-4 w-4 border-[#E2E8F0] text-[#16A34A] focus:ring-2 focus:ring-[#16A34A] disabled:cursor-not-allowed"
                  />
                  <div className="ml-3">
                    <span className="block text-sm font-medium text-[#0F172A]">Raise funds</span>
                    <span className="block text-xs text-[#64748B]">
                      Create funding opportunities
                    </span>
                  </div>
                </label>
              </div>
              {errors.role && <p className="mt-1 text-sm text-red-600">{errors.role}</p>}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-md bg-[#123B32] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#0F2E27] focus:outline-none focus:ring-2 focus:ring-[#16A34A] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? "Completing profile..." : "Complete profile"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CompleteProfile;
