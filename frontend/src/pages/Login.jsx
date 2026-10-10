import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../api/axios";

const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { login, isAuthenticated, user, loading: authLoading } = useAuth();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
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

  // Show OAuth error from query params
  useEffect(() => {
    const error = searchParams.get("error");
    if (error === "oauth_failed") {
      setApiError("Google authentication failed. Please try again.");
    }
  }, [searchParams]);

  const validateField = (name, value) => {
    switch (name) {
      case "email":
        if (!value.trim()) return "Email is required";
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "Invalid email address";
        return "";
      case "password":
        if (!value) return "Password is required";
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
      const response = await api.post("/api/auth/login", formData);
      const userData = response.data.data;
      login(userData);

      // Navigate based on role
      const destination = userData.role === "investor" ? "/investor" : "/fundraiser";
      navigate(destination, { replace: true });
    } catch (error) {
      if (error.response?.data?.message) {
        setApiError(error.response.data.message);
      } else {
        setApiError("Login failed. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = () => {
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
          <h1 className="text-3xl font-bold text-[#57C97F]">InvestMate</h1>
          <p className="mt-2 text-[#64748B]">Sign in to your account</p>
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
                className={`w-full rounded-md border px-3 py-2 text-[#0F172A] transition-colors focus:outline-none focus:ring-2 focus:ring-[#57C97F] disabled:cursor-not-allowed disabled:bg-gray-50 ${
                  errors.email ? "border-red-300 bg-red-50" : "border-[#E2E8F0] bg-white"
                }`}
                placeholder="you@example.com"
              />
              {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
            </div>

            {/* Password */}
            <div className="mb-6">
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
                className={`w-full rounded-md border px-3 py-2 text-[#0F172A] transition-colors focus:outline-none focus:ring-2 focus:ring-[#57C97F] disabled:cursor-not-allowed disabled:bg-gray-50 ${
                  errors.password ? "border-red-300 bg-red-50" : "border-[#E2E8F0] bg-white"
                }`}
                placeholder="••••••••"
              />
              {errors.password && <p className="mt-1 text-sm text-red-600">{errors.password}</p>}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-md bg-[#57C97F] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#45B76A] focus:outline-none focus:ring-2 focus:ring-[#57C97F] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSubmitting ? "Signing in..." : "Sign in"}
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
            onClick={handleGoogleLogin}
            disabled={isSubmitting}
            className="flex w-full items-center justify-center gap-3 rounded-md border border-[#E2E8F0] bg-white px-4 py-2.5 text-sm font-medium text-[#0F172A] transition-colors hover:bg-[#F8FAFC] focus:outline-none focus:ring-2 focus:ring-[#57C97F] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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

          {/* Register Link */}
          <p className="mt-6 text-center text-sm text-[#64748B]">
            Don&apos;t have an account?{" "}
            <Link to="/register" className="font-medium text-[#57C97F] hover:text-[#45B76A]">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
