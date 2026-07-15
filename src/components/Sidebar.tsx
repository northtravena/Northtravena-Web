// src/components/Sidebar.tsx
// Navigation sidebar. Driven entirely by adminRoutes — no hardcoded items.

import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import { adminRoutes, type AdminRoute } from "@/routes/adminRoutes";
import logo from "../assets/noth.travena.png";

// ─── Section metadata ─────────────────────────────────────────────────────────
const SECTIONS: { key: AdminRoute["section"]; label: string }[] = [
  { key: "main",            label: "Main"              },
  { key: "daily-rides",     label: "Daily Rides"       },
  { key: "support-finance", label: "Support & Finance" },
  { key: "app",             label: "App"               },
];

export function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 bg-white text-[#8CC63E] flex flex-col shadow-sm">
      {/* Logo */}
      <div className="p-2 flex justify-center items-center border-b border-[#0D2955]">
        <img src={logo} width={60} alt="North Travena logo" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-6 px-3 overflow-y-auto">
        {SECTIONS.map(({ key, label }) => {
          const items = adminRoutes.filter((r) => r.section === key);
          return (
            <div key={key} className="mb-6">
              <p className="text-xs font-semibold text-[#8CC63E] uppercase tracking-wider px-3 mb-3">
                {label}
              </p>
              <ul className="space-y-1">
                {items.map((route) => (
                  <SidebarNavItem key={route.path} route={route} />
                ))}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-[#0D2955]">
        <p className="text-xs text-[#0D2955] text-center">© 2025 North Travena</p>
      </div>
    </aside>
  );
}

// ─── Individual nav item ──────────────────────────────────────────────────────
function SidebarNavItem({ route }: { route: AdminRoute }) {
  const Icon = route.icon;

  return (
    <li>
      <NavLink
        to={route.path}
        className={({ isActive }) =>
          cn(
            "w-full flex items-center gap-3 px-3 py-2.5 rounded-sm text-sm font-medium transition-all duration-200",
            isActive
              ? "bg-[#8CC63E] text-[#0D2955]"
              : "text-[#0D2955] hover:text-[#0D2955] hover:bg-[#d9f5b3]"
          )
        }
      >
        {({ isActive }) => (
          <>
            <Icon className={cn("w-5 h-5", isActive ? "text-[#0D2955]" : "text-[#0D2955]")} />
            {route.label}
          </>
        )}
      </NavLink>
    </li>
  );
}
