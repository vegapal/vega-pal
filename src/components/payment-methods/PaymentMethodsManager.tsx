import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  CRYPTO_PAYMENT_CURRENCIES,
  INVOICE_CURRENCIES,
  PAYMENT_NETWORKS,
} from "@/lib/invoice-constants";
import { formatAppError } from "@/lib/auth/errors";
import {
  createSavedPaymentMethod,
  deleteSavedPaymentMethod,
  listSavedPaymentMethods,
  setDefaultSavedPaymentMethod,
  updateSavedPaymentMethod,
} from "@/lib/payment-methods/store";
import type { SavedPaymentMethod, SavedPaymentMethodInput } from "@/lib/payment-methods/types";
import { SavedPaymentMethodCard } from "@/components/payment-methods/SavedPaymentMethodCard";
import { Plus } from "lucide-react";

type EditorState = {
  open: boolean;
  mode: "create" | "edit";
  type: "bank" | "crypto";
  id?: string;
  draft: SavedPaymentMethodInput;
};

const emptyBank = (): SavedPaymentMethodInput => ({
  type: "bank",
  label: "",
  bankName: "",
  accountHolderName: "",
  accountName: "",
  iban: "",
  accountNumber: "",
  swiftBic: "",
  bankCurrency: "AED",
  paymentReference: "",
  isDefault: false,
});

const emptyCrypto = (): SavedPaymentMethodInput => ({
  type: "crypto",
  label: "",
  cryptoCurrency: "USDT",
  network: "TRON TRC20",
  walletAddress: "",
  isDefault: false,
});

