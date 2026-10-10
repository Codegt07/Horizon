import { useState, useEffect } from "react";
import DashboardLayout from "../../components/DashboardLayout";
import LoadingSpinner from "../../components/LoadingSpinner";
import api from "../../api/axios";

const Wallet = () => {
  const [balance, setBalance] = useState(0);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [depositAmount, setDepositAmount] = useState("");
  const [depositError, setDepositError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const fetchData = async () => {
    try {
      const [balanceRes, transactionsRes] = await Promise.all([
        api.get("/api/wallet/balance"),
        api.get("/api/wallet/transactions"),
      ]);

      setBalance(balanceRes.data.data.walletBalance);
      setTransactions(transactionsRes.data.data);
    } catch (error) {
      console.error("Failed to fetch wallet data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleDeposit = async (e) => {
    e.preventDefault();
    setDepositError("");
    setSuccessMessage("");

    const amount = parseFloat(depositAmount);

    // Client-side validation
    if (!amount || amount <= 0) {
      setDepositError("Please enter a valid amount");
      return;
    }

    if (amount > 100000) {
      setDepositError("Maximum deposit per transaction is ₹1,00,000");
      return;
    }

    setIsSubmitting(true);

    try {
      await api.post("/api/wallet/deposit", { amount });

      setSuccessMessage(`Successfully deposited ₹${amount.toLocaleString()}!`);
      setDepositAmount("");

      // Refresh data
      await fetchData();

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      if (err.response?.data?.message) {
        setDepositError(err.response.data.message);
      } else if (err.response?.data?.errors) {
        setDepositError(err.response.data.errors[0]?.message || "Deposit failed");
      } else {
        setDepositError("Deposit failed. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout title="Wallet">
        <LoadingSpinner />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Wallet">
      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-3">
        {/* Balance & Deposit Form */}
        <div className="md:col-span-1 lg:col-span-1">
          {/* Current Balance */}
          <div className="mb-6 rounded-lg border border-[#E2E8F0] bg-white p-4 shadow-sm sm:p-6">
            <p className="mb-1 text-sm text-[#64748B]">Available Balance</p>
            <p className="break-words text-3xl font-bold text-[#0F172A] sm:text-4xl">₹{balance.toLocaleString()}</p>
          </div>

          {/* Deposit Form */}
          <div className="rounded-lg border border-[#E2E8F0] bg-white p-4 shadow-sm sm:p-6">
            <h3 className="mb-4 text-lg font-semibold text-[#0F172A]">Deposit Funds</h3>

            {successMessage && (
              <div className="mb-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                {successMessage}
              </div>
            )}

            {depositError && (
              <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                {depositError}
              </div>
            )}

            <form onSubmit={handleDeposit}>
              <div className="mb-4">
                <label htmlFor="amount" className="mb-1.5 block text-sm font-medium text-[#0F172A]">
                  Amount (₹)
                </label>
                <input
                  type="number"
                  id="amount"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  disabled={isSubmitting}
                  min="1"
                  max="100000"
                  className="w-full rounded-md border border-[#E2E8F0] bg-white px-3 py-3 text-[#0F172A] transition-colors focus:outline-none focus:ring-2 focus:ring-[#36A96A] disabled:cursor-not-allowed disabled:bg-gray-50 sm:py-2"
                  placeholder="Enter amount"
                />
                <p className="mt-1 text-xs text-[#64748B]">Max ₹1,00,000 per transaction</p>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full cursor-pointer rounded-md bg-[#36A96A] px-4 py-3 text-sm font-medium text-white transition-colors hover:bg-[#2D8A57] focus:outline-none focus:ring-2 focus:ring-[#36A96A] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:py-2.5"
              >
                {isSubmitting ? "Processing..." : "Deposit"}
              </button>
            </form>

            <p className="mt-4 text-xs text-[#64748B]">
              This is a simulated deposit. In a real system, this would connect to a payment
              gateway.
            </p>
          </div>
        </div>

        {/* Transaction History */}
        <div className="md:col-span-1 lg:col-span-2">
          <div className="rounded-lg border border-[#E2E8F0] bg-white p-4 shadow-sm sm:p-6">
            <h3 className="mb-4 text-lg font-semibold text-[#0F172A]">Transaction History</h3>

            {transactions.length === 0 ? (
              <div className="py-8 text-center text-sm text-[#64748B]">
                No transactions yet. Make a deposit to get started!
              </div>
            ) : (
              <div className="space-y-3">
                {transactions.map((transaction) => (
                  <div
                    key={transaction._id}
                    className="flex flex-col gap-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div
                        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full ${
                          transaction.type === "deposit" ? "bg-[#E8F8ED]" : "bg-gray-100"
                        }`}
                      >
                        {transaction.type === "deposit" ? (
                          <svg
                            className="h-5 w-5 text-[#36A96A]"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 4v16m8-8H4"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="h-5 w-5 text-gray-600"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
                            />
                          </svg>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium capitalize text-[#0F172A]">
                          {transaction.type}
                        </p>
                        <p className="truncate text-sm text-[#64748B]">
                          {new Date(transaction.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <p
                      className={`break-words text-lg font-semibold sm:text-right ${
                        transaction.type === "deposit" ? "text-[#36A96A]" : "text-[#0F172A]"
                      }`}
                    >
                      {transaction.type === "deposit" ? "+" : "-"}₹
                      {transaction.amount.toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Wallet;

