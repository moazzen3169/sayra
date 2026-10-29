"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function OwnerSupportPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/support");
  }, [router]);

  return null;
}
