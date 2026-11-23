import type { Metadata } from "next";
import { OwnerAccessGuard } from "@/components/owner/OwnerAccessGuard";
import { OwnerProvider } from "@/context/OwnerContext";

export const metadata: Metadata = {
  title: "پنل مدیریت گیمنت | سایرا",
  robots: {
    index: false,
    follow: false,
  },
};

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <OwnerAccessGuard>
      <OwnerProvider>{children}</OwnerProvider>
    </OwnerAccessGuard>
  );
}