export function PaymentMethodsManager({ embedded }: { embedded?: boolean }) {
  const { t } = useTranslation("settings");
  const [methods, setMethods] = useState<SavedPaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [editor, setEditor] = useState<EditorState | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const reload = async () => {
    setLoading(true);
    try {
      setMethods(await listSavedPaymentMethods());
    } catch (err) {
      toast.error(formatAppError(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void reload();
  }, []);

  const banks = methods.filter((m) => m.type === "bank");
  const cryptos = methods.filter((m) => m.type === "crypto");

  const openCreate = (type: "bank" | "crypto") => {
    setEditor({
      open: true,
      mode: "create",
      type,
      draft: type === "bank" ? emptyBank() : emptyCrypto(),
    });
  };

  const openEdit = (method: SavedPaymentMethod) => {
    setEditor({
      open: true,
      mode: "edit",
      type: method.type,
      id: method.id,
      draft: {
        type: method.type,
        label: method.label,
        isDefault: method.isDefault,
        bankName: method.bankName,
        accountHolderName: method.accountHolderName,
        accountName: method.accountName,
        iban: method.iban,
        accountNumber: method.accountNumber,
        swiftBic: method.swiftBic,
        bankCurrency: method.bankCurrency,
        paymentReference: method.paymentReference,
        cryptoCurrency: method.cryptoCurrency,
        network: method.network,
        walletAddress: method.walletAddress,
      },
    });
  };

  const saveEditor = async () => {
    if (!editor) return;
    setSaving(true);
    try {
      if (editor.mode === "create") {
        await createSavedPaymentMethod(editor.draft);
      } else if (editor.id) {
        await updateSavedPaymentMethod(editor.id, editor.draft);
      }
      toast.success(t("paymentMethods.saved"));
      setEditor(null);
      await reload();
    } catch (err) {
      toast.error(formatAppError(err));
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setSaving(true);
    try {
      await deleteSavedPaymentMethod(deleteId);
      toast.success(t("paymentMethods.deleted"));
      setDeleteId(null);
      await reload();
    } catch (err) {
      toast.error(formatAppError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={embedded ? "space-y-8" : "space-y-10"}>
      <p className="text-xs text-muted-foreground">{t("paymentMethods.securityNote")}</p>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-semibold text-base">{t("paymentMethods.bankAccounts")}</h3>
            <p className="text-sm text-muted-foreground">{t("paymentMethods.bankAccountsDesc")}</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => openCreate("bank")}>
            <Plus className="h-4 w-4" /> {t("paymentMethods.addBank")}
          </Button>
        </div>
        {loading ? (
          <p className="text-sm text-muted-foreground">{t("paymentMethods.loading")}</p>
        ) : banks.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {banks.map((m) => (
              <SavedPaymentMethodCard
                key={m.id}
                method={m}
                onEdit={() => openEdit(m)}
                onDelete={() => setDeleteId(m.id)}
                onSetDefault={() =>
                  void setDefaultSavedPaymentMethod(m.id)
                    .then(reload)
                    .catch((err) => toast.error(formatAppError(err)))
                }
              />
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="font-semibold text-base">{t("paymentMethods.cryptoWallets")}</h3>
            <p className="text-sm text-muted-foreground">{t("paymentMethods.cryptoWalletsDesc")}</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => openCreate("crypto")}>
            <Plus className="h-4 w-4" /> {t("paymentMethods.addCrypto")}
          </Button>
        </div>
        {loading ? null : cryptos.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {cryptos.map((m) => (
              <SavedPaymentMethodCard
                key={m.id}
                method={m}
                onEdit={() => openEdit(m)}
                onDelete={() => setDeleteId(m.id)}
                onSetDefault={() =>
                  void setDefaultSavedPaymentMethod(m.id)
                    .then(reload)
                    .catch((err) => toast.error(formatAppError(err)))
                }
              />
            ))}
          </div>
        )}
      </section>

      <Dialog open={!!editor?.open} onOpenChange={(open) => !open && setEditor(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editor?.mode === "edit"
                ? t("paymentMethods.editTitle")
                : editor?.type === "bank"
                  ? t("paymentMethods.addBank")
                  : t("paymentMethods.addCrypto")}
            </DialogTitle>
            <DialogDescription>{t("paymentMethods.securityNote")}</DialogDescription>
          </DialogHeader>
          {editor ? (
            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="pm-label">{t("paymentMethods.label")}</Label>
                <Input
                  id="pm-label"
                  value={editor.draft.label}
                  onChange={(e) =>
                    setEditor({ ...editor, draft: { ...editor.draft, label: e.target.value } })
                  }
                  placeholder={
                    editor.type === "bank"
                      ? t("paymentMethods.labelBankPlaceholder")
                      : t("paymentMethods.labelCryptoPlaceholder")
                  }
                />
              </div>
              {editor.type === "bank" ? (
                <>
                  <Field
                    id="pm-bank"
                    label={t("paymentMethods.bankName")}
                    value={editor.draft.bankName ?? ""}
                    onChange={(v) => setEditor({ ...editor, draft: { ...editor.draft, bankName: v } })}
                  />
                  <Field
                    id="pm-holder"
                    label={t("paymentMethods.accountHolder")}
                    value={editor.draft.accountHolderName ?? ""}
                    onChange={(v) =>
                      setEditor({ ...editor, draft: { ...editor.draft, accountHolderName: v } })
                    }
                  />
                  <Field
                    id="pm-iban"
                    label={t("paymentMethods.iban")}
                    value={editor.draft.iban ?? ""}
                    onChange={(v) => setEditor({ ...editor, draft: { ...editor.draft, iban: v } })}
                  />
                  <Field
                    id="pm-acct"
                    label={t("paymentMethods.accountNumber")}
                    value={editor.draft.accountNumber ?? ""}
                    onChange={(v) =>
                      setEditor({ ...editor, draft: { ...editor.draft, accountNumber: v } })
                    }
                  />
                  <Field
                    id="pm-swift"
                    label={t("paymentMethods.swift")}
                    value={editor.draft.swiftBic ?? ""}
                    onChange={(v) => setEditor({ ...editor, draft: { ...editor.draft, swiftBic: v } })}
                  />
                  <div className="space-y-1.5">
                    <Label>{t("paymentMethods.currency")}</Label>
                    <Select
                      value={editor.draft.bankCurrency || "AED"}
                      onValueChange={(v) =>
                        setEditor({ ...editor, draft: { ...editor.draft, bankCurrency: v } })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {INVOICE_CURRENCIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <Label>{t("paymentMethods.token")}</Label>
                    <Select
                      value={editor.draft.cryptoCurrency || "USDT"}
                      onValueChange={(v) =>
                        setEditor({ ...editor, draft: { ...editor.draft, cryptoCurrency: v } })
                      }
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
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("paymentMethods.network")}</Label>
                    <Select
                      value={editor.draft.network || "TRON TRC20"}
                      onValueChange={(v) =>
                        setEditor({ ...editor, draft: { ...editor.draft, network: v } })
                      }
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
                  </div>
                  <Field
                    id="pm-wallet"
                    label={t("paymentMethods.walletAddress")}
                    value={editor.draft.walletAddress ?? ""}
                    onChange={(v) =>
                      setEditor({ ...editor, draft: { ...editor.draft, walletAddress: v } })
                    }
                  />
                </>
              )}
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!editor.draft.isDefault}
                  onChange={(e) =>
                    setEditor({ ...editor, draft: { ...editor.draft, isDefault: e.target.checked } })
                  }
                />
                {t("paymentMethods.makeDefault")}
              </label>
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditor(null)}>
              {t("paymentMethods.cancel")}
            </Button>
            <Button type="button" onClick={() => void saveEditor()} disabled={saving}>
              {saving ? t("paymentMethods.saving") : t("paymentMethods.save")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("paymentMethods.deleteTitle")}</DialogTitle>
            <DialogDescription>{t("paymentMethods.deleteDesc")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeleteId(null)}>
              {t("paymentMethods.cancel")}
            </Button>
            <Button type="button" variant="destructive" onClick={() => void confirmDelete()} disabled={saving}>
              {t("paymentMethods.delete")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function EmptyState() {
  const { t } = useTranslation("settings");
  return (
    <div className="rounded-xl border border-dashed border-border p-6 text-center">
      <p className="font-medium text-sm">{t("paymentMethods.emptyTitle")}</p>
      <p className="text-xs text-muted-foreground mt-1">{t("paymentMethods.emptyDesc")}</p>
    </div>
  );
}

function Field({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
