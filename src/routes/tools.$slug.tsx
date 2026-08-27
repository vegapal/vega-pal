import { createFileRoute, notFound } from "@tanstack/react-router";
import { ToolPageShell } from "@/components/tools/ToolPageShell";
import { TOOL_COMPONENTS } from "@/components/tools/tool-components";
import {
  createBreadcrumbJsonLd,
  createFaqJsonLd,
  createPublicPageHead,
  createWebPageJsonLd,
} from "@/lib/seo/page-head";
import { getTool, isToolSlug, type ToolSlug } from "@/lib/seo/tools-registry";

export const Route = createFileRoute("/tools/$slug")({
  beforeLoad: ({ params }) => {
    if (!isToolSlug(params.slug)) throw notFound();
  },
  head: ({ params }) => {
    if (!isToolSlug(params.slug)) return {};
    const tool = getTool(params.slug);
    return createPublicPageHead({
      title: tool.title,
      description: tool.description,
      path: tool.path,
      jsonLd: [
        createWebPageJsonLd({
          title: tool.title,
          description: tool.description,
          path: tool.path,
        }),
        createBreadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Tools", path: "/tools" },
          { name: tool.name, path: tool.path },
        ]),
        createFaqJsonLd(tool.faqs),
      ],
    });
  },
  component: ToolPage,
});

function ToolPage() {
  const { slug } = Route.useParams();
  const tool = getTool(slug as ToolSlug);
  const ToolWidget = TOOL_COMPONENTS[tool.slug];

  return (
    <ToolPageShell tool={tool}>
      <ToolWidget />
    </ToolPageShell>
  );
}
