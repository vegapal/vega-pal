// Supabase-backed store for VegaPal. Persistent across sessions.
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User as SupaUser } from "@supabase/supabase-js";
import { isEmailConfirmed } from "@/lib/auth/email-confirmation";
import { completeAuthFromUrl } from "@/lib/auth/complete-auth-from-url";
import {
  getEmailConfirmRedirectUrl,
  getPasswordResetRedirectUrl,
  logAuthRedirect,
} from "@/lib/auth/redirect-url";
import type { UserPlan } from "@/lib/admin/plans";
import { FREE_PLAN_MONTHLY_INVOICE_LIMIT } from "@/lib/admin/plans";
import {
  FREE_PLAN_LIMIT_MESSAGE,
  type InvoicePlanUsage,
} from "@/lib/plan/invoice-limit";
import { authApiRequest } from "@/lib/auth/auth-client";
import {
  DEFAULT_DISPLAY_OPTIONS,
  DEFAULT_INVOICE_CURRENCY,
  buildDefaultPaymentMethods,
  displayOptionsToJson,
  legacyNetworkFromCanonical,
  normalizeDisplayOptions,
  normalizePaymentMethods,
  paymentMethodsToJson,
  type DisplayOptions,
  type PaymentMethodsConfig,
} from "@/lib/invoice-constants";

export type InvoiceStatus = "draft" | "pending" | "paid" | "overdue" | "cancelled";

export type { DisplayOptions, PaymentMethodsConfig };

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: string;
  number: string;
  invoiceCurrency: string;
  poNumber?: string;
  referenceNumber?: string;
  projectCode?: string;
  clientName: string;
  clientEmail: string;
  clientCompany?: string;
  title: string;
  description: string;
  termsAndConditions: string;
  status: InvoiceStatus;
  createdAt: string;
  issueDate: string;
  dueDate: string;
  items: InvoiceItem[];
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  amount: number;
  displayOptions: DisplayOptions;
  paymentMethods: PaymentMethodsConfig;
  /** @deprecated Use paymentMethods.crypto.walletAddress — kept for backward-compatible UI */
  walletAddress: string;
  /** @deprecated Use paymentMethods.crypto.network — kept for backward-compatible UI */
  network: string;
  sellerName: string;
  sellerBusiness?: string;
  sellerEmail: string;
  sellerAddress?: string;
  sellerLogoUrl?: string;
  brandColor?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  business?: string;
  companyAddress?: string;
  website?: string;
  contactEmail?: string;
  logoUrl?: string;
  brandColor?: string;
  wallet?: string;
  network?: string;
  emailNotifications?: boolean;
  invoiceUpdates?: boolean;
  plan: UserPlan;
  isDisabled?: boolean;
}

export type { InvoicePlanUsage };

const DEFAULT_WALLET = "TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE";
const DEFAULT_NETWORK = "TRC20";
const DEFAULT_BRAND = "#16C784";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function addDaysISO(base: string, days: number) {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}
function computeTotals(items: InvoiceItem[], discount: number, tax: number) {
  const subtotal = items.reduce(
    (s, i) => s + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0),
    0,
  );
  const total = Math.max(0, subtotal - (discount || 0) + (tax || 0));
  return { subtotal, total };
}

// ---------- Row mappers ----------
type ProfileRow = {
  id: string;
  email: string | null;
  name: string;
  business: string | null;
  company_address: string | null;
  website: string | null;
  contact_email: string | null;
  logo_url: string | null;
  brand_color: string;
  wallet: string;
  network: string;
  email_notifications: boolean;
  invoice_updates: boolean;
  plan?: UserPlan;
  is_disabled?: boolean;
};
function profileToUser(p: ProfileRow, fallbackEmail?: string): User {
  return {
    id: p.id,
    email: p.email ?? fallbackEmail ?? "",
    name: p.name,
    business: p.business ?? undefined,
    companyAddress: p.company_address ?? undefined,
    website: p.website ?? undefined,
    contactEmail: p.contact_email ?? undefined,
    logoUrl: p.logo_url ?? undefined,
    brandColor: p.brand_color,
    wallet: p.wallet,
    network: p.network,
    emailNotifications: p.email_notifications,
    invoiceUpdates: p.invoice_updates,
    plan: p.plan ?? "free",
    isDisabled: p.is_disabled ?? false,
  };
}

