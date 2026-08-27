import { Link, createFileRoute } from "@tanstack/react-router";
import { LandingHeader } from "@/components/landing/LandingHeader";
import { PublicSiteFooter } from "@/components/landing/PublicSiteFooter";
import { SeoBreadcrumb } from "@/components/seo/SeoBreadcrumb";
import { FREE_PLAN_MONTHLY_INVOICE_LIMIT } from "@/lib/admin/plans";
import {
  createBreadcrumbJsonLd,
  createPublicPageHead,
  createWebPageJsonLd,
} from "@/lib/seo/page-head";

const TITLE = "About VegaPal — What the Product Does and Does Not Do";
const DESCRIPTION =
  "VegaPal creates invoices, proforma invoices and quotations and presents your bank, crypto or cash payment instructions. It does not process, hold or verify payments.";

export const Route = createFileRoute("/about")({
  head: () =>
    createPublicPageHead({
      title: `${TITLE} | VegaPal`,
      description: DESCRIPTION,
      path: "/about",
      jsonLd: [
        createWebPageJsonLd({ title: TITLE, description: DESCRIPTION, path: "/about" }),
        createBreadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "About", path: "/about" },
        ]),
      ],
    }),
  component: AboutPage,
});

const SECTIONS: Array<{ heading: string; body: string[] }> = [
  {
    heading: "What VegaPal is",
    body: [
      "VegaPal is a document tool for people who invoice. You create a quotation, a proforma invoice or a tax invoice, and it produces a print-ready PDF plus a public payment page carrying the same totals, dates and payment instructions.",
      "Payment instructions can be a bank account with its full transfer fields, a crypto wallet with its asset and network, cash details, or a combination shown together on one document.",
    ],
  },
  {
    heading: "What VegaPal is not",
    body: [
      "It is not a payment processor. There is no checkout, no card form, no escrow, no custody and no wallet connection anywhere in the product. Money moves from your client directly to your own bank account or your own wallet.",
      "It does not monitor blockchains or verify that a transfer happened. When an invoice shows as paid, that is because you or a teammate marked it paid after checking your own account. Being explicit about this matters more than it sounds: a tool that implied otherwise would be making a promise it could not keep.",
      "It is also not accounting software. There is no general ledger, no bank feed and no tax filing. Most people hand VegaPal documents to a bookkeeper or an accounting package.",
    ],
  },
  {
    heading: "The three document types",
    body: [
      "Quotation, proforma invoice and tax invoice — that is the full list, and each keeps its own numbering series. A quotation prices work before it is agreed. A proforma invoice requests payment ahead of delivery and is not a tax document. A tax invoice records a completed sale.",
      "There is no separate proposal or payment-request document type. Where our pages talk about proposals or payment requests, they mean a quotation and an invoice respectively, and they say so.",
    ],
  },
  {
    heading: "Currencies and networks",
    body: [
      "Documents can be denominated in USD, AED, EUR, SAR, CNY, RUB and INR, or in USDT, USDC, BTC and ETH. Currency is set per document rather than per account, so different clients can be billed differently without changing a global setting.",
      "For crypto, the network travels with the saved wallet. TRON (TRC20) is the default because it is the most widely supported rail for USDT, and Ethereum (ERC20), BNB Smart Chain (BEP20), Bitcoin and Solana are available too. VegaPal does not convert between any of them.",
    ],
  },
  {
    heading: "Plans",
    body: [
      `The free plan covers ${FREE_PLAN_MONTHLY_INVOICE_LIMIT} documents a month across all three document types, including PDF export and shareable payment pages. Paid plans raise the monthly limit and add team seats.`,
      "No percentage is taken from anything you get paid, because nothing you get paid passes through VegaPal.",
    ],
  },
];

function AboutPage() {
  return (
    <div className="min-h-screen bg-canvas overflow-x-hidden">
      <section className="relative bg-hero overflow-hidden">
        <div className="absolute inset-0 bg-mesh opacity-70" />
        <LandingHeader />
        <div className="relative mx-auto max-w-3xl px-4 sm:px-6 pt-24 sm:pt-32 pb-12 sm:pb-16">
          <SeoBreadcrumb items={[{ name: "Home", href: "/" }, { name: "About" }]} />
          <h1 className="mt-6 text-[1.7rem] leading-[1.15] sm:text-3xl lg:text-[2.4rem] font-bold tracking-tight text-balance text-on-dark">
            About VegaPal
          </h1>
          <p className="mt-5 text-[0.95rem] sm:text-lg text-on-dark-secondary leading-relaxed">
            A short, plain description of what the product does, what it deliberately does not do,
            and where its boundaries are. If anything on the rest of the site reads as a bigger
            claim than what is written here, this page is the one to trust.
          </p>
        </div>
      </section>

      <main>
        <section className="py-14 sm:py-20 bg-canvas">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 space-y-10">
            {SECTIONS.map((section) => (
              <article key={section.heading}>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-ink text-balance">
                  {section.heading}
                </h2>
                <div className="mt-4 space-y-4">
                  {section.body.map((paragraph, index) => (
                    <p
                      key={index}
                      className="text-[0.95rem] sm:text-base text-slate leading-relaxed"
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
              </article>
            ))}

            <p className="text-sm text-slate">
              More detail:{" "}
              <Link to="/pricing" className="text-primary hover:underline">
                pricing
              </Link>
              ,{" "}
              <Link to="/learn" className="text-primary hover:underline">
                Learn guides
              </Link>
              , and{" "}
              <Link to="/tools" className="text-primary hover:underline">
                free tools
              </Link>
              .
            </p>
          </div>
        </section>
      </main>

      <PublicSiteFooter />
    </div>
  );
}
