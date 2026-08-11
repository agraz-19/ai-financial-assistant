import { useEffect, useState } from "react";
import { getAnalytics } from "../services/analyticsService";

export default function useAnalytics({ month, scope = "month" } = {}) {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    async function fetchAnalytics() {
      try {
        setLoading(true);
        const data = await getAnalytics({ month, scope });
        if (active) {
          setAnalytics(data);
          setError(null);
        }
      } catch (err) {
        if (active) setError(err);
      } finally {
        if (active) setLoading(false);
      }
    }

    fetchAnalytics();
    return () => { active = false; };
  }, [month, scope]);

  return { analytics, loading, error };
}