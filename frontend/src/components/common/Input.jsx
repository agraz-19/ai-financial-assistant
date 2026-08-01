export default function Input({
  className = "",
  ...props
}) {
  return (
    <input
      {...props}
      className={`
        w-full
        rounded-xl
        border
        border-slate-200
        px-4
        py-3
        outline-none
        focus:ring-2
        focus:ring-blue-500
        ${className}
      `}
    />
  );
}