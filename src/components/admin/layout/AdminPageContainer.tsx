import React, { ReactNode } from "react";

export interface AdminPageContainerProps {
  children: ReactNode;
  className?: string;
}

export const AdminPageContainer: React.FC<AdminPageContainerProps> = ({
  children,
  className = "",
}) => {
  return (
    <div className={`p-4 sm:p-6 lg:p-8 w-full mx-auto space-y-6 ${className}`}>
      {children}
    </div>
  );
};
