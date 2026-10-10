import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";

const Register = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, user, loading: authLoading } = useAuth();

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "",
  });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Redirect authenticated users to their dashboard
  useEffect(() => {
    if (!authLoading && isAuthenticated && user) {
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
      case "email":
        if (!value.trim()) return "Email is required";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Invalid email address";
        return "";
      case "password":
        if (!value) return "Password is required";
        if (value.length < 8) return "Password must be at least 8 characters";
        return "";
      case "confirmPassword":
        if (!value) return "Please confirm your password";
        if (value !== formData.password) return "Passwords do not match";
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

    // Revalidate confirmPassword if password changes
    if (name === "password" && formData.confirmPassword) {
      const confirmError = formData.confirmPassword !== value ? "Passwords do not match" : "";
      setErrors((prev) => ({ ...prev, confirmPassword: confirmError }));
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
      // Backend expects { name, email, password, role } - no confirmPassword
      const registrationData = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        role: formData.role,
      };
      const response = await api.post("/api/auth/register", registrationData);
      const userData = response.data.data;

      // Backend auto-logs user in after registration
      login(userData);

      // Navigate based on role
      const destination = userData.role === "investor" ? "/investor" : "/fundraiser";
      navigate(destination, { replace: true });
    } catch (error) {
      if (error.response?.data?.message) {
        setApiError(error.response.data.message);
      } else if (error.response?.data?.errors) {
        // Field-level validation errors from backend
        const backendErrors = {};
        error.response.data.errors.forEach((err) => {
          backendErrors[err.field] = err.message;
        });
        setErrors(backendErrors);
      } else {
        setApiError("Registration failed. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignup = () => {
    // Redirect to backend OAuth initiation endpoint
    window.location.href = `${import.meta.env.VITE_API_BASE_URL}/api/auth/google`;
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
          <h1 className="text-3xl font-bold text-[#36A96A]">InvestMate</h1>
          <p className="mt-2 text-[#64748B]">Create your account</p>
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
                className={`w-full rounded-md border px-3 py-2 text-[#0F172A] transition-colors focus:outline-none focus:ring-2 focus:ring-[#36A96A] disabled:cursor-not-allowed disabled:bg-gray-50 ${
                  errors.name ? "border-red-300 bg-red-50" : "border-[#E2E8F0] bg-white"
                }`}
                placeholder="John Doe"
              />
              {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
            </div>

            {/* Email */}
            <div className="mb-4">
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-[#0F172A]">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                onBlur={handleBlur}
                disabled={isSubmitting}
                className={`w-full rounded-md border px-3 py-2 text-[#0F172A] transition-colors focus:outline-none focus:ring-2 focus:ring-[#36A96A] disabled:cursor-not-allowed disabled:bg-gray-50 ${
                  errors.email ? "border-red-300 bg-red-50" : "border-[#E2E8F0] bg-white"
                }`}
                placeholder="you@example.com"
              />
              {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
            </div>

            {/* Password */}
            <div className="mb-4">
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-[#0F172A]">
                Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                onBlur={handleBlur}
                disabled={isSubmitting}
                className={`w-full rounded-md border px-3 py-2 text-[#0F172A] transition-colors focus:outline-none focus:ring-2 focus:ring-[#36A96A] disabled:cursor-not-allowed disabled:bg-gray-50 ${
                  errors.password ? "border-red-300 bg-red-50" : "border-[#E2E8F0] bg-white"
                }`}
                placeholder="••••••••"
              />
              {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
            </div>

            {/* Confirm Password */}
            <div className="mb-4">
              <label
                htmlFor="confirmPassword"
                className="mb-1.5 block text-sm font-medium text-[#0F172A]"
              >
                Confirm Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                onBlur={handleBlur}
                disabled={isSubmitting}
                className={`w-full rounded-md border px-3 py-2 text-[#0F172A] transition-colors focus:outline-none focus:ring-2 focus:ring-[#36A96A] disabled:cursor-not-allowed disabled:bg-gray-50 ${
                  errors.confirmPassword ? "border-red-300 bg-red-50" : "border-[#E2E8F0] bg-white"
                }`}
                placeholder="••••••••"
              />
              {errors.confirmPassword && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
              )}
            </div>

            {/* Role Selection */}
            <div className="mb-6">
              <label className="mb-1.5 block text-sm font-medium text-[#0F172A]">
                I want to
              </label>
              <div className="space-y-2">
                <label className="flex cursor-pointer items-center rounded-md border border-[#E2E8F0] p-3 transition-colors hover:border-[#36A96A] has-[:checked]:border-[#36A96A] has-[:checked]:bg-[#E8F8ED]">
                  <input
                    type="radio"
                    name="role"
                    value="investor"
                    checked={formData.role === "investor"}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    className="h-4 w-4 border-[#E2E8F0] text-[#36A96A] focus:ring-2 focus:ring-[#36A96A] disabled:cursor-not-allowed"
                  />
                  <div className="ml-3">
                    <span className="block text-sm font-medium text-[#0F172A]">Invest in opportunities</span>
                    <span className="block text-xs text-[#64748B]">Browse and fund projects</span>
                  </div>
                </label>
                <label className="flex cursor-pointer items-center rounded-md border border-[#E2E8F0] p-3 transition-colors hover:border-[#36A96A] has-[:checked]:border-[#36A96A] has-[:checked]:bg-[#E8F8ED]">
                  <input
                    type="radio"
                    name="role"
                    value="fundraiser"
                    checked={formData.role === "fundraiser"}
                    onChange={handleChange}
                    disabled={isSubmitting}
                    className="h-4 w-4 border-[#E2E8F0] text-[#36A96A] focus:ring-2 focus:ring-[#36A96A] disabled:cursor-not-allowed"
                  />
                  <div className="ml-3">
                    <span className="block text-sm font-medium text-[#0F172A]">Raise funds</span>
                    <span className="block text-xs text-[#64748B]">Create funding opportunities</span>
                  </div>
                </label>
              </div>
              {errors.role && <p className="mt-1 text-sm text-red-600">{errors.role}</p>}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full cursor-pointer rounded-md bg-[#36A96A] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#2D8A57] focus:outline-none focus:ring-2 focus:ring-[#36A96A] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? "Creating account..." : "Create account"}
            </button>
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center">
            <div className="flex-1 border-t border-[#E2E8F0]"></div>
            <span className="px-3 text-sm text-[#64748B]">or</span>
            <div className="flex-1 border-t border-[#E2E8F0]"></div>
          </div>

          {/* Google Button */}
          <button
            type="button"
            onClick={handleGoogleSignup}
            disabled={isSubmitting}
            className="flex w-full cursor-pointer items-center justify-center gap-3 rounded-md border border-[#E2E8F0] bg-white px-4 py-2.5 text-sm font-medium text-[#0F172A] transition-colors hover:bg-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#36A96A] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </button>

          {/* Login Link */}
          <p className="mt-6 text-center text-sm text-[#64748B]">
            Already have an account?{" "}
            <Link to="/login" className="font-medium text-[#36A96A] hover:text-[#2D8A57]">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Register;

