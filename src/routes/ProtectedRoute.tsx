// src/routes/ProtectedRoute.tsx
// Wraps protected routes. Redirects unauthenticated / non-admin users to /login.

import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

export function ProtectedRoute() {
  const { isAdmin, isLoading, token } = useAuth();
  const location = useLocation();

  // Show a full-page spinner while the auth token is being verified
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Loading…</p>
        </div>
      </div>
    );
  }

  // Not authenticated or not an admin → redirect to login, preserving the
  // originally-requested URL so we can send the user back after login.
  if (!token || !isAdmin) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Render the matched child route
  return <Outlet />;
}
