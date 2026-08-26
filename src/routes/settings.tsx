import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { AppShell } from "@/components/AppShell";
import { auth, useSession } from "@/lib/vegapal-store";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { FormError } from "@/components/ui/form-error";
import { formatAppError } from "@/lib/auth/errors";
import { useSubmitGuard } from "@/hooks/use-submit-guard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Check, LogOut, Upload, Trash2 } from "lucide-react";
import { settingsSchema, firstZodError } from "@/lib/validation/schemas";
import { ensureNamespacesLoaded } from "@/lib/i18n/load-namespace";
import { InvoicePlanUsageIndicator } from "@/components/plan/InvoicePlanUsageIndicator";
import { PlanBadge } from "@/components/admin/AdminBadges";
import { PaymentMethodsManager } from "@/components/payment-methods/PaymentMethodsManager";

export const Route = createFileRoute("/settings")({
  beforeLoad: () => ensureNamespacesLoaded(["settings"]),
  head: () => ({
    meta: [{ title: "Settings — VegaPal" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: () => (
    <AppShell>
      <Settings />
    </AppShell>
  ),
});

function Settings() {
  const navigate = useNavigate();
  const { user } = useSession();
  const { t } = useTranslation("settings");
  const { t: tc } = useTranslation("common");
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [business, setBusiness] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [website, setWebsite] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [brandColor, setBrandColor] = useState("#16C784");
  const [wallet, setWallet] = useState("");
  const [network, setNetwork] = useState("TRC20");
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [invoiceUpdates, setInvoiceUpdates] = useState(true);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const submitGuard = useSubmitGuard();

  useEffect(() => {
    if (!user) return;
    setName(user.name);
    setBusiness(user.business ?? "");
    setCompanyAddress(user.companyAddress ?? "");
    setWebsite(user.website ?? "");
    setContactEmail(user.contactEmail ?? user.email);
    setLogoUrl(user.logoUrl ?? "");
    setBrandColor(user.brandColor ?? "#16C784");
    setWallet(user.wallet ?? "");
    setNetwork(user.network ?? "TRC20");
    setEmailNotifications(user.emailNotifications ?? true);
    setInvoiceUpdates(user.invoiceUpdates ?? true);
  }, [user?.id, user]);

  if (!user) return null;

  const onLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500_000) {
      alert(tc("alerts.imageTooLarge"));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setLogoUrl(typeof reader.result === "string" ? reader.result : "");
    reader.readAsDataURL(file);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submitGuard.begin()) return;
    setFormError("");

    const parsed = settingsSchema.safeParse({
      name,
      business,
      companyAddress,
      website,
      contactEmail,
      wallet,
      brandColor,
    });
    if (!parsed.success) {
      setFormError(firstZodError(parsed.error));
      submitGuard.end();
      return;
    }

    setSaving(true);
    try {
      const data = parsed.data;
      await auth.updateProfile({
        name: data.name,
        business: data.business || undefined,
        companyAddress: data.companyAddress || undefined,
        website: data.website || undefined,
        contactEmail: data.contactEmail || undefined,
        logoUrl: logoUrl || undefined,
        brandColor: data.brandColor,
        wallet: data.wallet,
        network,
        emailNotifications,
        invoiceUpdates,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (err) {
      setFormError(formatAppError(err));
    } finally {
      setSaving(false);
      submitGuard.end();
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-10 max-w-3xl mx-auto min-w-0">
      <h1 className="text-3xl font-bold tracking-tight">{t("title")}</h1>
      <p className="text-muted-foreground mt-1">{t("subtitle")}</p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <PlanBadge plan={user.plan} />
        <InvoicePlanUsageIndicator showUpgradeWhenLimited />
      </div>

      <form onSubmit={save} className="mt-8 space-y-6">
        <Section title={t("sections.branding.title")} desc={t("sections.branding.desc")}>
          <Field label={t("fields.logo")}>
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-xl border border-border bg-muted flex items-center justify-center overflow-hidden">
                {logoUrl ? (
                  <img src={logoUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-xs text-muted-foreground">{t("fields.noLogo")}</span>
                )}
              </div>
              <div className="flex flex-col gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onLogoChange}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileRef.current?.click()}
                >
                  <Upload className="h-4 w-4" /> {tc("buttons.upload")}
                </Button>
                {logoUrl && (
                  <Button type="button" variant="ghost" size="sm" onClick={() => setLogoUrl("")}>
                    <Trash2 className="h-4 w-4" /> {tc("buttons.remove")}
                  </Button>
                )}
              </div>
            </div>
          </Field>
          <Field label={t("fields.businessName")}>
            <Input
              value={business}
              onChange={(e) => setBusiness(e.target.value)}
              placeholder={t("fields.businessPlaceholder")}
            />
          </Field>
          <Field label={t("fields.brandColor")}>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                className="h-10 w-12 rounded border border-border bg-transparent cursor-pointer"
              />
              <Input
                value={brandColor}
                onChange={(e) => setBrandColor(e.target.value)}
                className="font-mono w-40"
              />
            </div>
          </Field>
        </Section>

        <Section title={t("sections.companyInfo.title")} desc={t("sections.companyInfo.desc")}>
          <Field label={t("fields.fullName")}>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>
          <Field label={t("fields.accountEmail")}>
            <Input value={user.email} disabled />
          </Field>
          <Field label={t("fields.contactEmail")}>
            <Input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
            />
          </Field>
          <Field label={t("fields.website")}>
            <Input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder={t("fields.websitePlaceholder")}
            />
          </Field>
          <Field label={t("fields.companyAddress")}>
            <Textarea
              rows={3}
              value={companyAddress}
              onChange={(e) => setCompanyAddress(e.target.value)}
              placeholder={t("fields.companyAddressPlaceholder")}
            />
          </Field>
        </Section>

        <Section title={t("sections.paymentMethods.title")} desc={t("sections.paymentMethods.desc")}>
          <PaymentMethodsManager embedded />
        </Section>

        <Section title={t("sections.payments.title")} desc={t("sections.payments.desc")}>
          <Field label={t("fields.network")}>
            <select
              value={network}
              onChange={(e) => setNetwork(e.target.value)}
              className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              aria-label={t("fields.network")}
            >
              <option value="TRC20">{t("networks.trc20")}</option>
              <option value="ERC20">{t("networks.erc20")}</option>
              <option value="BEP20">{t("networks.bep20")}</option>
            </select>
          </Field>
          <Field label={t("fields.walletAddress")}>
            <Input
              value={wallet}
              onChange={(e) => setWallet(e.target.value)}
              placeholder={t("fields.walletPlaceholder")}
              className="font-mono text-sm"
              aria-label={t("fields.walletAddress")}
            />
          </Field>
        </Section>

        <Section title={t("sections.notifications.title")} desc={t("sections.notifications.desc")}>
          <Toggle
            label={t("fields.emailNotifications")}
            desc={t("fields.emailNotificationsDesc")}
            checked={emailNotifications}
            onChange={setEmailNotifications}
          />
          <Toggle
            label={t("fields.invoiceUpdates")}
            desc={t("fields.invoiceUpdatesDesc")}
            checked={invoiceUpdates}
            onChange={setInvoiceUpdates}
          />
        </Section>

        <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-6">
          <div>
            <p className="font-medium">{t("signOut.title")}</p>
            <p className="text-sm text-muted-foreground">{t("signOut.description")}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={async () => {
              await auth.signOut();
              navigate({ to: "/" });
            }}
          >
            <LogOut className="h-4 w-4" /> {tc("nav.signOut")}
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-end gap-3 sticky bottom-4">
          <div className="sm:mr-auto w-full sm:w-auto">
            <FormError message={formError} />
          </div>
          {saved && (
            <span className="text-sm text-primary inline-flex items-center gap-1" role="status">
              <Check className="h-4 w-4" aria-hidden /> {tc("buttons.saved")}
            </span>
          )}
          <LoadingButton type="submit" variant="hero" loading={saving} disabled={saving}>
            {saving ? tc("buttons.saving") : tc("buttons.save")}
          </LoadingButton>
        </div>
      </form>
    </div>
  );
}

function Section({
  title,
  desc,
  children,
}: {
  title: string;
  desc: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 lg:p-8">
      <div className="mb-6">
        <h2 className="font-semibold text-lg">{title}</h2>
        <p className="text-sm text-muted-foreground mt-1">{desc}</p>
      </div>
      <div className="space-y-5">{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid sm:grid-cols-[180px_1fr] sm:items-center gap-2 sm:gap-6">
      <Label>{label}</Label>
      <div>{children}</div>
    </div>
  );
}

function Toggle({
  label,
  desc,
  checked,
  onChange,
}: {
  label: string;
  desc: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="font-medium text-sm">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
