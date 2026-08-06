import { Upload, Sparkles } from "lucide-react";

export default function UploadHero({ onUploadClick }) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-700 shadow-lg p-8 md:p-12">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full -mr-48 -mt-48" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-white/10 rounded-full -ml-48 -mb-48" />

      {/* Content */}
      <div className="relative z-10 max-w-3xl">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
            <Upload size={20} className="text-white" />
          </div>
          <span className="text-white/80 text-sm font-semibold">UPLOAD STATEMENTS</span>
        </div>

        <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
          Statements
        </h1>

        <p className="text-lg text-blue-100 mb-8 max-w-2xl">
          Upload your PhonePe, Google Pay or Paytm statement to generate AI-powered financial insights.
        </p>

        <button
          onClick={onUploadClick}
          className="inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-600 rounded-full font-semibold hover:bg-blue-50 transition"
        >
          <Upload size={18} />
          Upload Statement
          <Sparkles size={18} />
        </button>
      </div>
    </div>
  );
}