function startOfUtcMonthIso(): string {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1)).toISOString();
}

function startOfNextUtcMonthIso(): string {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1)).toISOString();
}

export async function getInvoicePlanUsage(): Promise<InvoicePlanUsage | null> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;

  const { data, error } = await supabase.rpc("get_invoice_plan_usage");
  if (!error && data && Array.isArray(data) && data.length > 0) {
    const row = data[0] as {
      plan: UserPlan;
      invoices_this_month: number;
      monthly_limit: number | null;
    };
    return {
      plan: row.plan,
      invoicesThisMonth: row.invoices_this_month,
      monthlyLimit: row.monthly_limit,
    };
  }

  const profile = await loadProfile(u.user);
  const plan = profile?.plan ?? "free";
  if (plan !== "free") {
    return { plan, invoicesThisMonth: 0, monthlyLimit: null };
  }

  const { count, error: countError } = await supabase
    .from("invoices")
    .select("id", { count: "exact", head: true })
    .eq("user_id", u.user.id)
    .gte("created_at", startOfUtcMonthIso())
    .lt("created_at", startOfNextUtcMonthIso());

  if (countError) return { plan, invoicesThisMonth: 0, monthlyLimit: FREE_PLAN_MONTHLY_INVOICE_LIMIT };

  return {
    plan,
    invoicesThisMonth: count ?? 0,
    monthlyLimit: FREE_PLAN_MONTHLY_INVOICE_LIMIT,
  };
}

async function assertCanCreateInvoice(userId: string, plan: UserPlan): Promise<void> {
  if (plan !== "free") return;

  const { count, error } = await supabase
    .from("invoices")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .gte("created_at", startOfUtcMonthIso())
    .lt("created_at", startOfNextUtcMonthIso());

  if (error) throw error;
  if ((count ?? 0) >= FREE_PLAN_MONTHLY_INVOICE_LIMIT) {
    const limitError = new Error(FREE_PLAN_LIMIT_MESSAGE) as Error & { code?: string };
    limitError.code = "free_plan_invoice_limit";
    throw limitError;
  }
}

type InvoiceRow = {
  id: string;
  number: string;
  client_name: string;
  client_email: string;
  client_company: string | null;
  title: string;
  description: string;
  status: string;
  created_at: string;
  issue_date: string;
  due_date: string;
  subtotal: number | string;
  discount: number | string;
  tax: number | string;
  total: number | string;
  wallet_address: string;
  network: string;
  seller_name: string;
  seller_business: string | null;
  seller_email: string;
  seller_address: string | null;
  seller_logo_url: string | null;
  brand_color: string;
  invoice_currency?: string | null;
  po_number?: string | null;
  reference_number?: string | null;
  project_code?: string | null;
  terms_and_conditions?: string | null;
  display_options?: import("@/integrations/supabase/types").Json | null;
  payment_methods?: import("@/integrations/supabase/types").Json | null;
};
type ItemRow = {
  invoice_id: string;
  position: number;
  description: string;
  quantity: number | string;
  unit_price: number | string;
  total: number | string;
};

function autoOverdue(status: string, dueDate: string): InvoiceStatus {
  if (status === "pending" && dueDate && dueDate < todayISO()) return "overdue";
  return status as InvoiceStatus;
}

