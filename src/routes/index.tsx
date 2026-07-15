// src/routes/index.tsx
// Centralized router definition using the adminRoutes config.

import { Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute } from "./ProtectedRoute";
import { AdminLayout } from "@/layouts/AdminLayout";
import { adminRoutes } from "./adminRoutes";
import { Login } from "@/pages/Login";

export function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<Login />} />

      {/* Protected — all admin pages share the AdminLayout shell */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AdminLayout />}>
          {/* Default redirect: / → /dashboard */}
          <Route index element={<Navigate to="/dashboard" replace />} />

          {adminRoutes.map(({ path, element: Element }) => (
            <Route key={path} path={path} element={<Element />} />
          ))}

          {/* Catch-all: unknown paths inside the admin area → dashboard */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Route>
    </Routes>
  );
}
