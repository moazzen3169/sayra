import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "ورود به حساب کاربری | سایرا",
  robots: {
    index: false,
    follow: false,
  },
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
