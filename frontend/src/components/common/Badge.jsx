export default function Badge({ children, color = "blue" }) {
  const colors = {
    blue: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
    green: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
    red: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
    yellow: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300",
    purple: "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300",
  };
  return <span className={`px-3 py-1 rounded-full text-sm font-medium ${colors[color]}`}>{children}</span>;
}