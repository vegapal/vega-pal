import { useLayoutEffect, useRef, useState } from "react";
import { InvoiceDocument } from "./InvoiceDocument";
import type { InvoiceDocumentModel } from "./invoice-document.types";
import "./invoice-document.css";

const A4_WIDTH_MM = 210;
const MM_TO_PX = 96 / 25.4;

type Props = {
  model: InvoiceDocumentModel;
  maxWidthPx?: number;
  className?: string;
};

/** Scales the shared A4 invoice for dashboard preview without altering document CSS. */
export function InvoiceDocumentPreviewFrame({ model, maxWidthPx = 520, className }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);

  useLayoutEffect(() => {
    const widthMm = A4_WIDTH_MM;
    const naturalPx = widthMm * MM_TO_PX;
    const next = Math.min(1, maxWidthPx / naturalPx);
    setScale(next);
  }, [maxWidthPx]);

  const widthPx = A4_WIDTH_MM * MM_TO_PX * scale;
  const heightPx = 297 * MM_TO_PX * scale;

  return (
    <div
      ref={hostRef}
      className={["invoice-preview-scale-host", className].filter(Boolean).join(" ")}
      style={{ width: widthPx, minHeight: heightPx }}
    >
      <div
        className="invoice-preview-scaled"
        style={{
          transform: `scale(${scale})`,
          width: `${A4_WIDTH_MM}mm`,
        }}
      >
        <InvoiceDocument model={model} />
      </div>
    </div>
  );
}
