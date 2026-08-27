import { createFileRoute } from "@tanstack/react-router";
import { LearnSeoArticle } from "@/components/learn/LearnSeoArticle";
import { createLearnHead } from "@/lib/learn/seo";
import { learnArticleByPath, sprint2NavFor } from "@/lib/learn/registry";
import { ARTICLE_CONFIG, ArticleContent } from "@/lib/learn/sprint2/proforma-invoice-example";

const meta = learnArticleByPath("/learn/proforma-invoice-example")!;
const nav = sprint2NavFor("/learn/proforma-invoice-example");

export const Route = createFileRoute("/learn/proforma-invoice-example")({
  head: () =>
    createLearnHead({
      title: ARTICLE_CONFIG.title,
      description: ARTICLE_CONFIG.description,
      path: ARTICLE_CONFIG.path,
      breadcrumbTitle: ARTICLE_CONFIG.breadcrumbTitle,
      categoryTitle: meta.category,
      categoryPath: meta.categoryPath,
      dateModified: meta.updatedAt,
      faq: ARTICLE_CONFIG.faq,
    }),
  component: ProformaInvoiceExamplePage,
});

function ProformaInvoiceExamplePage() {
  const { heroTitle, intro, toc, related, faq } = ARTICLE_CONFIG;
  return (
    <LearnSeoArticle
      heroTitle={heroTitle}
      intro={intro}
      meta={meta}
      toc={toc}
      related={related}
      faq={faq}
      prev={nav.prev}
      next={nav.next}
    >
      <ArticleContent />
    </LearnSeoArticle>
  );
}
