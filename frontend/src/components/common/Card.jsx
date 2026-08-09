export default function Card({ children, className = "" }) {
  return (
    <div className={`bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-6 ${className}`}>
      {children}
    </div>
  );
}