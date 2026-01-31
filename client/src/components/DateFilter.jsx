export default function DateFilter({ onChange }) {
  return (
    <input
      type="date"
      className="border p-2 rounded"
      onChange={e => onChange(e.target.value)}
    />
  );
}