function rowToInvoice(r: InvoiceRow, items: ItemRow[]): Invoice {
  const total = Number(r.total);
  const paymentMethods = normalizePaymentMethods(r.payment_methods, r.wallet_address, r.network);
  const walletAddress = paymentMethods.crypto.walletAddress || r.wallet_address;
  const network = legacyNetworkFromCanonical(paymentMethods.crypto.network) || r.network;

  return {
    id: r.id,
    number: r.number,
    invoiceCurrency: r.invoice_currency ?? DEFAULT_INVOICE_CURRENCY,
    poNumber: r.po_number ?? undefined,
    referenceNumber: r.reference_number ?? undefined,
    projectCode: r.project_code ?? undefined,
    clientName: r.client_name,
    clientEmail: r.client_email,
    clientCompany: r.client_company ?? undefined,
    title: r.title,
    description: r.description ?? "",
    termsAndConditions: r.terms_and_conditions ?? "",
    status: autoOverdue(r.status, r.due_date),
    createdAt: r.created_at,
    issueDate: r.issue_date,
    dueDate: r.due_date,
    items: items
      .filter((i) => i.invoice_id === r.id)
      .sort((a, b) => a.position - b.position)
      .map((i) => ({
        description: i.description,
        quantity: Number(i.quantity),
        unitPrice: Number(i.unit_price),
        total: Number(i.total),
      })),
    subtotal: Number(r.subtotal),
    discount: Number(r.discount),
    tax: Number(r.tax),
    total,
    amount: total,
    displayOptions: normalizeDisplayOptions(r.display_options),
    paymentMethods,
    walletAddress,
    network,
    sellerName: r.seller_name,
    sellerBusiness: r.seller_business ?? undefined,
    sellerEmail: r.seller_email,
    sellerAddress: r.seller_address ?? undefined,
    sellerLogoUrl: r.seller_logo_url ?? undefined,
    brandColor: r.brand_color,
  };
}

// ---------- Session hook ----------
let cachedProfile: User | null = null;
let cachedPendingEmailConfirmation = false;
let cachedAuthEmail: string | null = null;
const sessionListeners = new Set<() => void>();
function notifySession() {
  sessionListeners.forEach((cb) => cb());
}

async function loadProfile(supaUser: SupaUser): Promise<User | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", supaUser.id)
    .maybeSingle();
  if (error || !data) return null;
  return profileToUser(data as ProfileRow, supaUser.email ?? undefined);
}

export function useSession() {
  const [user, setUser] = useState<User | null>(cachedProfile);
  const [pendingEmailConfirmation, setPendingEmailConfirmation] = useState(
    cachedPendingEmailConfirmation,
  );
  const [authEmail, setAuthEmail] = useState<string | null>(cachedAuthEmail);
  const [loading, setLoading] = useState(cachedProfile === null && !cachedPendingEmailConfirmation);

  const refresh = useCallback(async () => {
    const { data: sessionData } = await supabase.auth.getSession();
    let supaUser = sessionData.session?.user ?? null;

    if (!supaUser) {
      const { data } = await supabase.auth.getUser();
      supaUser = data.user;
    }

    if (!supaUser) {
      cachedProfile = null;
      cachedPendingEmailConfirmation = false;
      cachedAuthEmail = null;
      setUser(null);
      setPendingEmailConfirmation(false);
      setAuthEmail(null);
      setLoading(false);
      notifySession();
      return;
    }

    const email = supaUser.email ?? null;
    cachedAuthEmail = email;
    setAuthEmail(email);

    if (!isEmailConfirmed(supaUser)) {
      cachedProfile = null;
      cachedPendingEmailConfirmation = true;
      setUser(null);
      setPendingEmailConfirmation(true);
      setLoading(false);
      notifySession();
      return;
    }

    cachedPendingEmailConfirmation = false;
    setPendingEmailConfirmation(false);
    const p = await loadProfile(supaUser);
    if (p?.isDisabled) {
      await supabase.auth.signOut();
      cachedProfile = null;
      cachedAuthEmail = null;
      setUser(null);
      setAuthEmail(null);
      setLoading(false);
      notifySession();
      return;
    }
    cachedProfile = p;
    setUser(p);
    setLoading(false);
    notifySession();
  }, []);

  useEffect(() => {
    const cb = () => setUser(cachedProfile);
    sessionListeners.add(cb);

    let cancelled = false;
    void (async () => {
      if (typeof window !== "undefined" && window.location.pathname === "/reset-password") {
        if (!cancelled) await refresh();
        return;
      }
      await completeAuthFromUrl();
      if (!cancelled) await refresh();
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (
        event === "INITIAL_SESSION" ||
        event === "SIGNED_IN" ||
        event === "SIGNED_OUT" ||
        event === "USER_UPDATED" ||
        event === "PASSWORD_RECOVERY"
      ) {
        refresh();
      }
    });
    return () => {
      cancelled = true;
      sessionListeners.delete(cb);
      sub.subscription.unsubscribe();
    };
  }, [refresh]);

  return { user, loading, pendingEmailConfirmation, authEmail, refresh };
}

