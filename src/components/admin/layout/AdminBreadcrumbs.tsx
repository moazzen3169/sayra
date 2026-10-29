import React from "react";
import Link from "next/link";
import { Icon } from "@/components/ui/Icon";

export interface AdminBreadcrumbItem {
  label: string;
  href?: string;
}

export interface AdminBreadcrumbsProps {
  items: AdminBreadcrumbItem[];
}

export const AdminBreadcrumbs: React.FC<AdminBreadcrumbsProps> = ({ items }) => {
  if (!items || items.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-secondary text-text-muted">
      <Link href="/admin" className="hover:text-text-white transition-colors flex items-center gap-1">
        <span>مدیریت</span>
      </Link>
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <React.Fragment key={index}>
            <Icon name="back" size={12} className="rotate-180 text-text-subtle shrink-0" />
            {isLast || !item.href ? (
              <span className="text-text-white font-medium">{item.label}</span>
            ) : (
              <Link href={item.href} className="hover:text-text-white transition-colors">
                {item.label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
