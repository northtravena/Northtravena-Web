// src/layouts/AdminLayout.tsx
// Persistent shell for all authenticated admin pages.
// Renders Sidebar + Topbar then defers page content to the matched <Outlet />.

import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { Topbar } from "@/components/Topbar";
import { PageLoader } from "@/components/PageLoader";
import { useAuth } from "@/context/AuthContext";

export function AdminLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      <Topbar user={user} onLogout={logout} />
      <main className="ml-64 pt-16 min-h-screen">
        <div className="p-6">
          <Suspense fallback={<PageLoader />}>
            <Outlet />
          </Suspense>
        </div>
      </main>
    </div>
  );
}
