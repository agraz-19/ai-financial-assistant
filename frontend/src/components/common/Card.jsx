export default function Card({
  children,
  className = "",
}) {
  return (
    <div
      className={`
        bg-white
        rounded-3xl
        border
        border-slate-200
        shadow-sm
        p-6
        ${className}
      `}
    >
      {children}
    </div>
  );
}