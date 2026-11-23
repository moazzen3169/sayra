import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "رزروهای من | سایرا",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ReservationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
