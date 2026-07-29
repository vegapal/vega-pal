import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronDown, LogOut } from "lucide-react";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { ThemeToggle } from "@/lib/theme";
import { auth } from "@/lib/vegapal-store";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { User } from "@/lib/vegapal-store";

function planLabel(plan: string | undefined, t: (k: string) => string) {
  if (plan === "pro") return t("plans.pro");
  if (plan === "business") return t("plans.business");
  return t("plans.free");
}

type Props = {
  user: User;
  className?: string;
};

export function SidebarAccountSection({ user, className }: Props) {
  const navigate = useNavigate();
  const { t } = useTranslation("common");

  const displayName = user.name?.trim() || t("nav.account");
  const initial = (displayName.charAt(0) || "A").toUpperCase();
  const userPlan = user.plan ?? "free";

  return (
    <div className={className}>
      <div className="flex items-center gap-3 min-w-0 mb-4">
        <div
          className="h-10 w-10 rounded-full bg-navy text-navy-foreground flex items-center justify-center text-sm font-semibold shrink-0"
          aria-hidden
        >
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-snug break-words">{displayName}</p>
          <p className="text-xs text-muted-foreground">{planLabel(userPlan, t)}</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground px-1">{t("language.label")}</p>
          <LanguageSwitcher className="w-full [&_button]:w-full [&_button]:justify-between" />
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground px-1">{t("appearance.label")}</p>
          <div className="flex w-full">
            <ThemeToggle className="w-full" />
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" variant="outline" className="w-full justify-between gap-2">
              {t("nav.account")}
              <ChevronDown className="h-4 w-4 opacity-70 shrink-0" aria-hidden />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]">
            <DropdownMenuItem asChild>
              <Link to="/settings">{t("nav.settings")}</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link to="/pricing">{t("nav.plan")}</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={async () => {
                await auth.signOut();
                navigate({ to: "/" });
              }}
            >
              <LogOut className="h-4 w-4 mr-2" />
              {t("nav.signOut")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
