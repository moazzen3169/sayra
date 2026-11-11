"use client";

import React from "react";
import { OwnerHeader } from "./OwnerHeader";

export const OwnerPageHeader: React.FC<{
  title: string;
  isSubpage?: boolean;
  backUrl?: string;
  showBadge?: boolean;
  showSearch?: boolean;
  searchValue?: string;
  onSearchChange?: (val: string) => void;
  onSearchSubmit?: (e: React.FormEvent) => void;
  searchPlaceholder?: string;
}> = (props) => {
  return <OwnerHeader {...props} />;
};

export { OwnerHeader };