// ---------- Auth actions ----------
export const auth = {
  async signUp(
    email: string,
    password: string,
    name: string,
    business?: string,
    turnstileToken?: string,
  ) {
    logAuthRedirect("signUp", getEmailConfirmRedirectUrl());
    await authApiRequest("/api/auth/signup", {
      method: "POST",
      json: {
        email,
        password,
        name,
        business,
        confirmPassword: password,
        turnstileToken,
      },
    });
    await supabase.auth.signOut();
    cachedProfile = null;
    cachedPendingEmailConfirmation = false;
    cachedAuthEmail = null;
    notifySession();
    return { user: null };
  },
  async signIn(email: string, password: string, turnstileToken?: string) {
    const result = await authApiRequest<{
      session: {
        access_token: string;
        refresh_token: string;
        expires_in?: number;
        expires_at?: number;
        token_type?: string;
      };
      user: { id: string; email: string | null } | null;
    }>("/api/auth/login", {
      method: "POST",
      json: { email, password, turnstileToken },
    });

    const { error: sessionError } = await supabase.auth.setSession({
      access_token: result.session.access_token,
      refresh_token: result.session.refresh_token,
    });
    if (sessionError) throw sessionError;

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (user && !isEmailConfirmed(user)) {
      await supabase.auth.signOut();
      cachedProfile = null;
      cachedPendingEmailConfirmation = false;
      cachedAuthEmail = null;
      notifySession();
      const unconfirmed = new Error("Email not confirmed") as Error & { code?: string };
      unconfirmed.code = "email_not_confirmed";
      throw unconfirmed;
    }
    const profile = user ? await loadProfile(user) : null;
    if (profile?.isDisabled) {
      await supabase.auth.signOut();
      cachedProfile = null;
      cachedPendingEmailConfirmation = false;
      cachedAuthEmail = null;
      notifySession();
      const disabled = new Error("This account has been disabled.") as Error & { code?: string };
      disabled.code = "account_disabled";
      throw disabled;
    }
    return { user, session: result.session };
  },
  async signOut() {
    try {
      await authApiRequest("/api/auth/logout", { method: "POST" });
    } catch {
      // Best-effort; always clear local session.
    }
    await supabase.auth.signOut();
    cachedProfile = null;
    cachedPendingEmailConfirmation = false;
    cachedAuthEmail = null;
    notifySession();
  },
  async resetPassword(email: string, turnstileToken?: string) {
    logAuthRedirect("resetPassword", getPasswordResetRedirectUrl());
    await authApiRequest("/api/auth/forgot-password", {
      method: "POST",
      json: { email, turnstileToken },
    });
  },
  async resendConfirmationEmail(email: string) {
    logAuthRedirect("resend", getEmailConfirmRedirectUrl());
    await authApiRequest("/api/auth/resend-confirmation", {
      method: "POST",
      json: { email },
    });
  },
  async updateProfile(patch: Partial<User>) {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw new Error("Not signed in");
    const update: Record<string, unknown> = {};
    if (patch.name !== undefined) update.name = patch.name;
    if (patch.business !== undefined) update.business = patch.business ?? null;
    if (patch.companyAddress !== undefined) update.company_address = patch.companyAddress ?? null;
    if (patch.website !== undefined) update.website = patch.website ?? null;
    if (patch.contactEmail !== undefined) update.contact_email = patch.contactEmail ?? null;
    if (patch.logoUrl !== undefined) update.logo_url = patch.logoUrl ?? null;
    if (patch.brandColor !== undefined) update.brand_color = patch.brandColor;
    if (patch.wallet !== undefined) update.wallet = patch.wallet;
    if (patch.network !== undefined) update.network = patch.network;
    if (patch.emailNotifications !== undefined)
      update.email_notifications = patch.emailNotifications;
    if (patch.invoiceUpdates !== undefined) update.invoice_updates = patch.invoiceUpdates;
    const { data, error } = await supabase
      .from("profiles")
      .update(update as never)
      .eq("id", u.user.id)
      .select("*")
      .maybeSingle();
    if (error) throw error;
    if (data) {
      cachedProfile = profileToUser(data as ProfileRow, u.user.email ?? undefined);
      notifySession();
    }
  },
};

