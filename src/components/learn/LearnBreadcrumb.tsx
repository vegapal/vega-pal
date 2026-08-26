import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

import type { LearnRoutePath } from "@/lib/learn/types";

export type LearnBreadcrumbItem = {
  label: string;
  href?: "/" | LearnRoutePath | (string & {});
};

type LearnBreadcrumbProps = {
  items: LearnBreadcrumbItem[];
};

export function LearnBreadcrumb({ items }: LearnBreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-on-dark-muted">
      <ol className="flex flex-wrap items-center gap-1">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="inline-flex items-center gap-1">
              {index > 0 ? <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" aria-hidden /> : null}
              {isLast || !item.href ? (
                <span className={isLast ? "text-on-dark font-medium" : undefined} aria-current={isLast ? "page" : undefined}>
                  {item.label}
                </span>
              ) : item.href === "/" ? (
                <Link to="/" className="hover:text-on-dark hover:underline">
                  {item.label}
                </Link>
              ) : item.href.startsWith("/learn") ? (
                <Link to={item.href as LearnRoutePath} className="hover:text-on-dark hover:underline">
                  {item.label}
                </Link>
              ) : (
                <a href={item.href} className="hover:text-on-dark hover:underline">
                  {item.label}
                </a>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
