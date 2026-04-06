"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "대시보드", icon: "🏠" },
  { href: "/zones", label: "구역 관리", icon: "🗺️" },
  { href: "/creatures", label: "동식물 관리", icon: "🌱" },
  { href: "/byproducts", label: "부산물/채집품", icon: "💎" },
  { href: "/settings", label: "시스템 설정", icon: "⚙️" },
  { href: "/access", label: "출입 관리", icon: "🔑" },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 min-h-screen bg-card border-r border-border flex flex-col">
      <div className="p-6 border-b border-border">
        <h1 className="text-xl font-bold text-accent">🌳 Ciel&apos;s Garden</h1>
        <p className="text-sm text-foreground/50 mt-1">정원 관리 시스템</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-accent/20 text-accent font-semibold"
                  : "text-foreground/70 hover:bg-card-hover hover:text-foreground"
              }`}
            >
              <span className="text-lg">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-2 text-xs text-foreground/40">
          <span className="w-2 h-2 rounded-full bg-accent pulse-glow" />
          시스템 활성 중
        </div>
      </div>
    </aside>
  );
}
