import { useEffect, useRef, useState } from "react";
import { Bot, Send, User as UserIcon, RefreshCw } from "lucide-react";
import { useLocation } from "react-router-dom";
import { getChatMessages, askQuestion } from "../services/chatService";

function MessageBubble({ role, content }) {
  const isUser = role === "USER";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`flex max-w-[75%] items-start gap-3 ${isUser ? "flex-row-reverse" : ""}`}>
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
            isUser ? "bg-blue-600 text-white" : "bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
          }`}
        >
          {isUser ? <UserIcon size={16} /> : <Bot size={16} />}
        </div>
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-6 ${
            isUser
              ? "bg-blue-600 text-white"
              : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100"
          }`}
        >
          {content}
        </div>
      </div>
    </div>
  );
}

export default function Chat() {
  const location = useLocation();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState(location.state?.prefill || "");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const data = await getChatMessages();
        if (active) setMessages(data);
      } catch {
        if (active) setError("Failed to load chat history");
      } finally {
        if (active) setLoading(false);
      }
    })();

    return () => { active = false; };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  const handleSend = async (event) => {
    event.preventDefault();
    const trimmed = question.trim();
    if (!trimmed || sending) return;

    setMessages((prev) => [...prev, { id: `temp-${Date.now()}`, role: "USER", content: trimmed }]);
    setQuestion("");
    setSending(true);
    setError(null);

    try {
      const result = await askQuestion(trimmed);
      setMessages((prev) => [
        ...prev,
        { id: `temp-a-${Date.now()}`, role: "ASSISTANT", content: result.answer },
      ]);
    } catch {
      setError("Failed to get a response. Try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col rounded-3xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 shadow-sm">
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-5 rounded-t-3xl">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">AI Assistant</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Ask anything about your spending — scoped to your most recently uploaded statement.
        </p>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-6 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-10 text-slate-500 dark:text-slate-400">
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            Loading chat history...
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center text-slate-500 dark:text-slate-400">
            <p>Ask a question like &quot;How much did I spend on food this month?&quot;</p>
          </div>
        ) : (
          messages.map((msg) => <MessageBubble key={msg.id} role={msg.role} content={msg.content} />)
        )}

        {sending && (
          <div className="flex justify-start">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                <Bot size={16} />
              </div>
              <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                Thinking...
              </div>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mx-6 mb-3 rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 px-4 py-2 text-sm text-red-700 dark:text-red-400">
          {error}
        </div>
      )}

      <form onSubmit={handleSend} className="flex items-center gap-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-6 py-4 rounded-b-3xl">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Ask a question..."
          disabled={sending}
          className="flex-1 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={sending || !question.trim()}
          className="flex items-center gap-2 rounded-2xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Send size={16} />
          Send
        </button>
      </form>
    </div>
  );
}