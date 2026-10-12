"use client";

import React, { useState } from "react";
import { Header } from "@/components/Header";
import { BottomBar, TabType } from "@/components/BottomBar";
import { GamecenterCardBig } from "@/components/GamecenterCardBig";
import { GamecenterCardMini } from "@/components/GamecenterCardMini";

const sample = {
  id: "1",
  name: "گیمنت گرگدن",
  imageUrl: "/design/gamecenter-big.png",
  location: "تبریز ولیعصر بعد از میدان معلم روبروی کتابخانه",
  rating: 4.7,
  reviewsCount: 744,
  hourlyPrice: 230000,
  discountPercent: 23,
};

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<TabType>("home");

  return (
    <div className="flex flex-col min-h-screen bg-[var(--bg-body)] text-[var(--text-white)] pb-28">
      <Header
        locationName="تبریز"
        unreadNotificationsCount={0}
        onLocationClick={() => alert("انتخاب شهر")}
        onNotificationClick={() => alert("اعلانات")}
        onSearchClick={() => alert("جستجو")}
      />

      <main className="flex-1 px-4 py-2 flex flex-col gap-6">
        <section className="flex flex-col gap-3">
          <h2 className="font-extrabold text-base">گیمنت‌های محبوب</h2>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4">
            {[1, 2, 3].map((n) => (
              <GamecenterCardMini
                key={n}
                {...sample}
                id={`mini-${n}`}
                imageUrl="/design/gamecenter-mini.png"
                onClick={(id) => alert(id)}
              />
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-extrabold text-base">پیشنهاد ویژه سایرا</h2>
          <div className="flex flex-col gap-4">
            <GamecenterCardBig {...sample} onClick={(id) => alert(id)} />
          </div>
        </section>
      </main>

      <BottomBar activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
}