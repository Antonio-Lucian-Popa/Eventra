export default function StatCard({ label, value, note, icon, tone = 'purple' }) {
  const colors = {
    purple: ['#f3e8ff', '#7c3aed'],
    green: ['#dcfce7', '#16a34a'],
    orange: ['#ffedd5', '#ea580c'],
    blue: ['#dbeafe', '#2563eb'],
  };
  const [bg, color] = colors[tone] || colors.purple;

  return (
    <section className="card stat-card">
      <div>
        <div className="stat-label" style={{ color }}>
          {label}
        </div>
        <div className="stat-value">{value}</div>
        <div className="stat-note">{note}</div>
      </div>
      <div className="stat-icon" style={{ background: bg, color }}>
        {icon}
      </div>
    </section>
  );
}
