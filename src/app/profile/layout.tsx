import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "حساب کاربری | سایرا",
  robots: {
    index: false,
    follow: false,
  },
};

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
