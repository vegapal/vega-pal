import type { LearnArticleConfig } from "./shared";
import { LearnInlineLink, LearnSection, Paragraphs, sprint2RelatedArticles } from "./shared";

export const ARTICLE_CONFIG: LearnArticleConfig = {
  path: "/learn/trc20-vs-erc20-for-usdt-payments",
  title: "TRC20 vs ERC20 for USDT Payments",
  description:
    "TRON and Ethereum both carry USDT, with different fees, speeds, address formats and client constraints. How to choose per invoice, and why the network must be written on the document.",
  breadcrumbTitle: "TRC20 vs ERC20 for USDT",
  heroTitle: "TRC20 vs ERC20: Choosing a Network for USDT Payments",
  intro:
    "The same USDT balance can sit on TRON, Ethereum or BNB Smart Chain, and the standard you nominate on an invoice decides the fee your client pays, how quickly the payment settles, and — if you get it wrong — whether the funds reach a wallet you can actually access.",
  toc: [
    { id: "what-they-are", label: "What TRC20 and ERC20 actually are" },
    { id: "fees-and-speed", label: "Fees, speed and fee tokens" },
    { id: "addresses", label: "Address formats and the 0x problem" },
    { id: "bep20", label: "Where BEP20 fits" },
    { id: "choosing", label: "Choosing per client, not once" },
    { id: "on-the-invoice", label: "What to write on the invoice" },
    { id: "confirming", label: "Confirming that you were paid" },
    { id: "common-mistakes", label: "Common mistakes" },
  ],
  faq: [
    {
      question: "Is TRC20 or ERC20 better for USDT invoices?",
      answer:
        "TRC20 on TRON is cheaper and faster and suits most invoices, which is why it is the common default. ERC20 on Ethereum is the right choice when your client's funds, custody or approval process already live on Ethereum and moving them would mean a bridge.",
    },
    {
      question: "Why do ERC20 and BEP20 addresses look identical?",
      answer:
        "BNB Smart Chain uses the same 0x address format as Ethereum. An address that is valid on one looks equally valid on the other, which is exactly why the network has to be written next to the address rather than inferred from it.",
    },
    {
      question: "Who pays the network fee on a USDT transfer?",
      answer:
        "The sender, in the chain's native token — TRX on TRON, ETH on Ethereum, BNB on BNB Smart Chain. State on your invoice that the amount received must equal the amount due so the fee is not deducted from your payment.",
    },
    {
      question: "What happens if a client sends USDT on the wrong network?",
      answer:
        "The funds arrive at an address on a chain you may not be monitoring or may not control. Recovery ranges from difficult to impossible depending on the wallet and the chains involved. Preventing it by naming the network is far cheaper than resolving it.",
    },
    {
      question: "Can one invoice offer both TRC20 and ERC20?",
      answer:
        "You can show more than one payment method, but keep it deliberate. Two clearly labelled options against one payable amount is workable; a longer list mostly increases the chance of the wrong choice being made.",
    },
    {
      question: "Does the network affect the amount of USDT I receive?",
      answer:
        "Not the invoiced amount — USDT is USDT on every chain. What changes is the fee your client pays to send it, and whether they attempt to deduct that fee from your payment.",
    },
    {
      question: "Does a QR code include the network?",
      answer:
        "No. A QR code encodes an address string only. A scanning wallet cannot tell which chain you intended, so the network must appear as text next to the code.",
    },
  ],
  related: sprint2RelatedArticles("/learn/trc20-vs-erc20-for-usdt-payments"),
};