// ---------- Invoices ----------
async function fetchInvoiceWithItems(id: string): Promise<Invoice | null> {
  const [{ data: inv, error: e1 }, { data: items, error: e2 }] = await Promise.all([
    supabase.from("invoices").select("*").eq("id", id).maybeSingle(),
    supabase.from("invoice_items").select("*").eq("invoice_id", id),
  ]);
  if (e1 || e2 || !inv) return null;
  return rowToInvoice(inv as InvoiceRow, (items ?? []) as ItemRow[]);
}

async function nextInvoiceNumber(userId: string): Promise<string> {
  const { count } = await supabase
    .from("invoices")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  return `INV-${String((count ?? 0) + 1).padStart(4, "0")}`;
}

export interface CreateInvoiceInput {
  clientName: string;
  clientEmail: string;
  clientCompany?: string;
  title: string;
  description?: string;
  termsAndConditions?: string;
  items: InvoiceItem[];
  discount?: number;
  tax?: number;
  issueDate?: string;
  dueDate?: string;
  status?: InvoiceStatus;
  invoiceCurrency?: string;
  poNumber?: string;
  referenceNumber?: string;
  projectCode?: string;
  displayOptions?: DisplayOptions;
  paymentMethods?: PaymentMethodsConfig;
}

export const invoices = {
  async list(): Promise<Invoice[]> {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return [];
    const { data: invRows, error } = await supabase
      .from("invoices")
      .select("*")
      .eq("user_id", u.user.id)
      .order("created_at", { ascending: false });
    if (error || !invRows || invRows.length === 0) return [];
    const ids = invRows.map((r) => (r as InvoiceRow).id);
    const { data: items } = await supabase.from("invoice_items").select("*").in("invoice_id", ids);
    const rows = invRows as InvoiceRow[];
    const list = rows.map((r) => rowToInvoice(r, (items ?? []) as ItemRow[]));
    // Auto-promote overdue
    const stale = list.filter((i, idx) => i.status === "overdue" && rows[idx].status === "pending");
    if (stale.length > 0) {
      await supabase
        .from("invoices")
        .update({ status: "overdue" })
        .in(
          "id",
          stale.map((i) => i.id),
        );
    }
    return list;
  },

  async get(id: string): Promise<Invoice | null> {
    const inv = await fetchInvoiceWithItems(id);
    if (inv && inv.status === "overdue") {
      // persist overdue auto-promotion
      await supabase
        .from("invoices")
        .update({ status: "overdue" })
        .eq("id", id)
        .eq("status", "pending");
    }
    return inv;
  },

  async create(input: CreateInvoiceInput): Promise<Invoice> {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw new Error("Not signed in");

    // Load profile for seller snapshot
    const profile = await loadProfile(u.user);
    if (!profile) throw new Error("Profile not ready");
    if (profile.isDisabled) {
      const disabled = new Error("This account has been disabled.") as Error & { code?: string };
      disabled.code = "account_disabled";
      throw disabled;
    }
    await assertCanCreateInvoice(u.user.id, profile.plan);

    const items = input.items.map((i) => ({
      ...i,
      total: (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0),
    }));
    const { subtotal, total } = computeTotals(items, input.discount || 0, input.tax || 0);
    const issueDate = input.issueDate || todayISO();
    const number = await nextInvoiceNumber(u.user.id);

    const walletAddress = profile.wallet || DEFAULT_WALLET;
    const legacyNetwork = profile.network || DEFAULT_NETWORK;
    const paymentMethods =
      input.paymentMethods ?? buildDefaultPaymentMethods(walletAddress, legacyNetwork);
    const displayOptions = input.displayOptions ?? DEFAULT_DISPLAY_OPTIONS;

    const { data: invRow, error } = await supabase
      .from("invoices")
      .insert({
        user_id: u.user.id,
        number,
        client_name: input.clientName,
        client_email: input.clientEmail,
        client_company: input.clientCompany ?? null,
        title: input.title,
        description: input.description ?? "",
        terms_and_conditions: input.termsAndConditions ?? "",
        status: input.status ?? "pending",
        issue_date: issueDate,
        due_date: input.dueDate || addDaysISO(issueDate, 14),
        subtotal,
        discount: input.discount || 0,
        tax: input.tax || 0,
        total,
        invoice_currency: input.invoiceCurrency ?? DEFAULT_INVOICE_CURRENCY,
        po_number: input.poNumber ?? null,
        reference_number: input.referenceNumber ?? null,
        project_code: input.projectCode ?? null,
        display_options: displayOptionsToJson(displayOptions),
        payment_methods: paymentMethodsToJson(paymentMethods),
        wallet_address: paymentMethods.crypto.walletAddress || walletAddress,
        network: legacyNetworkFromCanonical(paymentMethods.crypto.network) || legacyNetwork,
        seller_name: profile.name,
        seller_business: profile.business ?? null,
        seller_email: profile.contactEmail || profile.email,
        seller_address: profile.companyAddress ?? null,
        seller_logo_url: profile.logoUrl ?? null,
        brand_color: profile.brandColor || DEFAULT_BRAND,
      })
      .select("*")
      .single();
    if (error || !invRow) throw error ?? new Error("Failed to create invoice");

    if (items.length > 0) {
      const { error: itemsErr } = await supabase.from("invoice_items").insert(
        items.map((it, idx) => ({
          invoice_id: (invRow as InvoiceRow).id,
          position: idx,
          description: it.description,
          quantity: it.quantity,
          unit_price: it.unitPrice,
          total: it.total,
        })),
      );
      if (itemsErr) throw itemsErr;
    }
    const created = await fetchInvoiceWithItems((invRow as InvoiceRow).id);
    if (!created) throw new Error("Failed to load invoice");
    return created;
  },

  async update(
    id: string,
    patch: Partial<Invoice> & { items?: InvoiceItem[]; discount?: number; tax?: number },
  ) {
    const update: Record<string, unknown> = {};
    if (patch.clientName !== undefined) update.client_name = patch.clientName;
    if (patch.clientEmail !== undefined) update.client_email = patch.clientEmail;
    if (patch.clientCompany !== undefined) update.client_company = patch.clientCompany ?? null;
    if (patch.title !== undefined) update.title = patch.title;
    if (patch.description !== undefined) update.description = patch.description;
    if (patch.termsAndConditions !== undefined)
      update.terms_and_conditions = patch.termsAndConditions;
    if (patch.status !== undefined) update.status = patch.status;
    if (patch.issueDate !== undefined) update.issue_date = patch.issueDate;
    if (patch.dueDate !== undefined) update.due_date = patch.dueDate;
    if (patch.invoiceCurrency !== undefined) update.invoice_currency = patch.invoiceCurrency;
    if (patch.poNumber !== undefined) update.po_number = patch.poNumber ?? null;
    if (patch.referenceNumber !== undefined)
      update.reference_number = patch.referenceNumber ?? null;
    if (patch.projectCode !== undefined) update.project_code = patch.projectCode ?? null;
    if (patch.displayOptions !== undefined) {
      update.display_options = displayOptionsToJson(patch.displayOptions);
    }
    if (patch.paymentMethods !== undefined) {
      update.payment_methods = paymentMethodsToJson(patch.paymentMethods);
      update.wallet_address = patch.paymentMethods.crypto.walletAddress;
      update.network = legacyNetworkFromCanonical(patch.paymentMethods.crypto.network);
    }

    if (patch.items || patch.discount !== undefined || patch.tax !== undefined) {
      // Need to recompute totals - load existing if items missing
      let items = patch.items;
      let discount = patch.discount;
      let tax = patch.tax;
      if (items === undefined || discount === undefined || tax === undefined) {
        const existing = await fetchInvoiceWithItems(id);
        if (existing) {
          items = items ?? existing.items;
          discount = discount ?? existing.discount;
          tax = tax ?? existing.tax;
        }
      }
      const cleanItems = (items ?? []).map((i) => ({
        ...i,
        total: (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0),
      }));
      const { subtotal, total } = computeTotals(cleanItems, discount || 0, tax || 0);
      update.subtotal = subtotal;
      update.discount = discount || 0;
      update.tax = tax || 0;
      update.total = total;

      if (patch.items) {
        await supabase.from("invoice_items").delete().eq("invoice_id", id);
        if (cleanItems.length > 0) {
          await supabase.from("invoice_items").insert(
            cleanItems.map((it, idx) => ({
              invoice_id: id,
              position: idx,
              description: it.description,
              quantity: it.quantity,
              unit_price: it.unitPrice,
              total: it.total,
            })),
          );
        }
      }
    }
    if (Object.keys(update).length > 0) {
      const { error } = await supabase
        .from("invoices")
        .update(update as never)
        .eq("id", id);
      if (error) throw error;
    }
  },

  async setStatus(id: string, status: InvoiceStatus) {
    const { error } = await supabase.from("invoices").update({ status }).eq("id", id);
    if (error) throw error;
  },

  async cancel(id: string) {
    await invoices.setStatus(id, "cancelled");
  },

  async duplicate(id: string): Promise<Invoice | null> {
    const src = await fetchInvoiceWithItems(id);
    if (!src) return null;
    return invoices.create({
      clientName: src.clientName,
      clientEmail: src.clientEmail,
      clientCompany: src.clientCompany,
      title: src.title,
      description: src.description,
      termsAndConditions: src.termsAndConditions,
      items: src.items.map((i) => ({ ...i })),
      discount: src.discount,
      tax: src.tax,
      invoiceCurrency: src.invoiceCurrency,
      poNumber: src.poNumber,
      referenceNumber: src.referenceNumber,
      projectCode: src.projectCode,
      displayOptions: src.displayOptions,
      paymentMethods: src.paymentMethods,
    });
  },
};

// ---------- React hooks ----------
const invoiceListeners = new Set<() => void>();
export function notifyInvoices() {
  invoiceListeners.forEach((cb) => cb());
}

export function useInvoices() {
  const [data, setData] = useState<Invoice[] | null>(null);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    setLoading(true);
    const list = await invoices.list();
    setData(list);
    setLoading(false);
  }, []);
  useEffect(() => {
    refresh();
    const cb = () => refresh();
    invoiceListeners.add(cb);
    return () => {
      invoiceListeners.delete(cb);
    };
  }, [refresh]);
  return { data: data ?? [], loading, refresh };
}

export function useInvoice(id: string | undefined) {
  const [data, setData] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    if (!id) {
      setData(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const inv = await invoices.get(id);
    setData(inv);
    setLoading(false);
  }, [id]);
  useEffect(() => {
    refresh();
    const cb = () => refresh();
    invoiceListeners.add(cb);
    return () => {
      invoiceListeners.delete(cb);
    };
  }, [refresh]);
  return { data, loading, refresh };
}

export function fmtUSDT(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
