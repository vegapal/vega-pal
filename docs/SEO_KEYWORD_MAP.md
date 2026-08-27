# VegaPal SEO Keyword Map

Intent map for every published page and a record of the candidates that were
rejected, with the reasoning. Architecture lives in
[`SEO_V2_AUDIT.md`](./SEO_V2_AUDIT.md).

## The publishing gate

A keyword only becomes a page when it clears all five:

1. **Distinct intent.** Someone searching this wants something a different page
   would not satisfy. A different word for the same want is not a different
   intent.
2. **Distinct content.** At least 550 words of copy that could not be produced
   by find-and-replacing a term in an existing page. Enforced by
   `npm run seo:content-audit`.
3. **Product truth.** The page can be honest about what VegaPal does (presents
   payment instructions) without implying processing, custody or chain
   verification.
4. **Real document mapping.** The result is a `quotation`, `proforma_invoice` or
   `tax_invoice`, and the copy says so.
5. **A place in a cluster.** The page has a pillar above it and siblings beside
   it. Orphans do not get published.

Anything that fails becomes a section on an existing page instead.

---

## Published: Invoicing hub

Pillar: `/invoice-generator`

| Path                      | Primary intent                              | Type          | Document      | Differentiator                                                                                         |
| ------------------------- | ------------------------------------------- | ------------- | ------------- | ------------------------------------------------------------------------------------------------------ |
| `/invoice-generator`      | "make an invoice right now"                 | Transactional | `tax_invoice` | Pillar. Fastest path from blank to sent, no format education.                                          |
| `/invoice-template`       | "show me the structure of an invoice"       | Informational | `tax_invoice` | Field-by-field anatomy and what is legally expected. Ends at understanding, not a click.               |
| `/multi-currency-invoice` | "bill in a currency that isn't my own"      | Hybrid        | `tax_invoice` | Currency choice, rate presentation, which currency the client actually pays in.                        |
| `/bank-transfer-invoice`  | "invoice with my bank details on it"        | Transactional | `tax_invoice` | IBAN/SWIFT/account fields, reference lines, why the reference is what gets reconciled.                 |
| `/freelance-invoice`      | "I freelance and need to bill a client"     | Transactional | `tax_invoice` | Solo operator: no company registration, deposits, chasing without damaging the relationship.           |
| `/international-invoice`  | "bill a client in another country"          | Hybrid        | `tax_invoice` | Cross-border mechanics: which address is which, tax treatment across borders, transfer cost and delay. |
| `/small-business-invoice` | "invoicing for a small registered business" | Hybrid        | `tax_invoice` | Repeatable process, numbering discipline, record-keeping — a system rather than a one-off.             |
| `/consulting-invoice`     | "bill for consulting work"                  | Hybrid        | `tax_invoice` | Retainers, phases, day rates, and billing outcomes rather than hours.                                  |
| `/contractor-invoice`     | "bill as a contractor"                      | Hybrid        | `tax_invoice` | Progress claims, variations, retention, milestone-linked payment.                                      |

`consulting-invoice` and `contractor-invoice` survived the near-dupe check
because the underlying billing shapes genuinely differ: consulting is retainers
and phases against deliverables; contracting is progress claims and retention
against completed work. They share almost no worked-example content.

## Published: Crypto invoicing hub

Pillar: `/crypto-invoice`

| Path                        | Primary intent                       | Type          | Document      | Differentiator                                                                                                     |
| --------------------------- | ------------------------------------ | ------------- | ------------- | ------------------------------------------------------------------------------------------------------------------ |
| `/crypto-invoice`           | "how does invoicing in crypto work?" | Informational | `tax_invoice` | Pillar. Concepts: asset, network, address, confirmation, who bears risk. No tool walkthrough.                      |
| `/crypto-invoice-generator` | "create a crypto invoice now"        | Transactional | `tax_invoice` | Tool walkthrough only. Assumes the concepts are already understood and links back to the pillar for them.          |
| `/usdt-invoice`             | "invoice in USDT specifically"       | Informational | `tax_invoice` | Stablecoin reasoning: why USDT over volatile assets, the peg, network choice as a decision.                        |
| `/usdt-invoice-generator`   | "create a USDT invoice now"          | Transactional | `tax_invoice` | Filling in asset, network and wallet for a USDT invoice. Mechanics, not rationale.                                 |
| `/trc20-invoice`            | "USDT on Tron / TRC20"               | Hybrid        | `tax_invoice` | TRC20 addresses, energy/bandwidth fees, why it is VegaPal's default network.                                       |
| `/erc20-invoice`            | "USDT on Ethereum / ERC20"           | Hybrid        | `tax_invoice` | Gas cost economics, when the higher fee is worth it (custodial and institutional counterparties).                  |
| `/bep20-invoice`            | "USDT on BNB Smart Chain / BEP20"    | Hybrid        | `tax_invoice` | BSC specifics and the address-format overlap with Ethereum that causes lost funds.                                 |
| `/crypto-payment-request`   | "request a crypto payment"           | Transactional | `tax_invoice` | Request-first framing: the shareable payment page is the artifact. States plainly that the document is an invoice. |
| `/usdt-payment-request`     | "request a USDT payment"             | Transactional | `tax_invoice` | Same framing narrowed to USDT, with the network decision made up front.                                            |

