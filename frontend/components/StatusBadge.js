const statusMap = {
  confirmed: ['green', 'Confirmat'],
  in_preparation: ['blue', 'În pregătire'],
  completed: ['green', 'Finalizat'],
  cancelled: ['red', 'Anulat'],
  draft: ['orange', 'Draft'],
  paid: ['green', 'Plătită'],
  unpaid: ['red', 'Neplătită'],
  partially_paid: ['orange', 'Parțial plătită'],
  sent: ['blue', 'Trimisă'],
  accepted: ['green', 'Acceptată'],
};

export default function StatusBadge({ status }) {
  const [tone, label] = statusMap[status] || ['blue', status || 'Status'];
  return <span className={`badge ${tone}`}>{label}</span>;
}
