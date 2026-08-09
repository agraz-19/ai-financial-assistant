import { Upload, ArrowRight } from "lucide-react";

export default function EmptyState({ onUpload }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-6">
      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-500/20 dark:to-indigo-500/20 flex items-center justify-center mb-6">
        <Upload className="w-12 h-12 text-blue-600 dark:text-blue-400" />
      </div>
      <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-3">No Statements Uploaded</h2>
      <p className="text-slate-500 dark:text-slate-400 text-lg mb-8 max-w-md text-center">
        Upload your first statement to unlock AI-powered financial insights and spending analysis.
      </p>
      <button onClick={onUpload} className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-full font-semibold hover:bg-blue-700 transition">
        <Upload size={18} />
        Upload Statement
        <ArrowRight size={18} />
      </button>
    </div>
  );
}