### The four-way split that needed the most care

`crypto-invoice` / `crypto-invoice-generator` / `usdt-invoice` /
`usdt-invoice-generator` are the highest cannibalization risk on the site. The
split is enforced on two axes:

- **Concept vs tool.** The two non-generator pages explain and never walk
  through the product. The two generator pages walk through the product and
  defer all conceptual questions upward with a link.
- **General vs asset.** The `crypto-*` pair treats asset choice as an open
  question. The `usdt-*` pair treats USDT as settled and moves on to network
  choice.

Each of the four has its own worked example, its own common-mistakes list, and
its own FAQ set. `seo:content-audit` scores every pair among them below the
failure threshold.

### Why three network pages instead of one

TRC20, ERC20 and BEP20 differ in the things a seller actually gets wrong: fee
model, address format, and confirmation expectations. BEP20 shares Ethereum's
address format, so a BEP20 address pasted into an ERC20 invoice looks valid and
loses funds — a mistake with no analogue on the TRC20 page. That is distinct
content, not a keyword swap. Each page names its network explicitly, and
`npm run test:seo` asserts it does.

## Published: Business documents hub

Pillar: `/proforma-invoice`

| Path                          | Primary intent                  | Type          | Document           | Differentiator                                                                |
| ----------------------------- | ------------------------------- | ------------- | ------------------ | ----------------------------------------------------------------------------- |
| `/proforma-invoice`           | "what is a proforma invoice?"   | Informational | `proforma_invoice` | Pillar. Concept, when it replaces a tax invoice, tax and customs treatment.   |
| `/proforma-invoice-generator` | "create a proforma invoice now" | Transactional | `proforma_invoice` | Tool walkthrough and the conversion path to a tax invoice once payment lands. |
| `/quotation-generator`        | "send a price quote"            | Transactional | `quotation`        | Quote creation and validity windows.                                          |
| `/quotation-template`         | "what goes in a quotation?"     | Informational | `quotation`        | Structure and wording; scope and exclusions as dispute prevention.            |
| `/proposal-generator`         | "write a proposal with pricing" | Hybrid        | `quotation`        | Proposal framing, honest about producing a quotation document.                |
| `/payment-request`            | "ask a client to pay"           | Transactional | `tax_invoice`      | Request-and-follow-up framing, honest about producing an invoice.             |
| `/crypto-payment-request`     | (also in crypto hub)            | Transactional | `tax_invoice`      | —                                                                             |
| `/usdt-payment-request`       | (also in crypto hub)            | Transactional | `tax_invoice`      | —                                                                             |

`proforma-invoice` vs `proforma-invoice-generator` follows the same
concept-vs-tool rule as the crypto pair: the pillar answers "what is this and
when do I use it", the generator answers "how do I produce one here", including
the conversion to a tax invoice that the pillar only mentions.

## Published: Tools

Tool pages target task intent — someone with a specific calculation to do, not a
product to evaluate. All results are ungated.

| Path                                 | Intent                               | Notes                                                                        |
| ------------------------------------ | ------------------------------------ | ---------------------------------------------------------------------------- |
| `/tools/due-date-calculator`         | "when is net 30 actually due?"       | Net terms, custom terms, end-of-month rule.                                  |
| `/tools/discount-calculator`         | "what's the net after a discount?"   | Percentage or fixed, with effective rate.                                    |
| `/tools/vat-calculator`              | "add or extract VAT"                 | Inclusive/exclusive, jurisdiction disclaimer.                                |
| `/tools/invoice-number-generator`    | "how should I number invoices?"      | Scheme preview; explains VegaPal's numbering.                                |
| `/tools/payment-terms-generator`     | "how do I word my payment terms?"    | Copyable terms text from net terms, deposit, reference and late-fee choices. |
| `/tools/late-fee-calculator`         | "how much late fee can I charge?"    | Daily or monthly rate; not-legal-advice disclaimer.                          |
| `/tools/crypto-payment-qr-generator` | "make a QR for my receiving address" | Public address only, private-key guard, encodes locally.                     |
| `/tools/usdt-aed-converter`          | "what is USDT worth in AED?"         | Reference rate, labelled as reference not a quote.                           |

## Published: Learn guides

Learn targets research and comparison intent that a money page would be worse at
answering, and links down into the money pages.

