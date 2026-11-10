import { OwnerAccessGuard } from "@/components/owner/OwnerAccessGuard";
import { OwnerProvider } from "@/context/OwnerContext";

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return (
    <OwnerAccessGuard>
      <OwnerProvider>{children}</OwnerProvider>
    </OwnerAccessGuard>
  );
}