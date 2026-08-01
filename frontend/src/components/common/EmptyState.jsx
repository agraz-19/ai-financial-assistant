import { Inbox } from "lucide-react";

export default function EmptyState({
  title,
  description,
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20">

      <Inbox
        size={64}
        className="text-slate-300"
      />

      <h3 className="mt-6 text-xl font-semibold text-slate-700">
        {title}
      </h3>

      <p className="mt-2 text-slate-500 text-center max-w-md">
        {description}
      </p>

    </div>
  );
}
