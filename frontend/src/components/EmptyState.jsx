const EmptyState = ({ title, description, action }) => {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-[#E2E8F0] bg-white p-12 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#E8F8ED]">
        <svg
          className="h-8 w-8 text-[#57C97F]"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
          />
        </svg>
      </div>
      <h3 className="mb-2 text-lg font-semibold text-[#0F172A]">{title}</h3>
      <p className="mb-6 max-w-sm text-sm text-[#64748B]">{description}</p>
      {action}
    </div>
  );
};

export default EmptyState;
