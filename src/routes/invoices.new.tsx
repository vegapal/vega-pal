import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { invoiceCreateSchema, firstZodError } from "@/lib/validation/schemas";
import { checkClientRateLimit } from "@/lib/client-rate-limit";
import { formatAppError } from "@/lib/auth/errors";
import {
  isAtFreePlanInvoiceLimit,
} from "@/lib/plan/invoice-limit";
import { useSubmitGuard } from "@/hooks/use-submit-guard";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { FormError } from "@/components/ui/form-error";
import { Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  CRYPTO_CURRENCY_OPTIONS,
  CRYPTO_PAYMENT_CURRENCIES,
  DEFAULT_DISPLAY_OPTIONS,
  DEFAULT_INVOICE_CURRENCY,
  FIAT_CURRENCY_OPTIONS,
  INVOICE_CURRENCIES,
  PAYMENT_NETWORKS,
  type InvoiceCurrency,
  buildDefaultPaymentMethods,
  type BankPaymentConfig,
  type CashPaymentConfig,
  type CryptoPaymentConfig,
  type DisplayOptions,
  type PaymentMethodType,
  type PaymentMethodsConfig,
} from "@/lib/invoice-constants";
import {
  useSession,
  useInvoice,
  invoices,
  notifyInvoices,
  getInvoicePlanUsage,
  type InvoiceItem,
  type InvoiceStatus,
  type InvoicePlanUsage,
} from "@/lib/vegapal-store";
import { ArrowLeft, Banknote, Building2, Coins, Layers, Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ensureNamespacesLoaded } from "@/lib/i18n/load-namespace";

