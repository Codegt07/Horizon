import { useState, useEffect } from "react";

const OpportunityForm = ({ initialData = null, onSubmit, isSubmitting, submitLabel = "Create" }) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    targetAmount: "",
    minInvestment: "",
    deadline: "",
    status: "draft",
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        title: initialData.title || "",
        description: initialData.description || "",
        targetAmount: initialData.targetAmount || "",
        minInvestment: initialData.minInvestment || "",
        deadline: initialData.deadline
          ? new Date(initialData.deadline).toISOString().split("T")[0]
          : "",
        status: initialData.status || "draft",
      });
    }
  }, [initialData]);

  const validateField = (name, value) => {
    switch (name) {
      case "title":
        if (!value.trim()) return "Title is required";
        if (value.trim().length > 200) return "Title cannot exceed 200 characters";
        return "";
      case "description":
        if (!value.trim()) return "Description is required";
        if (value.trim().length > 5000) return "Description cannot exceed 5000 characters";
        return "";
      case "targetAmount": {
        const target = parseFloat(value);
        if (!target || target <= 0) return "Target amount must be greater than 0";
        return "";
      }
      case "minInvestment": {
        const minInv = parseFloat(value);
        if (!minInv || minInv <= 0) return "Minimum investment must be greater than 0";
        const targetAmt = parseFloat(formData.targetAmount);
        if (targetAmt && minInv > targetAmt) {
          return "Minimum investment cannot exceed target amount";
        }
        return "";
      }
      case "deadline": {
        if (!value) return "Deadline is required";
        const selected = new Date(value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (selected <= today) return "Deadline must be in the future";
        return "";
      }
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
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    const error = validateField(name, value);
    if (error) {
      setErrors((prev) => ({ ...prev, [name]: error }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    // Validate all fields
    const newErrors = {};
    Object.keys(formData).forEach((key) => {
      if (key !== "status") {
        const error = validateField(key, formData[key]);
        if (error) newErrors[key] = error;
      }
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Convert to backend format
    const submitData = {
      ...formData,
      targetAmount: parseFloat(formData.targetAmount),
      minInvestment: parseFloat(formData.minInvestment),
    };

    onSubmit(submitData);
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-6">
      {/* Title */}
      <div>
        <label htmlFor="title" className="mb-1.5 block text-sm font-medium text-[#0F172A]">
          Title
        </label>
        <input
          type="text"
          id="title"
          name="title"
          value={formData.title}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={isSubmitting}
          className={`w-full rounded-md border px-3 py-2 text-[#0F172A] transition-colors focus:outline-none focus:ring-2 focus:ring-[#57C97F] disabled:cursor-not-allowed disabled:bg-gray-50 ${
            errors.title ? "border-red-300 bg-red-50" : "border-[#E2E8F0] bg-white"
          }`}
          placeholder="e.g., Tech Startup Seed Funding"
          maxLength={200}
        />
        {errors.title && <p className="mt-1 text-sm text-red-600">{errors.title}</p>}
      </div>

      {/* Description */}
      <div>
        <label htmlFor="description" className="mb-1.5 block text-sm font-medium text-[#0F172A]">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          value={formData.description}
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={isSubmitting}
          rows={6}
          className={`w-full rounded-md border px-3 py-2 text-[#0F172A] transition-colors focus:outline-none focus:ring-2 focus:ring-[#57C97F] disabled:cursor-not-allowed disabled:bg-gray-50 ${
            errors.description ? "border-red-300 bg-red-50" : "border-[#E2E8F0] bg-white"
          }`}
          placeholder="Describe your funding opportunity in detail..."
          maxLength={5000}
        />
        {errors.description && <p className="mt-1 text-sm text-red-600">{errors.description}</p>}
        <p className="mt-1 text-xs text-[#64748B]">{formData.description.length}/5000 characters</p>
      </div>

      {/* Target Amount & Min Investment */}
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <label htmlFor="targetAmount" className="mb-1.5 block text-sm font-medium text-[#0F172A]">
            Target Amount (₹)
          </label>
          <input
            type="number"
            id="targetAmount"
            name="targetAmount"
            value={formData.targetAmount}
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={isSubmitting}
            min="1"
            className={`w-full rounded-md border px-3 py-2 text-[#0F172A] transition-colors focus:outline-none focus:ring-2 focus:ring-[#57C97F] disabled:cursor-not-allowed disabled:bg-gray-50 ${
              errors.targetAmount ? "border-red-300 bg-red-50" : "border-[#E2E8F0] bg-white"
            }`}
            placeholder="e.g., 1000000"
          />
          {errors.targetAmount && <p className="mt-1 text-sm text-red-600">{errors.targetAmount}</p>}
        </div>

        <div>
          <label htmlFor="minInvestment" className="mb-1.5 block text-sm font-medium text-[#0F172A]">
            Minimum Investment (₹)
          </label>
          <input
            type="number"
            id="minInvestment"
            name="minInvestment"
            value={formData.minInvestment}
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={isSubmitting}
            min="1"
            className={`w-full rounded-md border px-3 py-2 text-[#0F172A] transition-colors focus:outline-none focus:ring-2 focus:ring-[#57C97F] disabled:cursor-not-allowed disabled:bg-gray-50 ${
              errors.minInvestment ? "border-red-300 bg-red-50" : "border-[#E2E8F0] bg-white"
            }`}
            placeholder="e.g., 10000"
          />
          {errors.minInvestment && <p className="mt-1 text-sm text-red-600">{errors.minInvestment}</p>}
        </div>
      </div>

      {/* Deadline & Status */}
      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <label htmlFor="deadline" className="mb-1.5 block text-sm font-medium text-[#0F172A]">
            Deadline
          </label>
          <input
            type="date"
            id="deadline"
            name="deadline"
            value={formData.deadline}
            onChange={handleChange}
            onBlur={handleBlur}
            disabled={isSubmitting}
            className={`w-full rounded-md border px-3 py-2 text-[#0F172A] transition-colors focus:outline-none focus:ring-2 focus:ring-[#57C97F] disabled:cursor-not-allowed disabled:bg-gray-50 ${
              errors.deadline ? "border-red-300 bg-red-50" : "border-[#E2E8F0] bg-white"
            }`}
          />
          {errors.deadline && <p className="mt-1 text-sm text-red-600">{errors.deadline}</p>}
        </div>

        <div>
          <label htmlFor="status" className="mb-1.5 block text-sm font-medium text-[#0F172A]">
            Status
          </label>
          <select
            id="status"
            name="status"
            value={formData.status}
            onChange={handleChange}
            disabled={isSubmitting}
            className="w-full rounded-md border border-[#E2E8F0] bg-white px-3 py-2 text-[#0F172A] transition-colors focus:outline-none focus:ring-2 focus:ring-[#57C97F] disabled:cursor-not-allowed disabled:bg-gray-50"
          >
            <option value="draft">Draft</option>
            <option value="active">Active</option>
          </select>
          <p className="mt-1 text-xs text-[#64748B]">
            {formData.status === "draft"
              ? "Not visible to investors"
              : "Visible to investors and accepting investments"}
          </p>
        </div>
      </div>

      {/* Submit Button */}
      <div className="flex justify-end gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-md bg-[#57C97F] px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#45B76A] focus:outline-none focus:ring-2 focus:ring-[#57C97F] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isSubmitting ? "Saving..." : submitLabel}
        </button>
      </div>
    </form>
  );
};

export default OpportunityForm;
