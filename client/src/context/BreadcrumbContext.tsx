import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { useLocation } from "react-router-dom";

export interface Breadcrumb {
  label: string;
  path?: string;
}

interface BreadcrumbContextType {
  breadcrumbs: Breadcrumb[];
  setBreadcrumbs: (crumbs: Breadcrumb[]) => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextType | null>(null);

const ROUTE_LABELS: Record<string, string> = {
  "": "Issues",
  board: "Kanban Board",
  analytics: "Analytics",
  reports: "Reports",
  admin: "Settings",
  "admin/users": "User Management",
  "admin/teams": "Teams",
  "admin/workflow": "Workflow",
  "admin/audit": "Audit Log",
  audits: "Audits",
  "audits/analytics": "Audit Analytics",
  "admin/audit-types": "Audit Configuration",
  "admin/checklists": "Checklists",
};

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  const [breadcrumbs, setBreadcrumbsState] = useState<Breadcrumb[]>([]);
  const setBreadcrumbs = useCallback((crumbs: Breadcrumb[]) => {
    setBreadcrumbsState(crumbs);
  }, []);

  return (
    <BreadcrumbContext.Provider value={{ breadcrumbs, setBreadcrumbs }}>
      {children}
    </BreadcrumbContext.Provider>
  );
}

export function useBreadcrumbs() {
  const ctx = useContext(BreadcrumbContext);
  if (!ctx) throw new Error("useBreadcrumbs must be within BreadcrumbProvider");
  return ctx;
}

export function useDefaultBreadcrumbs(): Breadcrumb[] {
  const location = useLocation();
  const path = location.pathname.replace(/^\//, "");
  const segments = path.split("/").filter(Boolean);

  const crumbs: Breadcrumb[] = [{ label: "Home", path: "/" }];

  let accumulated = "";
  for (const seg of segments) {
    accumulated = accumulated ? `${accumulated}/${seg}` : seg;
    const label =
      ROUTE_LABELS[accumulated] ||
      seg.charAt(0).toUpperCase() + seg.slice(1);
    crumbs.push({ label, path: `/${accumulated}` });
  }

  if (crumbs.length === 1) {
    crumbs.push({ label: "Issues" });
  }

  return crumbs;
}