export function ArticleContent() {
  return (
    <>
      <LearnSection id="what-they-are" title="What TRC20 and ERC20 actually are">
        <Paragraphs
          items={[
            "Both are token standards — sets of rules that let a token like USDT exist on a particular blockchain. ERC20 is the standard on Ethereum; TRC20 is the equivalent on TRON. Tether issues USDT on both, plus several other chains, and the balances are separate: 500 USDT on TRON is not the same balance as 500 USDT on Ethereum.",
            "This matters for invoicing because the asset name on its own is an incomplete instruction. Writing 'USDT' tells your client what to send but not where, and 'where' is the part that determines whether you can spend it afterwards.",
            "Nothing about this is exotic or new. It is closer to specifying which bank account of yours a transfer should reach — except that with a bank, a misdirected transfer is usually recoverable, and with a chain mismatch it often is not.",
          ]}
        />
        <p>
          If crypto invoicing is new to you, the{" "}
          <LearnInlineLink to="/learn/payments">payments guide</LearnInlineLink> covers the basics
          first.
        </p>
      </LearnSection>

      <LearnSection id="fees-and-speed" title="Fees, speed and fee tokens">
        <Paragraphs
          items={[
            "TRON fees are small and stable, paid by the sender in TRX or covered by staked energy. Confirmation is normally under a minute. For a routine invoice this means the network cost is not something either party thinks about, which is precisely what you want in a payment rail.",
            "Ethereum fees are paid in ETH and vary with network demand. They can be trivial or genuinely material, and the sender cannot fully predict them in advance. On a large invoice that variance is irrelevant; on a small one, asking a client to cover Ethereum gas is a real friction you are introducing on their side.",
            "There is a practical consequence people miss: a client can hold USDT on a chain and still be unable to send it, because they have no balance of the chain's fee token. A client with USDT on BNB Smart Chain but no BNB is stuck. Worth a question before you nominate a network they do not normally use.",
          ]}
        />
      </LearnSection>

      <LearnSection id="addresses" title="Address formats and the 0x problem">
        <Paragraphs
          items={[
            "TRON addresses begin with T and are 34 characters. Ethereum addresses begin with 0x and are 42 characters. The difference is obvious enough that a client attempting a TRON address in an Ethereum withdrawal field is usually stopped by their own exchange, which is a small mercy.",
            "The dangerous case is Ethereum against BNB Smart Chain. Both use the identical 0x format, so nothing about the string tells you or your client which chain it belongs to. An address that is correct for your Ethereum wallet looks exactly as correct when pasted into a BNB Smart Chain withdrawal, and the funds land on a chain you may not be watching.",
            "The whole mitigation is textual: write the asset and the network as one phrase, immediately above the address, on the document and on the payment page. 'USDT on Ethereum (ERC20)'. It reads as belt-and-braces right up until the first time it saves someone a five-figure mistake.",
          ]}
        />
      </LearnSection>

      <LearnSection id="bep20" title="Where BEP20 fits">
        <Paragraphs
          items={[
            "BEP20 on BNB Smart Chain sits between the other two: fees are low, though paid in BNB, and support is broad among clients who keep balances on major exchanges and withdraw on whatever chain is offered first.",
            "It is a reasonable third option and a poor default, mainly because of the address collision with Ethereum. If you use it, be disciplined about labelling — spell out BNB Smart Chain rather than abbreviating to BSC, since the person processing the payment may never have seen the abbreviation.",
          ]}
        />
      </LearnSection>

      <LearnSection id="choosing" title="Choosing per client, not once">
        <Paragraphs
          items={[
            "The right question is not which network is best but which network this client can pay from without extra steps. A freelancer's client withdrawing from an exchange will usually take TRC20 happily. A protocol treasury with a multisig on Ethereum cannot use TRON without bridging, adding an approval and adding a line to an audit trail they would rather keep clean.",
            "So ask once per client, save the wallet you can genuinely receive on for that chain, and nominate the matching one on their invoices. Asking is thirty seconds; assuming is the cause of most misdirected stablecoin payments.",
            "Only save wallets you actually control on the chain in question. An address you hold on Ethereum is not usable as an ERC20 receiving address if the wallet behind it was only ever set up for something else — verify before it goes on a document, and send yourself a small test amount the first time you use a new receiving address.",
          ]}
        />
        <p>
          For the invoice-side mechanics, see the{" "}
          <LearnInlineLink to="/learn/invoice-generator">invoice generator guide</LearnInlineLink>.
        </p>
      </LearnSection>

      <LearnSection id="on-the-invoice" title="What to write on the invoice">
        <Paragraphs
          items={[
            "Three lines, in this order. The asset and network together: 'USDT on TRON (TRC20)'. The receiving address in full, never truncated for tidiness — a client who has to ask for the rest of it will paste something wrong. And the amount condition: 'Amount received must equal 3,600.00 USDT — network fees are paid by the sender.'",
            "Everything else on the document is an ordinary invoice. Number, issue and due dates, itemised work, totals, your business details, your tax or trade licence number where it applies. Being paid on-chain is not a reason to keep looser paperwork than a bank-paid client would get.",
            "Where the invoice is denominated in a volatile asset rather than a stablecoin, add one more thing: whether the figure is fixed in crypto units or fixed in fiat value at a stated rate, and how long the payment window runs. USDT removes that problem, which is most of why it dominates crypto invoicing.",
          ]}
        />
      </LearnSection>

      <LearnSection id="confirming" title="Confirming that you were paid">
        <Paragraphs
          items={[
            "Confirmation is your own check, on every chain. You look at the receiving wallet, match the amount and the timing, and then update the invoice status. Tools that produce the document — VegaPal included — do not monitor chains, verify transactions or know that a transfer occurred.",
            "That boundary is worth stating plainly because the alternative would be a claim nobody can honour. A paid status on an invoice means a human decided it was paid.",
            "Keep the transaction hash beside your copy of the invoice. It is the crypto equivalent of a bank reference, and it answers most questions — from a client, an accountant or your future self — before they need to be asked.",
          ]}
        />
      </LearnSection>

      <LearnSection id="common-mistakes" title="Common mistakes">
        <Paragraphs
          items={[
            "Writing 'USDT' with no network. The single most common and most expensive omission in stablecoin invoicing.",
            "Putting a 0x address on a document without saying whether it is Ethereum or BNB Smart Chain.",
            "Defaulting to ERC20 out of habit on small invoices, so the client pays meaningful gas on a modest payment.",
            "Nominating a chain the client holds USDT on but has no fee token for.",
            "Accepting a payment net of the network fee, then treating the shortfall as a partial payment to chase.",
            "Copying an address out of a chat thread rather than from a saved, verified record.",
            "Relying on a QR code to communicate the network, which it cannot do.",
            "Treating a fast confirmation as confirmation you have seen. Check the wallet before changing the status.",
          ]}
        />
      </LearnSection>
    </>
  );
}
