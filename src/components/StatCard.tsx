export function StatCard({ label, value, valueColor }: { label: string; value: string | number; valueColor?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-[14px] border border-gray-200 bg-white px-5 py-4">
      <span className="text-[13px] text-gray-500">{label}</span>
      <span className="font-heading text-[28px] font-extrabold" style={{ color: valueColor ?? "#16181D" }}>
        {value}
      </span>
    </div>
  );
}
