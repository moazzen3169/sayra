"use client";

import React from "react";
import { OwnerHeader } from "./OwnerHeader";

export const OwnerPageHeader: React.FC<{
  title: string;
  isSubpage?: boolean;
  backUrl?: string;
}> = ({ title, isSubpage = true, backUrl }) => {
  return <OwnerHeader title={title} isSubpage={isSubpage} backUrl={backUrl} />;
};

export { OwnerHeader };
