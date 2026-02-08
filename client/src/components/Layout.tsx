import { useState, ReactNode } from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import { BreadcrumbProvider } from "../context/BreadcrumbContext";

export default function Layout({ children }: { children: ReactNode }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true);

  function toggleSidebar() {
    setSidebarCollapsed((prev) => !prev);
  }

  return (
    <BreadcrumbProvider>
      <div className="app-layout">
        <Sidebar collapsed={sidebarCollapsed} onToggle={toggleSidebar} />
        <div className="app-main">
          <TopBar onMenuToggle={toggleSidebar} />
          <main className="app-content">{children}</main>
        </div>
      </div>
    </BreadcrumbProvider>
  );
}
