interface StatCardProps {
  icon: string;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}

export default function StatCard({ icon, label, value, sub, color = "text-accent" }: StatCardProps) {
  return (
    <div className="bg-card rounded-xl p-5 border border-border card-hover">
      <div className="flex items-center gap-3 mb-3">
        <span className="text-2xl">{icon}</span>
        <span className="text-sm text-foreground/60">{label}</span>
      </div>
      <p className={`text-3xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-foreground/40 mt-1">{sub}</p>}
    </div>
  );
}
