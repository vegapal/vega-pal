import assert from "node:assert/strict";
import {
  mapLegacyStatusToFields,
  syncLegacyStatus,
  defaultPaymentStatusForType,
} from "../src/lib/invoice/document-model.ts";

assert.deepEqual(mapLegacyStatusToFields("draft"), {
  documentStatus: "draft",
  paymentStatus: "unpaid",
});
assert.deepEqual(mapLegacyStatusToFields("pending"), {
  documentStatus: "issued",
  paymentStatus: "unpaid",
});
assert.deepEqual(mapLegacyStatusToFields("paid"), {
  documentStatus: "issued",
  paymentStatus: "paid",
});
assert.deepEqual(mapLegacyStatusToFields("overdue"), {
  documentStatus: "issued",
  paymentStatus: "overdue",
});
assert.deepEqual(mapLegacyStatusToFields("cancelled"), {
  documentStatus: "cancelled",
  paymentStatus: "unpaid",
});

assert.equal(defaultPaymentStatusForType("quotation"), "not_applicable");

assert.equal(
  syncLegacyStatus({
    documentType: "tax_invoice",
    documentStatus: "issued",
    paymentStatus: "paid",
    dueDate: "2099-01-01",
  }),
  "paid",
);

console.log("Invoice document harness: all tests passed");
