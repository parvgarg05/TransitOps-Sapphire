/**
 * Sidebar navigation for the authenticated app shell.
 *
 * Uses the design system's scarce dark surface (#101010) as the app's anchor,
 * with an inverted white "pill" marking the active route — echoing the
 * nav-pill-group active treatment.
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Car,
  Users,
  Route,
  Wrench,
  DollarSign,
  FileText,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/vehicles", label: "Vehicles", icon: Car },
  { href: "/drivers", label: "Drivers", icon: Users },
  { href: "/trips", label: "Trips", icon: Route },
  { href: "/maintenance", label: "Maintenance", icon: Wrench },
  { href: "/expenses", label: "Fuel & Expenses", icon: DollarSign },
  { href: "/reports", label: "Reports", icon: FileText },
];

interface SidebarProps {
  onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const pathname = usePathname();

  return (
    <nav className="flex h-full w-64 flex-col bg-surface-dark text-white">
      <div className="flex h-16 items-center gap-2.5 px-5 border-b border-white/10">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-white text-surface-dark">
          <Truck className="h-5 w-5" />
        </div>
        <span className="text-lg font-semibold tracking-[-0.02em]">
          TransitOps
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || pathname.startsWith(`${item.href}/`);

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-white text-surface-dark shadow-card"
                  : "text-white/60 hover:bg-surface-dark-elevated hover:text-white"
              )}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="border-t border-white/10 px-5 py-4">
        <p className="text-xs text-white/40">
          Smart Transport Operations
        </p>
      </div>
    </nav>
  );
}