| Path                                      | Intent                                      | Category          |
| ----------------------------------------- | ------------------------------------------- | ----------------- |
| `/learn/what-is-an-invoice`               | Definition                                  | Invoice & Billing |
| `/learn/what-is-a-bill`                   | Definition                                  | Invoice & Billing |
| `/learn/invoice-vs-bill`                  | Comparison                                  | Invoice & Billing |
| `/learn/invoice-generator`                | Category research                           | Invoice & Billing |
| `/learn/invoice-software`                 | Category research                           | Invoice & Billing |
| `/learn/invoice-vs-proforma-invoice`      | "which document do I send, and when?"       | Invoice & Billing |
| `/learn/quotation-vs-invoice`             | "is this an offer or a demand for payment?" | Invoice & Billing |
| `/learn/invoice-payment-terms`            | "what do net 7 / net 30 / EOM mean?"        | Invoice & Billing |
| `/learn/proforma-invoice-example`         | "show me a filled-in one"                   | Invoice & Billing |
| `/learn/trc20-vs-erc20-for-usdt-payments` | "which network should I ask to be paid on?" | Payments          |

`invoice-vs-proforma-invoice` and `quotation-vs-invoice` overlap in subject but
not in question: the first is about payment timing relative to delivery, the
second is about whether the recipient owes anything yet. `proforma-invoice-example`
is a worked artifact rather than an explanation, which is why it lives in Learn
alongside the concept pages rather than replacing them.

---

## Rejected candidates

Each of these was considered and left unpublished. None has a route, none is in
the sitemap, and `npm run test:seo` asserts they stay that way — so a future
change cannot quietly add one without the reasoning being revisited.

### `bitcoin-invoice` — rejected: no product-specific surface

VegaPal's crypto support is a generic asset/network/address field set. There is
no Bitcoin-specific UX: no BTC address validation, no Lightning support, no
UTXO or fee-rate handling. A page would be the generic crypto page with "USDT"
swapped for "Bitcoin", which fails gate 2, and would have to either stay vague
or imply capabilities that do not exist, which fails gate 3.

Bitcoin's volatility also makes it a poor invoicing asset — an honest page would
mostly argue against its own keyword. Covered instead as an asset-choice
discussion on `/crypto-invoice`.

**Revisit if:** BTC-specific handling ships (address validation, rate locking at
issue time, or Lightning).

### `ethereum-invoice` — rejected: collides with `/erc20-invoice`

The searcher wanting to invoice "on Ethereum" is served by `/erc20-invoice`,
which is more precise: what they will actually receive is USDT on the Ethereum
network, and the page is about the ERC20 token transfer, gas cost and address
format. A separate ETH page would either duplicate it or advocate invoicing in
volatile ETH.

**Revisit if:** native ETH (not ERC20 token) invoicing gets distinct product
handling.

### `agency-invoice` — rejected: near-duplicate of `/consulting-invoice`

Agency billing is retainers, project phases and deliverable-linked milestones —
the same billing shapes `/consulting-invoice` already covers, with the same
worked example and the same mistakes. The only real difference is the reader's
job title, and job title is not intent.

Served by adding an agency-shaped use case to `/consulting-invoice`.

**Revisit if:** agency-specific mechanics get product support (multi-client
consolidated billing, pass-through media spend, white-label documents).

### `service-invoice` — rejected: too broad to have an intent

"Service invoice" covers everything the invoicing hub already does. It has no
specific reader and no specific mechanic; every plausible section already exists
on `/invoice-generator`, `/freelance-invoice`, `/consulting-invoice` or
`/contractor-invoice`. Publishing it would create a page competing with its own
pillar for a vaguer version of the same query — textbook cannibalization.

### `usdt-invoice-trc20` — rejected: same page as `/trc20-invoice`

Word-order variant of a published page. Same intent, same answer, same content.
Search engines resolve the variant to the existing page; a second URL would only
split its signals. Same reasoning covers `usdt-trc20-invoice`,
`trc20-usdt-invoice` and `usdt-invoice-tron`.

### `proforma-invoice-template` — rejected: split across two better pages

The intent behind "template" divides cleanly and both halves are already served:
the structural question by `/proforma-invoice`, and the show-me-a-filled-one
question by `/learn/proforma-invoice-example`. A third page would sit between
them with nothing of its own, and would compete with `/proforma-invoice` for the
same head term.

Handled by linking the pillar and the worked example to each other.

### `/learn/invoicing` and `/learn/crypto-invoicing` hubs — rejected: duplicate existing categories

Considered as cluster collection pages. Rejected because `/learn/invoice` and
`/learn/payments` already are those collections. Adding parallel hubs would
produce two competing collection pages per topic — the exact problem V2 set out
to fix. The existing category pages absorbed the new guides instead.

---

## Maintenance

When adding a page, work through the five gates above, then:

1. Add the slug to `MARKETING_PAGE_SLUGS` (or `TOOL_SLUGS` / the learn registry).
2. Write the entry, including a common-mistakes and a worked-example section —
   `npm run test:seo` requires both.
3. Assign hubs and `relatedSlugs`; add reciprocal links from siblings.
4. Run `npm run seo:sitemap`, then `npm run seo:audit`,
   `npm run seo:content-audit` and `npm run test:seo`.
5. Record the decision here — including rejections, which are the more useful
   half of this document.
