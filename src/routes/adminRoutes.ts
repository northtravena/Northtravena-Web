// src/routes/adminRoutes.ts
// Single source of truth for all admin routes, sidebar labels, and icons.

import { lazy } from "react";
import {
  LayoutDashboard,
  Car,
  Wrench,
  Truck,
  Users,
  UserCog,
  Route,
  AlertTriangle,
  CreditCard,
  BarChart3,
  UsersRound,
  Settings,
} from "lucide-react";
import type { ComponentType } from "react";
import type { LucideIcon } from "lucide-react";

export interface AdminRoute {
  path: string;
  label: string;
  element: ComponentType;
  icon: LucideIcon;
  /** Sidebar section this route belongs to */
  section: "main" | "daily-rides" | "support-finance" | "app";
}

const Dashboard    = lazy(() => import("../pages/Dashboard").then((m) => ({ default: m.Dashboard })));
const Services     = lazy(() => import("../pages/Bookings").then((m) => ({ default: m.Services })));
const AppServices  = lazy(() => import("../pages/AppServices").then((m) => ({ default: m.AppServices })));
const Fleet        = lazy(() => import("../pages/Fleet").then((m) => ({ default: m.Fleet })));
const Captains     = lazy(() => import("../pages/Captains").then((m) => ({ default: m.Captains })));
const Passengers   = lazy(() => import("../pages/Passengers").then((m) => ({ default: m.Passengers })));
const Rides        = lazy(() => import("../pages/Rides").then((m) => ({ default: m.Rides })));
const Complaints   = lazy(() => import("../pages/Complaints").then((m) => ({ default: m.Complaints })));
const Transactions = lazy(() => import("../pages/Transactions").then((m) => ({ default: m.Transactions })));
const Reports      = lazy(() => import("../pages/Reports").then((m) => ({ default: m.Reports })));
const AllUsers     = lazy(() => import("../pages/AllUsers").then((m) => ({ default: m.AllUsers })));
const SettingsPage = lazy(() => import("../pages/Settings").then((m) => ({ default: m.Settings })));

export const adminRoutes: AdminRoute[] = [
  // ── Main ────────────────────────────────────────────────────────────────────
  { path: "/dashboard",    label: "Dashboard",    element: Dashboard,    icon: LayoutDashboard, section: "main"            },
  { path: "/services",     label: "Bookings",     element: Services,     icon: Car,             section: "main"            },
  { path: "/appservices",  label: "Services",     element: AppServices,  icon: Wrench,          section: "main"            },
  { path: "/fleet",        label: "Fleet & Rates",element: Fleet,        icon: Truck,           section: "main"            },
  // ── Daily Rides ─────────────────────────────────────────────────────────────
  { path: "/captains",     label: "Captains",     element: Captains,     icon: Users,           section: "daily-rides"     },
  { path: "/passengers",   label: "Passengers",   element: Passengers,   icon: UserCog,         section: "daily-rides"     },
  { path: "/rides",        label: "Ride Sharing", element: Rides,        icon: Route,           section: "daily-rides"     },
  // ── Support & Finance ────────────────────────────────────────────────────────
  { path: "/complaints",   label: "Complaints",   element: Complaints,   icon: AlertTriangle,   section: "support-finance" },
  { path: "/transactions", label: "Transactions", element: Transactions, icon: CreditCard,      section: "support-finance" },
  { path: "/reports",      label: "Reports",      element: Reports,      icon: BarChart3,       section: "support-finance" },
  // ── App ─────────────────────────────────────────────────────────────────────
  { path: "/allusers",     label: "All Users",    element: AllUsers,     icon: UsersRound,      section: "app"             },
  { path: "/settings",     label: "Settings",     element: SettingsPage, icon: Settings,        section: "app"             },
];

/** Utility: look up a route's label by its path segment (e.g. "/dashboard") */
export function getRouteLabel(pathname: string): string {
  const match = adminRoutes.find((r) => r.path === pathname);
  return match?.label ?? "Dashboard";
}
