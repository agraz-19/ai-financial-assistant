export default function Button({
  children,
  onClick,
  className = "",
  type = "button",
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`
        px-5
        py-3
        rounded-xl
        bg-blue-600
        text-white
        font-medium
        hover:bg-blue-700
        transition
        ${className}
      `}
    >
      {children}
    </button>
  );
}