import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import DashboardLayout from "../../components/DashboardLayout";
import LoadingSpinner from "../../components/LoadingSpinner";
import api from "../../api/axios";

const OpportunityDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [opportunity, setOpportunity] = useState(null);
  const [walletBalance, setWalletBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [investmentAmount, setInvestmentAmount] = useState("");
  const [investmentError, setInvestmentError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [oppRes, balanceRes] = await Promise.all([
          api.get(`/api/opportunities/${id}`),
          api.get("/api/wallet/balance"),
        ]);

        setOpportunity(oppRes.data.data);
        setWalletBalance(balanceRes.data.data.walletBalance);
      } catch (err) {
        if (err.response?.status === 404) {
          setError("Opportunity not found or no longer available.");
        } else {
          setError("Failed to load opportunity details.");
        }
        console.error("Failed to fetch opportunity:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id]);

  const handleInvest = async (e) => {
    e.preventDefault();
    setInvestmentError("");
    setSuccessMessage("");

    const amount = parseFloat(investmentAmount);

    // Client-side validation
    if (!amount || amount <= 0) {
      setInvestmentError("Please enter a valid amount");
      return;
    }

    if (amount < opportunity.minInvestment) {
      setInvestmentError(`Minimum investment is ₹${opportunity.minInvestment.toLocaleString()}`);
      return;
    }

    const remaining = opportunity.targetAmount - opportunity.raisedAmount;
    if (amount > remaining) {
      setInvestmentError(`Only ₹${remaining.toLocaleString()} needed to reach target`);
      return;
    }

    if (amount > walletBalance) {
      setInvestmentError("Insufficient wallet balance");
      return;
    }

    setIsSubmitting(true);

    try {
      await api.post("/api/investments", {
        opportunityId: id,
        amount,
      });

      setSuccessMessage(`Successfully invested ₹${amount.toLocaleString()}!`);
      setInvestmentAmount("");

      // Refresh data
      const [oppRes, balanceRes] = await Promise.all([
        api.get(`/api/opportunities/${id}`),
        api.get("/api/wallet/balance"),
      ]);

      setOpportunity(oppRes.data.data);
      setWalletBalance(balanceRes.data.data.walletBalance);

      // Redirect to investments after 2 seconds
      setTimeout(() => {
        navigate("/investor/investments");
      }, 2000);
    } catch (err) {
      if (err.response?.data?.message) {
        setInvestmentError(err.response.data.message);
      } else {
        setInvestmentError("Investment failed. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Opportunity Details">
        <LoadingSpinner />
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout title="Opportunity Details">
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {error}
        </div>
        <Link
          to="/investor/opportunities"
          className="mt-4 inline-block text-sm font-medium text-[#57C97F] hover:text-[#45B76A]"
        >
          ← Back to opportunities
        </Link>
      </DashboardLayout>
    );
  }

  if (!opportunity) {
    return null;
  }

  const progress = (opportunity.raisedAmount / opportunity.targetAmount) * 100;
  const remaining = opportunity.targetAmount - opportunity.raisedAmount;
  const daysLeft = Math.max(
    0,
    Math.ceil((new Date(opportunity.deadline) - new Date()) / (1000 * 60 * 60 * 24))
  );

  return (
    <DashboardLayout title={opportunity.title}>
      <Link
        to="/investor/opportunities"
        className="mb-6 inline-flex items-center text-sm font-medium text-[#57C97F] hover:text-[#45B76A]"
      >
        <svg
          className="mr-1 h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to opportunities
      </Link>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <div className="rounded-lg border border-[#E2E8F0] bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-2xl font-bold text-[#0F172A]">{opportunity.title}</h2>

            {/* Progress */}
            <div className="mb-6">
              <div className="mb-2 flex justify-between text-sm">
                <span className="font-semibold text-[#0F172A]">
                  ₹{opportunity.raisedAmount.toLocaleString()} raised
                </span>
                <span className="text-[#64748B]">
                  of ₹{opportunity.targetAmount.toLocaleString()}
                </span>
              </div>
              <div className="h-3 w-full rounded-full bg-gray-200">
                <div
                  className="h-full rounded-full bg-[#57C97F]"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
              <div className="mt-2 flex justify-between text-sm text-[#64748B]">
                <span>{progress.toFixed(1)}% funded</span>
                <span>{daysLeft} days left</span>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="mb-6 grid grid-cols-2 gap-4 rounded-lg bg-[#F8FAFC] p-4">
              <div>
                <p className="text-sm text-[#64748B]">Target Amount</p>
                <p className="text-lg font-semibold text-[#0F172A]">
                  ₹{opportunity.targetAmount.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-[#64748B]">Minimum Investment</p>
                <p className="text-lg font-semibold text-[#0F172A]">
                  ₹{opportunity.minInvestment.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-[#64748B]">Remaining</p>
                <p className="text-lg font-semibold text-[#0F172A]">
                  ₹{remaining.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-sm text-[#64748B]">Deadline</p>
                <p className="text-lg font-semibold text-[#0F172A]">
                  {new Date(opportunity.deadline).toLocaleDateString()}
                </p>
              </div>
            </div>

            {/* Description */}
            <div>
              <h3 className="mb-2 text-lg font-semibold text-[#0F172A]">About</h3>
              <p className="whitespace-pre-wrap text-sm text-[#64748B]">{opportunity.description}</p>
            </div>
          </div>
        </div>

        {/* Investment Form */}
        <div className="lg:col-span-1">
          <div className="sticky top-4 rounded-lg border border-[#E2E8F0] bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold text-[#0F172A]">Invest Now</h3>

            {successMessage && (
              <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                {successMessage}
              </div>
            )}

            {investmentError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                {investmentError}
              </div>
            )}

            <div className="mb-4 rounded-lg bg-[#F8FAFC] p-3">
              <p className="text-xs text-[#64748B]">Your wallet balance</p>
              <p className="text-lg font-semibold text-[#0F172A]">
                ₹{walletBalance.toLocaleString()}
              </p>
            </div>

            <form onSubmit={handleInvest}>
              <div className="mb-4">
                <label htmlFor="amount" className="mb-1.5 block text-sm font-medium text-[#0F172A]">
                  Investment Amount (₹)
                </label>
                <input
                  type="number"
                  id="amount"
                  value={investmentAmount}
                  onChange={(e) => setInvestmentAmount(e.target.value)}
                  disabled={isSubmitting || !!successMessage}
                  min={opportunity.minInvestment}
                  max={Math.min(remaining, walletBalance)}
                  className="w-full rounded-md border border-[#E2E8F0] bg-white px-3 py-2 text-[#0F172A] transition-colors focus:outline-none focus:ring-2 focus:ring-[#57C97F] disabled:cursor-not-allowed disabled:bg-gray-50"
                  placeholder={`Min ₹${opportunity.minInvestment.toLocaleString()}`}
                />
                <p className="mt-1 text-xs text-[#64748B]">
                  Min: ₹{opportunity.minInvestment.toLocaleString()}, Max: ₹
                  {Math.min(remaining, walletBalance).toLocaleString()}
                </p>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !!successMessage || remaining === 0}
                className="w-full rounded-md bg-[#57C97F] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#45B76A] focus:outline-none focus:ring-2 focus:ring-[#57C97F] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting
                  ? "Processing..."
                  : successMessage
                  ? "Invested!"
                  : remaining === 0
                  ? "Fully Funded"
                  : "Invest"}
              </button>
            </form>

            {walletBalance === 0 && (
              <Link
                to="/investor/wallet"
                className="mt-4 block text-center text-sm font-medium text-[#57C97F] hover:text-[#45B76A]"
              >
                Add funds to wallet →
              </Link>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default OpportunityDetails;
