import React from "react";

export type TabType = "home" | "gamecenters" | "bookings" | "profile";

interface BottomBarProps {
  activeTab?: TabType;
  onTabChange?: (tab: TabType) => void;
  activeBookingCount?: number;
}

export const BottomBar: React.FC<BottomBarProps> = ({
  activeTab = "home",
  onTabChange,
  activeBookingCount = 0,
}) => {
  const tabs = [
    {
      id: "home" as TabType,
      label: "خانه",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
          />
        </svg>
      ),
    },
    {
      id: "gamecenters" as TabType,
      label: "گیمنت‌ها",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
          />
        </svg>
      ),
    },
    {
      id: "bookings" as TabType,
      label: "رزروهای من",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      ),
    },
    {
      id: "profile" as TabType,
      label: "پروفایل",
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
          />
        </svg>
      ),
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
      <div className="w-full max-w-[var(--max-app-width)] bg-[var(--bg-card)]/95 backdrop-blur-lg border-t border-[var(--border-color)] px-2 py-2 flex items-center justify-around pointer-events-auto shadow-[0_-10px_25px_rgba(0,0,0,0.5)]">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange?.(tab.id)}
              className={`relative flex flex-col items-center justify-center py-1.5 px-3 rounded-xl transition-all duration-200 ${
                isActive
                  ? "text-[var(--primary)] font-bold scale-105"
                  : "text-[var(--text-muted)] hover:text-[var(--text-white)]"
              }`}
            >
              <div className="relative">
                {tab.icon}
                {tab.id === "bookings" && activeBookingCount > 0 && (
                  <span className="absolute -top-1 -right-2 w-4 h-4 rounded-full bg-[var(--primary)] text-[#101014] text-[9px] font-extrabold flex items-center justify-center border border-[var(--bg-card)]">
                    {activeBookingCount}
                  </span>
                )}
              </div>
              <span className="text-[11px] mt-1 tracking-tight">{tab.label}</span>
              {isActive && (
                <span className="absolute -bottom-1 w-5 h-1 rounded-full bg-[var(--primary)] shadow-[0_0_8px_rgba(255,255,61,0.8)]" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
