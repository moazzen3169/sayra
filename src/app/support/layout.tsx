import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  alternates: {
    canonical: "/support",
  },
};

export default function SupportLayout({ children }: { children: ReactNode }) {
  return children;
}
