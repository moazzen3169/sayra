import { OwnerProvider } from "@/context/OwnerContext";

export default function OwnerLayout({ children }: { children: React.ReactNode }) {
  return <OwnerProvider>{children}</OwnerProvider>;
}