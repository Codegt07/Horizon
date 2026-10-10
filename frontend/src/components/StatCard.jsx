const StatCard = ({ title, value, subtitle, icon }) => {
  return (
    <div className="rounded-lg border border-[#E2E8F0] bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-[#64748B]">{title}</p>
          <p className="mt-2 text-3xl font-bold text-[#0F172A]">{value}</p>
          {subtitle && <p className="mt-1 text-sm text-[#64748B]">{subtitle}</p>}
        </div>
        {icon && (
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#E8F8ED]">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;
