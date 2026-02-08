import { useState, useEffect } from "react";
import api from "../api/client";

interface PicklistValue {
  id: string;
  picklist_type: string;
  value: string;
  label: string;
  color: string | null;
  sort_order: number;
  is_active: boolean;
  description: string | null;
}

export function usePicklist(type: string) {
  const [values, setValues] = useState<PicklistValue[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!type) {
      setValues([]);
      setLoading(false);
      return;
    }
    api
      .get(`/picklists/${type}?active=true`)
      .then((res) => setValues(res.data.values))
      .catch(() => setValues([]))
      .finally(() => setLoading(false));
  }, [type]);

  return { values, loading };
}
