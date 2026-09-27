import React from "react";

type Crumb = { label: string; to?: string };

export default function AdminHeader({
  title,
  subtitle,
  actions,
  breadcrumbs,
}: {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  breadcrumbs?: Crumb[];
}) {
  return (
    <div className="mb-6">
      {breadcrumbs?.length ? (
        <nav className="text-sm text-gray-400 mb-2">
          {breadcrumbs.map((c, idx) => (
            <span key={idx}>
              {c.to ? (
                <a href={c.to} className="hover:text-primary transition-colors">
                  {c.label}
                </a>
              ) : (
                <span>{c.label}</span>
              )}
              {idx < breadcrumbs.length - 1 ? (
                <span className="mx-2">/</span>
              ) : null}
            </span>
          ))}
        </nav>
      ) : null}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-primary mb-1">{title}</h1>
        {subtitle ? <p className="text-gray-400">{subtitle}</p> : null}
        {actions ? (
          <div className="flex items-center gap-2 ml-auto">{actions}</div>
        ) : null}
      </div>
    </div>
  );
}
