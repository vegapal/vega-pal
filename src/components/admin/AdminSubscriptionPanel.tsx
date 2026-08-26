import { useState } from "react";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  postAdminSubscription,
  type AdminSubscriptionAction,
  type AdminUserDetail,
} from "@/lib/admin/admin-client";
import { formatAppError } from "@/lib/auth/errors";
import type { UserPlan } from "@/lib/admin/plans";

type Props = {
  userId: string;
  detail: AdminUserDetail;
  onDone: () => void;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
};

const MONTH_OPTIONS = [
  { value: "1", label: "1 month" },
  { value: "3", label: "3 months" },
  { value: "6", label: "6 months" },
  { value: "12", label: "12 months" },
];

export function AdminSubscriptionPanel({ userId, detail, onDone, onError, onSuccess }: Props) {
  const [months, setMonths] = useState("1");
  const [customEndsAt, setCustomEndsAt] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const sub = detail.subscription;

  const run = async (action: AdminSubscriptionAction, plan?: UserPlan) => {
    setBusy(action);
    try {
      await postAdminSubscription(userId, {
        action,
        plan,
        months: Number(months) as 1 | 3 | 6 | 12,
        customEndsAt: customEndsAt || undefined,
        paymentReference: paymentReference || undefined,
        notes: notes || undefined,
      });
      onSuccess(`Subscription updated (${action.replaceAll("_", " ")}).`);
      onDone();
    } catch (err) {
      onError(formatAppError(err));
    } finally {
      setBusy(null);
    }
  };

  const remainingLabel = (() => {
    if (!sub) return "No paid subscription";
    if (sub.isExpired || sub.status === "expired") return "Expired";
    if (sub.daysRemaining === 0) return "Expires today";
    if (sub.daysRemaining != null && sub.daysRemaining > 0) {
      return `${sub.daysRemaining} day${sub.daysRemaining === 1 ? "" : "s"} remaining`;
    }
    return sub.status;
  })();

  return (
    <div className="rounded-2xl border border-border bg-card p-5 sm:p-6 space-y-4">
      <div>
        <h2 className="font-semibold text-lg">Subscription</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Effective plan: <strong>{detail.plan}</strong>
          {sub ? (
            <>
              {" "}
              · Status: <strong>{sub.status}</strong>
              {sub.cancelAtPeriodEnd ? " (cancels at period end)" : ""}
            </>
          ) : null}
        </p>
        <p className="text-sm text-muted-foreground mt-1">{remainingLabel}</p>
        {sub?.startsAt || sub?.endsAt ? (
          <p className="text-xs text-muted-foreground mt-1">
            {sub.startsAt ? `Started ${new Date(sub.startsAt).toLocaleString()}` : null}
            {sub.startsAt && sub.endsAt ? " · " : null}
            {sub.endsAt ? `Ends ${new Date(sub.endsAt).toLocaleString()}` : null}
          </p>
        ) : null}
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>Duration</Label>
          <Select value={months} onValueChange={setMonths}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTH_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="custom-end">Custom end (optional)</Label>
          <Input
            id="custom-end"
            type="datetime-local"
            value={customEndsAt}
            onChange={(e) => setCustomEndsAt(e.target.value ? new Date(e.target.value).toISOString().slice(0, 16) : "")}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="pay-ref">Payment reference</Label>
          <Input
            id="pay-ref"
            value={paymentReference}
            onChange={(e) => setPaymentReference(e.target.value)}
            placeholder="Optional"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sub-notes">Notes</Label>
          <Input id="sub-notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" disabled={!!busy} onClick={() => void run("activate", "pro")}>
          Activate Pro
        </Button>
        <Button type="button" size="sm" disabled={!!busy} onClick={() => void run("activate", "business")}>
          Activate Business
        </Button>
        <Button type="button" size="sm" variant="outline" disabled={!!busy} onClick={() => void run("renew")}>
          Renew / extend
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!!busy}
          onClick={() => void run("cancel_at_period_end")}
        >
          Cancel at period end
        </Button>
        <ConfirmDanger
          label="Cancel immediately"
          title="Cancel subscription immediately?"
          description="The user will lose Pro/Business access right away and move to Free."
          busy={busy === "cancel_immediately"}
          onConfirm={() => void run("cancel_immediately")}
        />
        <ConfirmDanger
          label="Move to Free"
          title="Move this user to Free?"
          description="Any active paid subscription will be canceled immediately."
          busy={busy === "move_to_free"}
          onConfirm={() => void run("move_to_free")}
        />
      </div>
    </div>
  );
}

function ConfirmDanger({
  label,
  title,
  description,
  busy,
  onConfirm,
}: {
  label: string;
  title: string;
  description: string;
  busy: boolean;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button type="button" size="sm" variant="destructive" disabled={busy}>
          {label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Confirm</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
