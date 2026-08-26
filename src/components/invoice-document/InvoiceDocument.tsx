import type { InvoiceDocumentModel } from "./invoice-document.types";

type Props = {
  model: InvoiceDocumentModel;
  className?: string;
};

export function InvoiceDocument({ model, className }: Props) {
  return (
    <div
      className={["invoice-document-root", className].filter(Boolean).join(" ")}
      lang={model.locale}
      dir={model.dir}
    >
      <div className="invoice-page">
        <div className="invoice-page-content">
          <header className="invoice-header">
            <div className="invoice-seller-block">
              {model.sellerLines.length > 0 ? (
                <>
                  <p className="invoice-seller-name">{model.sellerLines[0]!.text}</p>
                  {model.sellerLines.slice(1).map((line) => (
                    <p key={line.text} className="invoice-seller-line">
                      {line.text}
                    </p>
                  ))}
                </>
              ) : null}
            </div>
            <div className="invoice-doc-side">
              <h1 className="invoice-doc-title">{model.documentTitle}</h1>
              <p className="invoice-doc-number">{model.documentNumber}</p>
              <p className="invoice-doc-meta">
                {model.issueDateLabel}: <strong>{model.issueDate}</strong>
              </p>
              {model.dueDateLabel && model.dueDate ? (
                <p className="invoice-doc-meta">
                  {model.dueDateLabel}: <strong>{model.dueDate}</strong>
                </p>
              ) : null}
            </div>
          </header>

          {model.showClient ? (
            <section className="invoice-client">
              <p className="invoice-client-label">Bill to</p>
              {model.clientLines.map((line, index) => (
                <p
                  key={`${line.text}-${index}`}
                  className={[
                    "invoice-client-line",
                    index === 0 && !line.muted ? "invoice-client-name" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  style={
                    index === 0 && !line.muted ? { fontSize: "14pt", fontWeight: 700 } : undefined
                  }
                >
                  {line.text}
                </p>
              ))}
              {model.metaFields.length > 0 ? (
                <div className="invoice-meta-grid">
                  {model.metaFields.map((f) => (
                    <p key={f.label}>
                      {f.label}: <strong>{f.value}</strong>
                    </p>
                  ))}
                </div>
              ) : null}
            </section>
          ) : null}

          {model.subject ? <h2 className="invoice-subject">{model.subject}</h2> : null}

          <div className="invoice-table-wrap">
            <table className="invoice-table">
              <thead>
                <tr>
                  <th className="col-desc">Description</th>
                  <th className="col-qty">Qty</th>
                  <th className="col-money">
                    <span className="invoice-th-stack">
                      <span>Unit price</span>
                      <span>({model.currency})</span>
                    </span>
                  </th>
                  <th className="col-money">
                    <span className="invoice-th-stack">
                      <span>Amount</span>
                      <span>({model.currency})</span>
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {model.items.map((row, i) => (
                  <tr key={`${i}-${row.description.slice(0, 24)}`}>
                    <td className="col-desc">{row.description}</td>
                    <td className="col-qty">{row.quantity}</td>
                    <td className="col-money">{row.unitPrice}</td>
                    <td className="col-money">{row.amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <section className="invoice-totals">
            {model.totals.map((row) => (
              <div key={row.label} className="invoice-totals-row">
                <span>{row.label}</span>
                <span>{row.value}</span>
              </div>
            ))}
            <div className="invoice-totals-grand">
              <span className="invoice-totals-grand-label">{model.finalTotalLabel}</span>
              <span className="invoice-totals-grand-amount">{model.finalTotalAmount}</span>
            </div>
          </section>

          {model.showNotes ? (
            <section className="invoice-notes">
              <h3 className="invoice-notes-heading">NOTES</h3>
              <ul className="invoice-notes-list">
                {model.noteBullets.map((bullet) => (
                  <li
                    key={bullet}
                    className="invoice-notes-item"
                    style={{ whiteSpace: "pre-line" }}
                  >
                    {bullet}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {model.payment.show ? (
            <section className="invoice-payment-section">
              <h3
                className={[
                  "invoice-payment-heading",
                  model.payment.centerTitle ? "is-centered" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                PAYMENT DETAILS
              </h3>
              {model.payment.bank ? <BankCard bank={model.payment.bank} /> : null}
              {model.payment.crypto ? <CryptoCard crypto={model.payment.crypto} /> : null}
              {model.payment.cash ? <CashCard cash={model.payment.cash} /> : null}
            </section>
          ) : null}
        </div>
        <footer className="invoice-page-footer">
          <div className="invoice-page-footer-left">
            <span className="invoice-powered">
              <img src="/brand/mark-primary.png" alt="" width={14} height={14} />
              Created with VegaPal
            </span>
            <span>vega-pal.com</span>
          </div>
          <span className="invoice-page-footer-right">Page 1 of 1</span>
        </footer>
      </div>
    </div>
  );
}

function BankCard({ bank }: { bank: NonNullable<InvoiceDocumentModel["payment"]["bank"]> }) {
  return (
    <div className="payment-card">
      <p className="payment-card-title">{bank.title}</p>
      {bank.rows.map((row) => (
        <div key={row.label} className="payment-bank-row">
          <span className="payment-bank-label">{row.label}</span>
          <span
            className={["payment-bank-value", row.highlight ? "is-ref" : ""]
              .filter(Boolean)
              .join(" ")}
          >
            {row.value}
          </span>
        </div>
      ))}
      {bank.instructions ? (
        <div className="payment-bank-row">
          <span className="payment-bank-label">Instructions</span>
          <span className="payment-bank-value">{bank.instructions}</span>
        </div>
      ) : null}
    </div>
  );
}

function CryptoCard({
  crypto,
}: {
  crypto: NonNullable<InvoiceDocumentModel["payment"]["crypto"]>;
}) {
  return (
    <div className="payment-card">
      <p className="payment-card-title">Cryptocurrency</p>
      <div className="payment-main">
        <div>
          <div className="payment-meta-row">
            <span className="payment-meta-label">Asset</span>
            <span>{crypto.asset}</span>
          </div>
          <div className="payment-meta-row">
            <span className="payment-meta-label">Network</span>
            <span>{crypto.network}</span>
          </div>
          <div className="payment-meta-row">
            <span className="payment-meta-label">Amount due</span>
            <span>{crypto.amountDue}</span>
          </div>
          <div className="payment-meta-row">
            <span className="payment-meta-label">Payment reference</span>
            <span className="payment-bank-value is-ref">{crypto.paymentReference}</span>
          </div>
        </div>
        <div className="payment-qr-col">
          {crypto.qrDataUrl ? (
            <img className="payment-qr" src={crypto.qrDataUrl} alt="" width={113} height={113} />
          ) : (
            <div className="payment-qr" aria-hidden />
          )}
          <p className="payment-qr-caption">{crypto.caption}</p>
        </div>
      </div>
      <div className="payment-wallet">
        <p className="payment-wallet-label">Wallet address</p>
        <p className="payment-wallet-value">{crypto.walletAddress}</p>
      </div>
    </div>
  );
}

function CashCard({ cash }: { cash: NonNullable<InvoiceDocumentModel["payment"]["cash"]> }) {
  return (
    <div className="payment-card">
      <p className="payment-card-title">Cash payment</p>
      <div className="payment-meta-row">
        <span className="payment-meta-label">Amount</span>
        <span>{cash.amountDue}</span>
      </div>
      {cash.instructions ? (
        <div className="payment-meta-row">
          <span className="payment-meta-label">Instructions</span>
          <span>{cash.instructions}</span>
        </div>
      ) : null}
      {cash.location ? (
        <div className="payment-meta-row">
          <span className="payment-meta-label">Location</span>
          <span>{cash.location}</span>
        </div>
      ) : null}
    </div>
  );
}
