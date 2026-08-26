import type { ReactNode } from "react";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { PublicSiteFooter } from "@/components/landing/PublicSiteFooter";
import { LearnBreadcrumb } from "@/components/learn/LearnBreadcrumb";
import { LearnSupport } from "@/components/learn/LearnSupport";
import type { LearnCategoryId } from "@/lib/learn/categories";

import type { LearnRoutePath } from "@/lib/learn/types";

type LearnArticleShellProps = {
  title: string;
  intro?: ReactNode;
  currentId?: LearnCategoryId;
  breadcrumbCategory?: string;
  breadcrumbCategoryPath?: LearnRoutePath;
  breadcrumbArticle?: string;
  children: ReactNode;
};

export function LearnArticleShell({
  title,
  intro,
  breadcrumbCategory,
  breadcrumbCategoryPath,
  breadcrumbArticle,
  children,
}: LearnArticleShellProps) {
  const breadcrumbItems = [
    { label: "Home", href: "/" },
    { label: "Learn", href: "/learn" },
    ...(breadcrumbCategory && breadcrumbCategoryPath
      ? [{ label: breadcrumbCategory, href: breadcrumbCategoryPath }]
      : []),
    { label: breadcrumbArticle ?? title },
  ];

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <section className="relative bg-hero overflow-hidden">
        <div className="absolute inset-0 bg-mesh opacity-60" />
        <LandingHeader />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 pt-28 sm:pt-36 pb-12 sm:pb-16 lg:pt-40">
          <LearnBreadcrumb items={breadcrumbItems} />
          <h1 className="mt-4 text-3xl sm:text-4xl font-bold tracking-tight text-on-dark max-w-4xl">{title}</h1>
          {intro ? (
            <div className="mt-4 text-base sm:text-lg text-on-dark-secondary leading-relaxed max-w-3xl">{intro}</div>
          ) : null}
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-4 sm:px-6 py-12 sm:py-14 space-y-10">
        {children}
        <LearnSupport />
      </main>

      <PublicSiteFooter />
    </div>
  );
}
