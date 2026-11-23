import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "درگاه پرداخت | سایرا",
  robots: {
    index: false,
    follow: false,
  },
};

export default function PaymentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
