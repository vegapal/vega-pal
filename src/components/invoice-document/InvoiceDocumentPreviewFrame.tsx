import { useLayoutEffect, useRef, useState } from "react";
import { InvoiceDocument } from "./InvoiceDocument";
import type { InvoiceDocumentModel } from "./invoice-document.types";
import "./invoice-document.css";

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const MM_TO_PX = 96 / 25.4;

type Props = {
  model: InvoiceDocumentModel;
  /** Upper bound for scale; actual width follows container (mobile-safe). */
  maxWidthPx?: number;
  className?: string;
};

/** Scales the shared A4 invoice to fit the container width without clipping. */
export function InvoiceDocumentPreviewFrame({ model, maxWidthPx = 520, className }: Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.45);

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const naturalPx = A4_WIDTH_MM * MM_TO_PX;

    const updateScale = () => {
      const containerWidth = host.clientWidth;
      if (containerWidth <= 0) return;
      const budget = Math.min(containerWidth, maxWidthPx);
      setScale(Math.min(1, budget / naturalPx));
    };

    updateScale();

    const ro = new ResizeObserver(updateScale);
    ro.observe(host);
    window.addEventListener("resize", updateScale);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", updateScale);
    };
  }, [maxWidthPx]);

  const widthPx = A4_WIDTH_MM * MM_TO_PX * scale;
  const heightPx = A4_HEIGHT_MM * MM_TO_PX * scale;

  return (
    <div
      ref={hostRef}
      className={["invoice-preview-scale-host w-full max-w-full mx-auto", className]
        .filter(Boolean)
        .join(" ")}
      style={{ width: "100%", maxWidth: maxWidthPx, minHeight: heightPx }}
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
