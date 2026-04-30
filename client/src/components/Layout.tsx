import { useState, type ReactNode } from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import { BreadcrumbProvider } from "../context/BreadcrumbContext";

export default function Layout({ children }: { children: ReactNode }) {
  // collapsed = true means mobile sidebar is hidden (default)
  // On desktop the sidebar is always the 60px icon rail regardless of this state
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  function toggleSidebar() {
    setMobileSidebarOpen((prev) => !prev);
  }

  return (
    <BreadcrumbProvider>
      <div className="app-layout">
        <Sidebar collapsed={!mobileSidebarOpen} onToggle={toggleSidebar} />
        <div className="app-main">
          <TopBar onMenuToggle={toggleSidebar} />
          <main className="app-content">{children}</main>
        </div>
      </div>
    </BreadcrumbProvider>
  );
}
