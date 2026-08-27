import type { ComponentType } from "react";
import { CryptoPaymentQrGenerator } from "@/components/tools/CryptoPaymentQrGenerator";
import { DiscountCalculator } from "@/components/tools/DiscountCalculator";
import { DueDateCalculator } from "@/components/tools/DueDateCalculator";
import { InvoiceNumberGenerator } from "@/components/tools/InvoiceNumberGenerator";
import { LateFeeCalculator } from "@/components/tools/LateFeeCalculator";
import { PaymentTermsGenerator } from "@/components/tools/PaymentTermsGenerator";
import { UsdtAedConverter } from "@/components/tools/UsdtAedConverter";
import { VatCalculator } from "@/components/tools/VatCalculator";
import type { ToolSlug } from "@/lib/seo/tools-registry";

/** Interactive widget for each registered tool slug. */
export const TOOL_COMPONENTS: Record<ToolSlug, ComponentType> = {
  "due-date-calculator": DueDateCalculator,
  "discount-calculator": DiscountCalculator,
  "vat-calculator": VatCalculator,
  "invoice-number-generator": InvoiceNumberGenerator,
  "payment-terms-generator": PaymentTermsGenerator,
  "late-fee-calculator": LateFeeCalculator,
  "crypto-payment-qr-generator": CryptoPaymentQrGenerator,
  "usdt-aed-converter": UsdtAedConverter,
};
