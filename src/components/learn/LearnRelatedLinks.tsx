import { Link } from "@tanstack/react-router";
import { LEARN_CATEGORIES, type LearnCategoryId } from "@/lib/learn/categories";
import { FEATURED_GUIDES } from "@/lib/learn/registry";

const SITE_LINKS = [
  { label: "Features", href: "/#features" },
  { label: "Pricing", href: "/#pricing" },
  { label: "Converter", href: "/#converter" },
  { label: "Register", to: "/register" as const },
  { label: "Contact", href: "/#contact" },
  { label: "FAQ", to: "/learn/faq" as const },
] as const;

export function LearnRelatedLinks({ currentId }: { currentId?: LearnCategoryId }) {
  const otherArticles = LEARN_CATEGORIES.filter((c) => c.id !== currentId);

  return (
    <nav className="rounded-2xl border border-border bg-card p-6 sm:p-8" aria-label="Related links">
      <h2 className="text-lg font-semibold text-foreground">Explore VegaPal</h2>
      <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
        <div>
          <h3 className="font-medium text-foreground mb-2">Site</h3>
          <ul className="space-y-2">
            {SITE_LINKS.map((link) => (
              <li key={link.label}>
                {"to" in link ? (
                  <Link to={link.to} className="text-primary hover:underline">
                    {link.label}
                  </Link>
                ) : (
                  <a href={link.href} className="text-primary hover:underline">
                    {link.label}
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="font-medium text-foreground mb-2">Featured guides</h3>
          <ul className="space-y-2">
            {FEATURED_GUIDES.slice(0, 6).map((guide) => (
              <li key={guide.path}>
                <Link to={guide.path} className="text-primary hover:underline">
                  {guide.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="font-medium text-foreground mb-2">Learn articles</h3>
          <ul className="space-y-2">
            <li>
              <Link to="/learn" className="text-primary hover:underline">
                Learn home
              </Link>
            </li>
            {otherArticles.map((article) => (
              <li key={article.id}>
                <Link to={article.path} className="text-primary hover:underline">
                  {article.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </nav>
  );
}