export const Route = createFileRoute("/invoices/new")({
  beforeLoad: () => ensureNamespacesLoaded(["invoices"]),
  head: () => ({
    meta: [{ title: "Create invoice — VegaPal" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: () => (
    <AppShell>
      <CreateInvoice />
    </AppShell>
  ),
});

const INVOICE_STATUSES: InvoiceStatus[] = ["draft", "pending", "paid", "overdue", "cancelled"];

const PRIMARY_PAYMENT_METHOD_VALUES: {
  value: Exclude<PaymentMethodType, "multiple">;
  icon: typeof Banknote;
}[] = [
  { value: "cash", icon: Banknote },
  { value: "bank_transfer", icon: Building2 },
  { value: "crypto", icon: Coins },
];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(base: string, n: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function fmtAmount(n: number, currency: string) {
  const maxDecimals = currency === "BTC" || currency === "ETH" ? 8 : 2;
  return `${n.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: maxDecimals,
  })} ${currency}`;
}

function buildPaymentMethodsForSave(
  method: PaymentMethodType,
  crypto: CryptoPaymentConfig,
  bank: BankPaymentConfig,
  cash: CashPaymentConfig,
): PaymentMethodsConfig {
  if (method === "crypto") {
    return {
      method: "crypto",
      crypto: { ...crypto, enabled: true },
      bank: { ...bank, enabled: false },
      cash: { ...cash, enabled: false },
    };
  }
  if (method === "bank_transfer") {
    return {
      method: "bank_transfer",
      crypto: { ...crypto, enabled: false },
      bank: { ...bank, enabled: true },
      cash: { ...cash, enabled: false },
    };
  }
  if (method === "cash") {
    return {
      method: "cash",
      crypto: { ...crypto, enabled: false },
      bank: { ...bank, enabled: false },
      cash: { ...cash, enabled: true },
    };
  }
  return {
    method: "multiple",
    crypto: { ...crypto, enabled: crypto.enabled },
    bank: { ...bank, enabled: bank.enabled },
    cash: { ...cash, enabled: cash.enabled },
  };
}

function showCryptoFields(method: PaymentMethodType, crypto: CryptoPaymentConfig) {
  return method === "crypto" || (method === "multiple" && crypto.enabled);
}

function showBankFields(method: PaymentMethodType, bank: BankPaymentConfig) {
  return method === "bank_transfer" || (method === "multiple" && bank.enabled);
}

function showCashFields(method: PaymentMethodType, cash: CashPaymentConfig) {
  return method === "cash" || (method === "multiple" && cash.enabled);
}

function CreateInvoice() {
  const navigate = useNavigate();
  const { t } = useTranslation("invoices");
  const { t: tc } = useTranslation("common");
  const { user } = useSession();

  const primaryPaymentMethods = useMemo(
    () =>
      PRIMARY_PAYMENT_METHOD_VALUES.map((opt) => ({
        ...opt,
        label:
          opt.value === "cash"
            ? t("create.paymentMethods.cash")
            : opt.value === "bank_transfer"
              ? t("create.paymentMethods.bankTransfer")
              : t("create.paymentMethods.crypto"),
        description:
          opt.value === "cash"
            ? t("create.paymentMethods.cashDesc")
            : opt.value === "bank_transfer"
              ? t("create.paymentMethods.bankDesc")
              : t("create.paymentMethods.cryptoDesc"),
      })),
    [t],
  );
  const search = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
  const editId = search.get("edit");
  const { data: existing, loading: loadingExisting } = useInvoice(editId ?? undefined);

  const [invoiceCurrency, setInvoiceCurrency] = useState(DEFAULT_INVOICE_CURRENCY);
  const [poNumber, setPoNumber] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");
  const [projectCode, setProjectCode] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientCompany, setClientCompany] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [termsAndConditions, setTermsAndConditions] = useState("");
  const [status, setStatus] = useState<InvoiceStatus>("pending");
  const [issueDate, setIssueDate] = useState(todayISO());
  const [dueDate, setDueDate] = useState(addDays(todayISO(), 14));
  const [items, setItems] = useState<InvoiceItem[]>([
    { description: "", quantity: 1, unitPrice: 0, total: 0 },
  ]);
  const [discount, setDiscount] = useState("");
  const [tax, setTax] = useState("");
  const [displayOptions, setDisplayOptions] = useState<DisplayOptions>({
    ...DEFAULT_DISPLAY_OPTIONS,
  });
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>("crypto");
  const [crypto, setCrypto] = useState<CryptoPaymentConfig>({
    enabled: true,
    currency: "USDT",
    network: "TRON TRC20",
    walletAddress: "",
  });
  const [bank, setBank] = useState<BankPaymentConfig>({ enabled: false });
  const [cash, setCash] = useState<CashPaymentConfig>({ enabled: false });
  const [hydrated, setHydrated] = useState(false);
  const [profilePaymentInitialized, setProfilePaymentInitialized] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [planUsage, setPlanUsage] = useState<InvoicePlanUsage | null>(null);
  const formErrorRef = useRef<HTMLDivElement>(null);
  const submitGuard = useSubmitGuard();

  useEffect(() => {
    if (editId) return;
    void getInvoicePlanUsage().then(setPlanUsage);
  }, [editId]);

  const atInvoiceLimit = !editId && planUsage !== null && isAtFreePlanInvoiceLimit(planUsage);

  useEffect(() => {
    if (formError && formErrorRef.current) {
      formErrorRef.current.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }
  }, [formError]);

  useEffect(() => {
    if (editId || !user || profilePaymentInitialized) return;
    const defaults = buildDefaultPaymentMethods(user.wallet ?? "", user.network);
    setCrypto(defaults.crypto);
    setBank(defaults.bank);
    setCash(defaults.cash);
    setPaymentMethod(defaults.method);
    setProfilePaymentInitialized(true);
  }, [user, editId, profilePaymentInitialized]);

  useEffect(() => {
    if (!editId) {
      setHydrated(true);
      return;
    }
    if (existing && !hydrated) {
      setInvoiceCurrency(
        (INVOICE_CURRENCIES as readonly string[]).includes(existing.invoiceCurrency)
          ? (existing.invoiceCurrency as InvoiceCurrency)
          : DEFAULT_INVOICE_CURRENCY,
      );
      setPoNumber(existing.poNumber ?? "");
      setReferenceNumber(existing.referenceNumber ?? "");
      setProjectCode(existing.projectCode ?? "");
      setClientName(existing.clientName);
      setClientEmail(existing.clientEmail);
      setClientCompany(existing.clientCompany ?? "");
      setTitle(existing.title);
      setDescription(existing.description);
      setTermsAndConditions(existing.termsAndConditions);
      setStatus(existing.status === "overdue" ? "pending" : existing.status);
      setIssueDate(existing.issueDate);
      setDueDate(existing.dueDate);
      setItems(
        existing.items.length > 0
          ? existing.items
          : [{ description: "", quantity: 1, unitPrice: 0, total: 0 }],
      );
      setDiscount(String(existing.discount || ""));
      setTax(String(existing.tax || ""));
      setDisplayOptions({ ...existing.displayOptions });
      setPaymentMethod(existing.paymentMethods.method);
      setCrypto({ ...existing.paymentMethods.crypto });
      setBank({ ...existing.paymentMethods.bank });
      setCash({ ...existing.paymentMethods.cash });
      setHydrated(true);
    }
  }, [editId, existing, hydrated]);

  useEffect(() => {
    if (editId && !loadingExisting && !existing) navigate({ to: "/invoices" });
  }, [editId, loadingExisting, existing, navigate]);

  const setDisplay = (key: keyof DisplayOptions, value: boolean) => {
    setDisplayOptions((prev) => ({ ...prev, [key]: value }));
  };

  const onPaymentMethodChange = (method: PaymentMethodType) => {
    setPaymentMethod(method);
    if (method === "crypto") {
      setCrypto((c) => ({ ...c, enabled: true }));
      setBank((b) => ({ ...b, enabled: false }));
      setCash((c) => ({ ...c, enabled: false }));
    } else if (method === "bank_transfer") {
      setCrypto((c) => ({ ...c, enabled: false }));
      setBank((b) => ({ ...b, enabled: true }));
      setCash((c) => ({ ...c, enabled: false }));
    } else if (method === "cash") {
      setCrypto((c) => ({ ...c, enabled: false }));
      setBank((b) => ({ ...b, enabled: false }));
      setCash((c) => ({ ...c, enabled: true }));
    }
  };

  const updateItem = (idx: number, patch: Partial<InvoiceItem>) => {
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== idx) return it;
        const next = { ...it, ...patch };
        next.total = (Number(next.quantity) || 0) * (Number(next.unitPrice) || 0);
        return next;
      }),
    );
  };

  const addItem = () =>
    setItems((p) => [...p, { description: "", quantity: 1, unitPrice: 0, total: 0 }]);

  const removeItem = (idx: number) =>
    setItems((p) => (p.length === 1 ? p : p.filter((_, i) => i !== idx)));

  const subtotal = items.reduce(
    (s, i) => s + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0),
    0,
  );
  const dnum = parseFloat(discount) || 0;
  const tnum = parseFloat(tax) || 0;
  const total = Math.max(0, subtotal - dnum + tnum);

  const paymentMethodsPayload = buildPaymentMethodsForSave(paymentMethod, crypto, bank, cash);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submitGuard.begin()) return;
    setFormError("");

    const cleanItems = items
      .filter((i) => i.description.trim() && (Number(i.quantity) || 0) > 0)
      .map((i) => {
        const quantity = Number(i.quantity) || 0;
        const unitPrice = Number(i.unitPrice) || 0;
        return {
          description: i.description.trim(),
          quantity,
          unitPrice,
          total: quantity * unitPrice,
        };
      });

    const parsed = invoiceCreateSchema.safeParse({
      title,
      clientName,
      clientEmail,
      clientCompany,
      description,
      termsAndConditions,
      discount: dnum,
      tax: tnum,
      items: cleanItems,
      cryptoWallet: crypto.walletAddress,
    });
    if (!parsed.success) {
      setFormError(firstZodError(parsed.error));
      submitGuard.end();
      return;
    }

    if (!editId) {
      const rate = checkClientRateLimit("create-invoice", 20, 60 * 60_000);
      if (!rate.allowed) {
        setFormError(tc("errors.rateLimitCreate", { seconds: rate.retryAfterSec }));
        submitGuard.end();
        return;
      }
      if (atInvoiceLimit) {
        setFormError(tc("plan.limitReached"));
        submitGuard.end();
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        clientName: parsed.data.clientName,
        clientEmail: parsed.data.clientEmail,
        clientCompany: parsed.data.clientCompany,
        title: parsed.data.title,
        description: parsed.data.description ?? "",
        termsAndConditions: parsed.data.termsAndConditions ?? "",
        issueDate,
        dueDate,
        status,
        items: cleanItems,
        discount: parsed.data.discount,
        tax: parsed.data.tax,
        invoiceCurrency,
        poNumber: poNumber.trim() || undefined,
        referenceNumber: referenceNumber.trim() || undefined,
        projectCode: projectCode.trim() || undefined,
        displayOptions,
        paymentMethods: paymentMethodsPayload,
      };

      if (editId && existing) {
        await invoices.update(existing.id, payload);
        notifyInvoices();
        navigate({ to: "/invoices/$id", params: { id: existing.id } });
      } else {
        const inv = await invoices.create(payload);
        notifyInvoices();
        navigate({ to: "/invoices/$id", params: { id: inv.id } });
      }
    } catch (err) {
      setFormError(formatAppError(err));
    } finally {
      setSaving(false);
      submitGuard.end();
    }
  };

  if (editId && loadingExisting) {
    return (
      <div
        className="flex items-center justify-center gap-2 p-16 text-sm text-muted-foreground"
        role="status"
      >
        <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
        {t("create.loading")}
      </div>
    );
  }

  const cryptoVisible = showCryptoFields(paymentMethod, crypto);
  const bankVisible = showBankFields(paymentMethod, bank);
  const cashVisible = showCashFields(paymentMethod, cash);

  return (
    <div className="box-border mx-auto w-full min-w-0 max-w-6xl overflow-x-hidden px-4 sm:px-6 lg:px-10 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] lg:pb-10">
      <Link
        to="/invoices"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="h-4 w-4" /> {t("create.backToInvoices")}
      </Link>
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
        {editId ? t("create.editTitle") : t("create.createTitle")}
      </h1>
      <p className="text-muted-foreground mt-1">{t("create.subtitle")}</p>

      {!editId && planUsage ? (
        <div className="mt-4 rounded-xl border border-border bg-muted/20 px-4 py-3">
          <p className="text-sm text-muted-foreground">
            {planUsage.monthlyLimit === null
              ? tc("plan.usageUnlimited")
              : tc("plan.usageFree", {
                  used: planUsage.invoicesThisMonth,
                  limit: planUsage.monthlyLimit,
                })}
          </p>
          {atInvoiceLimit ? (
            <div className="mt-3 space-y-3">
              <p className="text-sm leading-relaxed">{tc("plan.limitReached")}</p>
              <Button asChild size="sm" variant="hero">
                <Link to="/pricing">{tc("plan.upgradePlan")}</Link>
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      <form
        onSubmit={submit}
        className="mt-8 grid w-full min-w-0 max-w-full grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]"
      >
        <div className="min-w-0 max-w-full space-y-6">
          <Section title={t("create.sections.invoiceDetails")}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field label={t("create.fields.invoiceCurrency")}>
                <Select
                  value={invoiceCurrency}
                  onValueChange={(v) => setInvoiceCurrency(v as InvoiceCurrency)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      <SelectLabel>{t("create.fields.fiatCurrencies")}</SelectLabel>
                      {FIAT_CURRENCY_OPTIONS.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.code}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                    <SelectGroup>
                      <SelectLabel>{t("create.fields.cryptoCurrencies")}</SelectLabel>
                      {CRYPTO_CURRENCY_OPTIONS.map((c) => (
                        <SelectItem key={c.code} value={c.code}>
                          {c.code}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field
                label={tc("labels.status")}
                showToggle={{
                  id: "showStatus",
                  checked: displayOptions.showStatus,
                  onChange: (v) => setDisplay("showStatus", v),
                }}
              >
                <Select value={status} onValueChange={(v) => setStatus(v as InvoiceStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INVOICE_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {tc(`status.${s}`)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label={t("create.fields.invoiceTitle")} full>
                <Input
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t("create.fields.invoiceTitlePlaceholder")}
                />
              </Field>
              <Field label={t("create.fields.issueDate")}>
                <Input
                  type="date"
                  required
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                />
              </Field>
              <Field
                label={tc("labels.dueDate")}
                showToggle={{
                  id: "showDueDate",
                  checked: displayOptions.showDueDate,
                  onChange: (v) => setDisplay("showDueDate", v),
                }}
              >
                <Input
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </Field>
              <Field
                label={t("create.fields.poNumber")}
                showToggle={{
                  id: "showPoNumber",
                  checked: displayOptions.showPoNumber,
                  onChange: (v) => setDisplay("showPoNumber", v),
                }}
              >
                <Input
                  value={poNumber}
                  onChange={(e) => setPoNumber(e.target.value)}
                  placeholder={t("create.fields.optionalPlaceholder")}
                />
              </Field>
              <Field
                label={t("create.fields.referenceNumber")}
                showToggle={{
                  id: "showReferenceNumber",
                  checked: displayOptions.showReferenceNumber,
                  onChange: (v) => setDisplay("showReferenceNumber", v),
                }}
              >
                <Input
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  placeholder={t("create.fields.optionalPlaceholder")}
                />
              </Field>
              <Field
                label={t("create.fields.projectCode")}
                full
                showToggle={{
                  id: "showProjectCode",
                  checked: displayOptions.showProjectCode,
                  onChange: (v) => setDisplay("showProjectCode", v),
                }}
              >
                <Input
                  value={projectCode}
                  onChange={(e) => setProjectCode(e.target.value)}
                  placeholder={t("create.fields.optionalPlaceholder")}
                />
              </Field>
            </div>
          </Section>

          <Section title={t("create.sections.sellerClient")}>
            <div className="space-y-6">
              <div>
                <div className="mb-2 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider min-w-0">
                    {t("create.fields.sellerFromProfile")}
                  </p>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2 max-w-full">
                    <ShowToggle
                      id="showVegapalLogo"
                      label={tc("labels.logo")}
                      checked={displayOptions.showVegapalLogo}
                      onChange={(v) => setDisplay("showVegapalLogo", v)}
                    />
                    <ShowToggle
                      id="showSellerInfo"
                      label={tc("labels.seller")}
                      checked={displayOptions.showSellerInfo}
                      onChange={(v) => setDisplay("showSellerInfo", v)}
                    />
                  </div>
                </div>
                <div className="text-sm rounded-lg border border-border bg-muted/30 p-4">
                  <p className="font-semibold">{user?.business || user?.name}</p>
                  <p className="text-muted-foreground">{user?.contactEmail || user?.email}</p>
                  {user?.companyAddress && (
                    <p className="text-muted-foreground whitespace-pre-line mt-1">
                      {user.companyAddress}
                    </p>
                  )}
                  <Link
                    to="/settings"
                    className="text-xs text-primary hover:underline mt-2 inline-block"
                  >
                    {t("create.fields.editCompanyInfo")}
                  </Link>
                </div>
              </div>
              <div>
                <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider min-w-0">
                    {t("create.fields.clientInfo")}
                  </p>
                  <ShowToggle
                    id="showClientInfo"
                    label={tc("labels.client")}
                    checked={displayOptions.showClientInfo}
                    onChange={(v) => setDisplay("showClientInfo", v)}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <Field label={t("create.fields.clientName")}>
                    <Input
                      required
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder={t("create.fields.clientNamePlaceholder")}
                    />
                  </Field>
                  <Field label={t("create.fields.clientEmail")}>
                    <Input
                      type="email"
                      required
                      value={clientEmail}
                      onChange={(e) => setClientEmail(e.target.value)}
                      placeholder={t("create.fields.clientEmailPlaceholder")}
                    />
                  </Field>
                  <Field label={t("create.fields.companyOptional")} full>
                    <Input
                      value={clientCompany}
                      onChange={(e) => setClientCompany(e.target.value)}
                      placeholder={t("create.fields.companyPlaceholder")}
                    />
                  </Field>
                </div>
              </div>
            </div>
          </Section>

          <Section title={t("create.sections.lineItems")}>
            <div className="min-w-0 max-w-full space-y-3">
              <div className="hidden md:grid grid-cols-[minmax(0,1fr)_80px_120px_120px_32px] gap-3 text-xs uppercase tracking-wider text-muted-foreground px-1">
                <span>{tc("labels.description")}</span>
                <span className="text-right">{tc("labels.qty")}</span>
                <span className="text-right">{tc("labels.unitPrice")}</span>
                <span className="text-right">{tc("labels.total")}</span>
                <span />
              </div>
              {items.map((it, idx) => (
                <div key={idx} className="min-w-0 max-w-full">
                  <div className="md:hidden rounded-lg border border-border bg-muted/20 p-3 space-y-3 min-w-0 max-w-full">
                    <div className="space-y-1.5 min-w-0">
                      <Label className="text-xs text-muted-foreground">
                        {tc("labels.description")}
                      </Label>
                      <Input
                        value={it.description}
                        onChange={(e) => updateItem(idx, { description: e.target.value })}
                        placeholder={t("create.fields.itemDescriptionPlaceholder")}
                        required
                        className="w-full min-w-0 max-w-full"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3 min-w-0">
                      <div className="min-w-0 space-y-1.5">
                        <Label className="text-xs text-muted-foreground">{tc("labels.qty")}</Label>
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          value={it.quantity}
                          onChange={(e) =>
                            updateItem(idx, { quantity: parseFloat(e.target.value) || 0 })
                          }
                          className="w-full min-w-0 max-w-full text-right tabular-nums"
                        />
                      </div>
                      <div className="min-w-0 space-y-1.5">
                        <Label className="text-xs text-muted-foreground">
                          {tc("labels.unitPrice")}
                        </Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={it.unitPrice}
                          onChange={(e) =>
                            updateItem(idx, { unitPrice: parseFloat(e.target.value) || 0 })
                          }
                          className="w-full min-w-0 max-w-full text-right tabular-nums"
                        />
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-2 min-w-0">
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground">{tc("labels.total")}</p>
                        <p className="font-medium tabular-nums text-sm break-all">
                          {fmtAmount(it.total, invoiceCurrency)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        className="shrink-0 text-muted-foreground hover:text-destructive disabled:opacity-30 p-2"
                        disabled={items.length === 1}
                        aria-label={t("create.fields.removeItem")}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <div className="hidden md:grid grid-cols-[minmax(0,1fr)_80px_120px_120px_32px] gap-3 items-center min-w-0">
                    <Input
                      value={it.description}
                      onChange={(e) => updateItem(idx, { description: e.target.value })}
                      placeholder={t("create.fields.itemDescriptionPlaceholder")}
                      required
                      className="min-w-0"
                    />
                    <Input
                      type="number"
                      min="0"
                      step="1"
                      value={it.quantity}
                      onChange={(e) =>
                        updateItem(idx, { quantity: parseFloat(e.target.value) || 0 })
                      }
                      className="min-w-0 text-right tabular-nums"
                    />
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={it.unitPrice}
                      onChange={(e) =>
                        updateItem(idx, { unitPrice: parseFloat(e.target.value) || 0 })
                      }
                      className="min-w-0 text-right tabular-nums"
                    />
                    <div className="min-w-0 text-right font-medium tabular-nums text-sm truncate">
                      {fmtAmount(it.total, invoiceCurrency)}
                    </div>
                    <button
                      type="button"
                      onClick={() => removeItem(idx)}
                      className="text-muted-foreground hover:text-destructive disabled:opacity-30"
                      disabled={items.length === 1}
                      aria-label={t("create.fields.removeItem")}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="h-4 w-4" /> {tc("buttons.addLineItem")}
              </Button>
            </div>
          </Section>

          <Section title={t("create.sections.totals")}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <Field
                label={t("create.fields.discountLabel", { currency: invoiceCurrency })}
                showToggle={{
                  id: "showDiscount",
                  checked: displayOptions.showDiscount,
                  onChange: (v) => setDisplay("showDiscount", v),
                }}
              >
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  placeholder="0"
                />
              </Field>
              <Field
                label={t("create.fields.taxLabel", { currency: invoiceCurrency })}
                showToggle={{
                  id: "showTax",
                  checked: displayOptions.showTax,
                  onChange: (v) => setDisplay("showTax", v),
                }}
              >
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={tax}
                  onChange={(e) => setTax(e.target.value)}
                  placeholder="0"
                />
              </Field>
            </div>
          </Section>

          <Section
            title={t("create.sections.paymentMethod")}
            action={
              <ShowToggle
                id="showPaymentInstructions"
                label={t("create.fields.paymentInstructions")}
                checked={displayOptions.showPaymentInstructions}
                onChange={(v) => setDisplay("showPaymentInstructions", v)}
              />
            }
          >
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {primaryPaymentMethods.map((opt) => (
                  <PaymentMethodCard
                    key={opt.value}
                    label={opt.label}
                    description={opt.description}
                    icon={opt.icon}
                    selected={paymentMethod === opt.value}
                    onClick={() => onPaymentMethodChange(opt.value)}
                  />
                ))}
              </div>

              <PaymentMethodCard
                label={t("create.paymentMethods.multiple")}
                description={t("create.paymentMethods.multipleDesc")}
                icon={Layers}
                selected={paymentMethod === "multiple"}
                onClick={() => onPaymentMethodChange("multiple")}
                fullWidth
              />

              {paymentMethod === "multiple" && (
                <div className="space-y-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    {t("create.paymentMethods.enableMethods")}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {primaryPaymentMethods.map((opt) => {
                      const enabled =
                        opt.value === "cash"
                          ? cash.enabled
                          : opt.value === "bank_transfer"
                            ? bank.enabled
                            : crypto.enabled;
                      const toggle = () => {
                        if (opt.value === "cash") {
                          setCash((c) => ({ ...c, enabled: !c.enabled }));
                        } else if (opt.value === "bank_transfer") {
                          setBank((b) => ({ ...b, enabled: !b.enabled }));
                        } else {
                          setCrypto((c) => ({ ...c, enabled: !c.enabled }));
                        }
                      };
                      return (
                        <PaymentMethodCard
                          key={opt.value}
                          label={opt.label}
                          description={
                            enabled
                              ? t("create.paymentMethods.shownOnInvoice")
                              : t("create.paymentMethods.tapToEnable")
                          }
                          icon={opt.icon}
                          selected={enabled}
                          onClick={toggle}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {cryptoVisible && (
                <div className="rounded-lg border border-border p-4 space-y-4">
                  <p className="text-sm font-medium">{t("create.paymentMethods.cryptoPayment")}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label={t("create.paymentMethods.cryptoCurrency")}>
                      <Select
                        value={crypto.currency}
                        onValueChange={(v) => setCrypto((c) => ({ ...c, currency: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CRYPTO_PAYMENT_CURRENCIES.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label={tc("labels.network")}>
                      <Select
                        value={crypto.network}
                        onValueChange={(v) => setCrypto((c) => ({ ...c, network: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {PAYMENT_NETWORKS.map((n) => (
                            <SelectItem key={n} value={n}>
                              {n}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label={tc("labels.walletAddress")} full>
                      <Input
                        value={crypto.walletAddress}
                        onChange={(e) =>
                          setCrypto((c) => ({ ...c, walletAddress: e.target.value }))
                        }
                        placeholder={t("create.paymentMethods.walletPlaceholder")}
                        className="font-mono text-sm"
                      />
                    </Field>
                  </div>
                </div>
              )}

              {bankVisible && (
                <div className="rounded-lg border border-border p-4 space-y-4">
                  <p className="text-sm font-medium">
                    {t("create.paymentMethods.bankTransferTitle")}
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Field label={tc("labels.bankName")}>
                      <Input
                        value={bank.bankName ?? ""}
                        onChange={(e) => setBank((b) => ({ ...b, bankName: e.target.value }))}
                      />
                    </Field>
                    <Field label={tc("labels.accountName")}>
                      <Input
                        value={bank.accountName ?? ""}
                        onChange={(e) => setBank((b) => ({ ...b, accountName: e.target.value }))}
                      />
                    </Field>
                    <Field label={tc("labels.accountNumber")}>
                      <Input
                        value={bank.accountNumber ?? ""}
                        onChange={(e) => setBank((b) => ({ ...b, accountNumber: e.target.value }))}
                      />
                    </Field>
                    <Field label={tc("labels.iban")}>
                      <Input
                        value={bank.iban ?? ""}
                        onChange={(e) => setBank((b) => ({ ...b, iban: e.target.value }))}
                      />
                    </Field>
                    <Field label={tc("labels.swift")}>
                      <Input
                        value={bank.swift ?? ""}
                        onChange={(e) => setBank((b) => ({ ...b, swift: e.target.value }))}
                      />
                    </Field>
                    <Field label={tc("labels.bankCurrency")}>
                      <Select
                        value={bank.currency ?? ""}
                        onValueChange={(v) => setBank((b) => ({ ...b, currency: v }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={tc("labels.selectCurrency")} />
                        </SelectTrigger>
                        <SelectContent>
                          {INVOICE_CURRENCIES.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label={tc("labels.instructions")} full>
                      <Textarea
                        rows={3}
                        value={bank.instructions ?? ""}
                        onChange={(e) => setBank((b) => ({ ...b, instructions: e.target.value }))}
                        placeholder={t("create.paymentMethods.bankInstructionsPlaceholder")}
                      />
                    </Field>
                  </div>
                </div>
              )}

              {cashVisible && (
                <div className="rounded-lg border border-border p-4 space-y-4">
                  <p className="text-sm font-medium">{t("create.paymentMethods.cashPayment")}</p>
                  <div className="grid gap-4">
                    <Field label={tc("labels.instructions")}>
                      <Textarea
                        rows={3}
                        value={cash.instructions ?? ""}
                        onChange={(e) => setCash((c) => ({ ...c, instructions: e.target.value }))}
                        placeholder={t("create.paymentMethods.cashInstructionsPlaceholder")}
                      />
                    </Field>
                    <Field label={t("create.paymentMethods.cashLocation")}>
                      <Input
                        value={cash.location ?? ""}
                        onChange={(e) => setCash((c) => ({ ...c, location: e.target.value }))}
                        placeholder={t("create.paymentMethods.cashLocationPlaceholder")}
                      />
                    </Field>
                  </div>
                </div>
              )}
            </div>
          </Section>

          <Section title={t("create.sections.notesTerms")}>
            <div className="grid gap-5">
              <Field
                label={t("create.fields.notes")}
                showToggle={{
                  id: "showNotes",
                  checked: displayOptions.showNotes,
                  onChange: (v) => setDisplay("showNotes", v),
                }}
              >
                <Textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t("create.fields.notesPlaceholder")}
                />
              </Field>
              <Field
                label={tc("labels.termsAndConditions")}
                showToggle={{
                  id: "showTerms",
                  checked: displayOptions.showTerms,
                  onChange: (v) => setDisplay("showTerms", v),
                }}
              >
                <Textarea
                  rows={4}
                  value={termsAndConditions}
                  onChange={(e) => setTermsAndConditions(e.target.value)}
                  placeholder={t("create.fields.termsPlaceholder")}
                />
              </Field>
            </div>
          </Section>

          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3">
            <div ref={formErrorRef} className="sm:mr-auto sm:self-center w-full sm:w-auto">
              <FormError message={formError} />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate({ to: "/invoices" })}
              disabled={saving}
            >
              {tc("buttons.cancel")}
            </Button>
            <LoadingButton type="submit" variant="hero" loading={saving} disabled={saving || atInvoiceLimit}>
              {saving
                ? tc("buttons.saving")
                : editId
                  ? tc("buttons.save")
                  : tc("buttons.createInvoice")}
            </LoadingButton>
          </div>
        </div>

        <aside className="min-w-0 max-w-full w-full space-y-4">
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            {t("create.preview.livePreview")}
          </p>
          <div className="rounded-2xl border border-border bg-card p-4 sm:p-6 lg:sticky lg:top-6 space-y-4 min-w-0 max-w-full box-border">
            {displayOptions.showVegapalLogo && (
              <p className="text-xs font-bold text-primary tracking-wide">VegaPal</p>
            )}

            {displayOptions.showSellerInfo && (
              <div className="text-sm border-b border-border pb-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  {tc("labels.from")}
                </p>
                <p className="font-semibold">
                  {user?.business || user?.name || t("create.preview.sellerFallback")}
                </p>
                <p className="text-muted-foreground text-xs">{user?.contactEmail || user?.email}</p>
              </div>
            )}

            <div className="flex justify-between items-start gap-3">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  {tc("labels.invoice")}
                </p>
                <p className="font-semibold truncate">
                  {title || t("create.preview.invoiceTitleFallback")}
                </p>
                {displayOptions.showPoNumber && poNumber && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {tc("labels.po")}: {poNumber}
                  </p>
                )}
                {displayOptions.showReferenceNumber && referenceNumber && (
                  <p className="text-xs text-muted-foreground">
                    {tc("labels.reference")}: {referenceNumber}
                  </p>
                )}
                {displayOptions.showProjectCode && projectCode && (
                  <p className="text-xs text-muted-foreground">
                    {tc("labels.project")}: {projectCode}
                  </p>
                )}
              </div>
              {displayOptions.showStatus && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-warning/15 text-warning text-xs font-medium shrink-0">
                  <span className="h-1.5 w-1.5 rounded-full bg-warning" />
                  {tc(`status.${status}`)}
                </span>
              )}
            </div>

            {displayOptions.showClientInfo && (
              <div className="text-sm">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  {tc("labels.billTo")}
                </p>
                <p className="font-semibold">
                  {clientCompany || clientName || t("create.preview.clientFallback")}
                </p>
                <p className="text-muted-foreground text-xs">
                  {clientEmail || t("create.fields.clientEmailPlaceholder")}
                </p>
              </div>
            )}

            <div className="space-y-1.5 text-sm border-t border-border pt-3">
              {items.map((it, i) => (
                <div key={i} className="flex justify-between gap-3">
                  <span className="truncate text-muted-foreground">
                    {it.description || t("create.preview.itemFallback", { index: i + 1 })} ×{" "}
                    {it.quantity || 0}
                  </span>
                  <span className="tabular-nums shrink-0">
                    {fmtAmount(it.total, invoiceCurrency)}
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t border-border pt-3 space-y-1 text-sm">
              <PreviewLine
                label={tc("labels.subtotal")}
                value={fmtAmount(subtotal, invoiceCurrency)}
              />
              {displayOptions.showDiscount && dnum > 0 && (
                <PreviewLine
                  label={tc("labels.discount")}
                  value={`- ${fmtAmount(dnum, invoiceCurrency)}`}
                />
              )}
              {displayOptions.showTax && tnum > 0 && (
                <PreviewLine label={tc("labels.tax")} value={fmtAmount(tnum, invoiceCurrency)} />
              )}
            </div>

            <p className="text-xl sm:text-2xl font-bold tracking-tight tabular-nums break-all">
              {fmtAmount(total, invoiceCurrency)}
            </p>

            {displayOptions.showDueDate && (
              <p className="text-xs text-muted-foreground">{tc("labels.due", { date: dueDate })}</p>
            )}

            {displayOptions.showNotes && description && (
              <div className="text-xs border-t border-border pt-3">
                <p className="font-medium text-muted-foreground uppercase tracking-wider mb-1">
                  {tc("labels.notes")}
                </p>
                <p className="text-muted-foreground whitespace-pre-wrap line-clamp-3">
                  {description}
                </p>
              </div>
            )}

            {displayOptions.showTerms && termsAndConditions && (
              <div className="text-xs border-t border-border pt-3">
                <p className="font-medium text-muted-foreground uppercase tracking-wider mb-1">
                  {tc("labels.terms")}
                </p>
                <p className="text-muted-foreground whitespace-pre-wrap line-clamp-3">
                  {termsAndConditions}
                </p>
              </div>
            )}

            {displayOptions.showPaymentInstructions && (
              <div className="text-xs border-t border-border pt-3 space-y-2">
                <p className="font-medium text-muted-foreground uppercase tracking-wider">
                  {tc("labels.payment")}
                </p>
                {cryptoVisible && crypto.walletAddress && (
                  <p className="text-muted-foreground">
                    {crypto.currency} · {crypto.network}
                    <span className="block font-mono truncate mt-0.5">{crypto.walletAddress}</span>
                  </p>
                )}
                {bankVisible && bank.bankName && (
                  <p className="text-muted-foreground">
                    {tc("labels.bank")}: {bank.bankName}
                  </p>
                )}
                {cashVisible && cash.instructions && (
                  <p className="text-muted-foreground line-clamp-2">{cash.instructions}</p>
                )}
              </div>
            )}
          </div>
        </aside>
      </form>
    </div>
  );
}

function PaymentMethodCard({
  label,
  description,
  icon: Icon,
  selected,
  onClick,
  fullWidth,
}: {
  label: string;
  description: string;
  icon: typeof Banknote;
  selected: boolean;
  onClick: () => void;
  fullWidth?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "box-border w-full min-w-0 max-w-full rounded-xl border p-4 text-left transition cursor-pointer",
        selected
          ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20"
          : "border-border bg-card hover:border-primary/30 hover:shadow-sm",
      )}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "h-9 w-9 rounded-lg flex items-center justify-center shrink-0",
            selected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground",
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="font-medium text-sm">{label}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
      </div>
    </button>
  );
}

function Section({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="box-border w-full max-w-full min-w-0 overflow-hidden rounded-2xl border border-border bg-card p-4 sm:p-6 lg:p-8">
      <div
        className={cn(
          "mb-5 flex flex-wrap items-start gap-x-3 gap-y-2",
          action ? "justify-between" : "",
        )}
      >
        <h2 className="min-w-0 font-semibold">{title}</h2>
        {action ? <div className="flex max-w-full flex-wrap">{action}</div> : null}
      </div>
      <div className="min-w-0 max-w-full">{children}</div>
    </div>
  );
}

function ShowToggle({
  id,
  label,
  checked,
  onChange,
}: {
  id: string;
  label?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  const { t } = useTranslation("common");

  return (
    <div className="flex max-w-full flex-wrap items-center gap-x-1.5 gap-y-1">
      <Label
        htmlFor={id}
        className="min-w-0 text-[11px] font-normal leading-tight text-muted-foreground cursor-pointer"
      >
        {checked ? t("toggle.hide") : t("toggle.show")}
        {label ? ` ${label}` : ""}
      </Label>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onChange}
        className="h-4 w-7 data-[state=checked]:bg-primary [&>span]:h-3 [&>span]:w-3 data-[state=checked]:[&>span]:translate-x-3"
      />
    </div>
  );
}

function Field({
  label,
  children,
  full,
  showToggle,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
  showToggle?: { id: string; checked: boolean; onChange: (v: boolean) => void };
}) {
  return (
    <div className={`box-border min-w-0 max-w-full space-y-2 ${full ? "md:col-span-2" : ""}`}>
      <div className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-x-3 sm:gap-y-1">
        <Label className="min-w-0 max-w-full">{label}</Label>
        {showToggle && (
          <ShowToggle
            id={showToggle.id}
            checked={showToggle.checked}
            onChange={showToggle.onChange}
          />
        )}
      </div>
      <div className="w-full min-w-0 max-w-full [&_input]:w-full [&_input]:min-w-0 [&_input]:max-w-full [&_textarea]:w-full [&_textarea]:min-w-0 [&_textarea]:max-w-full [&_button[role=combobox]]:w-full [&_button[role=combobox]]:min-w-0 [&_button[role=combobox]]:max-w-full">
        {children}
      </div>
    </div>
  );
}

function PreviewLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-muted-foreground gap-2">
      <span>{label}</span>
      <span className="tabular-nums text-foreground text-right">{value}</span>
    </div>
  );
}
