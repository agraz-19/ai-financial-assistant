export default function Badge({
  children,
  color = "blue",
}) {
  const colors = {
    blue: "bg-blue-100 text-blue-700",
    green: "bg-emerald-100 text-emerald-700",
    red: "bg-red-100 text-red-700",
    yellow: "bg-amber-100 text-amber-700",
    purple: "bg-purple-100 text-purple-700",
  };

  return (
    <span
      className={`px-3 py-1 rounded-full text-sm font-medium ${colors[color]}`}
    >
      {children}
    </span>
  );
}