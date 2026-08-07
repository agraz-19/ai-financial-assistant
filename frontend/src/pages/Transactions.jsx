import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, RefreshCw, Filter, X } from "lucide-react";

import { getTransactions, getStatements, getCategories } from "../services/statementsService";

const PAGE_SIZE = 20;

const EMPTY_FILTERS = { statementId: "", categoryId: "", dateFrom: "", dateTo: "" };

export default function Transactions() {
  const [transactions, setTransactions] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  const [statements, setStatements] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState(EMPTY_FILTERS);

  useEffect(() => {
    getStatements().then(setStatements).catch(() => setStatements([]));
    getCategories().then(setCategories).catch(() => setCategories([]));
  }, []);

  const loadPage = async (page, activeFilters) => {
    const response = await getTransactions({
      page,
      pageSize: PAGE_SIZE,
      statementId: activeFilters.statementId || undefined,
      categoryId: activeFilters.categoryId || undefined,
      dateFrom: activeFilters.dateFrom || undefined,
      dateTo: activeFilters.dateTo || undefined,
    });
    const nextResults = response.results || [];
    setTransactions((prev) => (page === 1 ? nextResults : [...prev, ...nextResults]));
    setCurrentPage(page);
    setHasMore(Boolean(response.next));
  };

  // Refetch from page 1 whenever a filter changes.
  useEffect(() => {
    let active = true;

    const run = async () => {
      try {
        setLoading(true);
        setError(null);
        await loadPage(1, filters);
      } catch {
        if (active) setError("Failed to load transactions");
      } finally {
        if (active) setLoading(false);
      }
    };

    void run();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const handleLoadMore = async () => {
    try {
      setLoadingMore(true);
      await loadPage(currentPage + 1, filters);
    } catch {
      setError("Failed to load more transactions");
    } finally {
      setLoadingMore(false);
    }
  };

  const updateFilter = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => setFilters(EMPTY_FILTERS);
  const hasActiveFilters = Object.values(filters).some(Boolean);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Transactions</h1>
        <p className="mt-2 text-sm text-slate-500">
          Showing {transactions.length} transactions at a time.
        </p>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4 text-sm font-semibold text-slate-700">
          <Filter size={16} />
          Filters
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="ml-auto flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
            >
              <X size={14} />
              Clear all
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Statement</label>
            <select
              value={filters.statementId}
              onChange={(e) => updateFilter("statementId", e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All statements</option>
              {statements.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.filename || `Statement #${s.id}`}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">Category</label>
            <select
              value={filters.categoryId}
              onChange={(e) => updateFilter("categoryId", e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">From date</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => updateFilter("dateFrom", e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-500">To date</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => updateFilter("dateTo", e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center text-slate-500">
          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          Loading transactions...
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700">
          {error}
        </div>
      ) : (
        <>
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-left">
              <thead className="bg-slate-50">
                <tr className="text-sm text-slate-500">
                  <th className="px-5 py-4 font-medium">Date</th>
                  <th className="px-5 py-4 font-medium">Description</th>
                  <th className="px-5 py-4 font-medium">Category</th>
                  <th className="px-5 py-4 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody>
                {transactions.map((txn) => {
                  const amount = Number(txn.amount);
                  return (
                    <tr key={txn.id} className="border-t border-slate-100">
                      <td className="px-5 py-4 text-sm text-slate-600">{txn.date}</td>
                      <td className="px-5 py-4 text-sm text-slate-900">{txn.description}</td>
                      <td className="px-5 py-4 text-sm text-slate-600">
                        {txn.category_name || "Uncategorized"}
                      </td>
                      <td className={`px-5 py-4 text-right text-sm font-semibold ${amount < 0 ? "text-red-600" : "text-emerald-600"}`}>
                        <span className="inline-flex items-center gap-1">
                          {amount < 0 ? <ArrowDown className="h-4 w-4" /> : <ArrowUp className="h-4 w-4" />}
                          {Math.abs(amount).toLocaleString("en-IN", {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {transactions.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-5 py-10 text-center text-sm text-slate-500">
                      No transactions match these filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {hasMore ? (
            <div className="flex justify-center">
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loadingMore ? "Loading..." : "Load more"}
              </button>
            </div>
          ) : transactions.length > 0 ? (
            <p className="text-center text-sm text-slate-500">No more transactions to load.</p>
          ) : null}
        </>
      )}
    </div>
  );
}