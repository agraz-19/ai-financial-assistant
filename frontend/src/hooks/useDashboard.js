import { useEffect, useState } from "react";
import { getDashboard } from "../services/dashboardService";

export default function useDashboard({ scope = "all", statementId } = {}) {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    async function fetchDashboard() {
      try {
        setLoading(true);
        const data = await getDashboard({ scope, statementId });
        if (active) {
          setDashboard(data);
          setError(null);
        }
      } catch (err) {
        if (active) setError(err);
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchDashboard();
    return () => { active = false; };
  }, [scope, statementId]);

  return { dashboard, loading, error };
}