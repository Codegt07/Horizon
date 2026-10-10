import { Link } from "react-router-dom";

const OpportunityCard = ({ opportunity, linkTo, showStatus = false }) => {
  const progress = opportunity.targetAmount > 0
    ? (opportunity.raisedAmount / opportunity.targetAmount) * 100
    : 0;

  const isActive = opportunity.status === "active";
  const isClosed = opportunity.status === "closed";
  const isDraft = opportunity.status === "draft";

  const daysLeft = Math.max(
    0,
    Math.ceil((new Date(opportunity.deadline) - new Date()) / (1000 * 60 * 60 * 24))
  );

  return (
    <Link
      to={linkTo}
      className="block rounded-lg border border-[#E2E8F0] bg-white p-4 shadow-sm transition-shadow hover:shadow-md sm:p-6"
    >
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-[#0F172A]">{opportunity.title}</h3>
          {showStatus && (
            <span
              className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${
                isActive
                  ? "bg-[#E8F8ED] text-[#0F172A]"
                  : isDraft
                  ? "bg-gray-100 text-gray-700"
                  : "bg-gray-100 text-gray-600"
              }`}
            >
              {opportunity.status}
            </span>
          )}
        </div>
      </div>

      {/* Description */}
      <p className="mb-4 line-clamp-2 text-sm text-[#64748B]">{opportunity.description}</p>

      {/* Stats */}
      <div className="mb-4 grid grid-cols-2 gap-3 text-sm sm:gap-4">
        <div>
          <p className="text-[#64748B]">Target</p>
          <p className="break-words font-medium text-[#0F172A]">₹{opportunity.targetAmount.toLocaleString()}</p>
        </div>
        <div>
          <p className="text-[#64748B]">Min. Investment</p>
          <p className="break-words font-medium text-[#0F172A]">₹{opportunity.minInvestment.toLocaleString()}</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-2">
        <div className="mb-1 flex justify-between text-sm">
          <span className="font-medium text-[#0F172A]">
            ₹{opportunity.raisedAmount.toLocaleString()} raised
          </span>
          <span className="text-[#64748B]">{progress.toFixed(0)}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-gray-200">
          <div
            className="h-full rounded-full bg-[#36A96A]"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-between text-sm text-[#64748B]">
        <span>
          {isClosed ? "Closed" : isActive ? `${daysLeft} days left` : "Not active"}
        </span>
        <span className="text-[#36A96A] font-medium">View details →</span>
      </div>
    </Link>
  );
};

export default OpportunityCard;

