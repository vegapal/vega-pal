import { Link, type LinkProps } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export type SeoBreadcrumbItem = {
  name: string;
  href?: string;
};

type SeoBreadcrumbProps = {
  items: SeoBreadcrumbItem[];
  className?: string;
};

export function SeoBreadcrumb({ items, className }: SeoBreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn("text-sm", className)}>
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={`${item.name}-${index}`} className="flex items-center gap-2">
              {item.href && !isLast ? (
                <Link
                  to={item.href as LinkProps["to"]}
                  className="text-on-dark-secondary hover:text-on-dark transition-colors"
                >
                  {item.name}
                </Link>
              ) : (
                <span
                  className={isLast ? "text-on-dark font-medium" : "text-on-dark-secondary"}
                  aria-current={isLast ? "page" : undefined}
                >
                  {item.name}
                </span>
              )}
              {!isLast ? (
                <span aria-hidden className="text-on-dark-muted">
                  /
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
