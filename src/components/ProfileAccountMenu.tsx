import { Link, useNavigate } from "@tanstack/react-router";
import {
  Check,
  ChevronUp,
  LogOut,
  Monitor,
  Moon,
  Settings,
  Sun,
  User,
} from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/lib/i18n/languages";
import { auth, type User as VegaUser } from "@/lib/vegapal-store";
import { type ThemePreference, useThemePreference } from "@/lib/theme";

function planLabel(plan: string | undefined, t: (k: string) => string) {
  if (plan === "pro") return t("plans.pro");
  if (plan === "business") return t("plans.business");
  return t("plans.free");
}

function displayNameFor(user: VegaUser, t: (k: string) => string) {
  const name = user?.name?.trim();
  if (name) return name;
  return t("nav.account");
}

function initialsFor(user: VegaUser, fallback: string) {
  const base = user?.name?.trim() || user?.email?.trim() || fallback;
  const ch = base.charAt(0);
  return (ch || "A").toUpperCase();
}

type MenuBodyProps = {
  user: VegaUser;
  onClose?: () => void;
  variant: "dropdown" | "sheet";
};

function useLanguageChange(onDone?: () => void) {
  const { i18n } = useTranslation();
  const [switching, setSwitching] = useState(false);

  const changeLanguage = async (code: SupportedLanguage) => {
    if (code === i18n.language || switching) return;
    setSwitching(true);
    try {
      const { ensureLanguageLoaded } = await import("@/lib/i18n/load-locale");
      await ensureLanguageLoaded(code);
      await i18n.changeLanguage(code);
      onDone?.();
    } finally {
      setSwitching(false);
    }
  };

  return { changeLanguage, currentCode: i18n.language as SupportedLanguage, switching };
}

const APPEARANCE_OPTIONS: {
  value: ThemePreference;
  labelKey: string;
  icon: typeof Sun;
}[] = [
  { value: "system", labelKey: "profileMenu.appearanceSystem", icon: Monitor },
  { value: "light", labelKey: "profileMenu.appearanceLight", icon: Sun },
  { value: "dark", labelKey: "profileMenu.appearanceDark", icon: Moon },
];

export function ProfileMenuBody({ user, onClose, variant }: MenuBodyProps) {
  const navigate = useNavigate();
  const { t } = useTranslation("common");
  const { changeLanguage, currentCode } = useLanguageChange(onClose);
  const { preference, setPreference } = useThemePreference();

  const currentLang =
    SUPPORTED_LANGUAGES.find((l) => l.code === currentCode) ?? SUPPORTED_LANGUAGES[0];
  const currentAppearance =
    APPEARANCE_OPTIONS.find((o) => o.value === preference) ?? APPEARANCE_OPTIONS[0];

  const rowClass =
    "flex w-full items-center justify-between gap-3 rounded-md px-2 py-2 text-sm hover:bg-muted transition-colors duration-150";

  if (variant === "sheet") {
    return (
      <div className="flex flex-col gap-1 pb-[env(safe-area-inset-bottom,0px)]">
        <div className="flex items-center gap-3 px-1 pb-4 border-b border-border mb-2">
          <div
            className="h-11 w-11 rounded-full bg-navy text-navy-foreground flex items-center justify-center text-sm font-semibold shrink-0"
            aria-hidden
          >
            {initialsFor(user, t("nav.account"))}
          </div>
          <div className="min-w-0">
            <p className="font-medium truncate">{displayNameFor(user, t)}</p>
            <p className="text-xs text-muted-foreground">{planLabel(user?.plan, t)}</p>
          </div>
        </div>

        <Link
          to="/settings"
          onClick={onClose}
          className={cn(rowClass, "text-foreground")}
        >
          <span className="flex items-center gap-2">
            <Settings className="h-4 w-4 text-muted-foreground" />
            {t("nav.settings")}
          </span>
        </Link>
        <Link to="/pricing" onClick={onClose} className={cn(rowClass, "text-foreground")}>
          <span>{t("profileMenu.planRow", { plan: planLabel(user?.plan, t) })}</span>
        </Link>

        <p className="text-xs font-medium text-muted-foreground px-2 pt-4 pb-1">
          {t("language.label")}
        </p>
        {SUPPORTED_LANGUAGES.map((lang) => (
          <button
            key={lang.code}
            type="button"
            className={cn(rowClass, "text-start")}
            onClick={() => void changeLanguage(lang.code)}
          >
            <span>{lang.label}</span>
            {currentCode === lang.code ? <Check className="h-4 w-4 text-primary" /> : null}
          </button>
        ))}

        <p className="text-xs font-medium text-muted-foreground px-2 pt-4 pb-1">
          {t("appearance.label")}
        </p>
        {APPEARANCE_OPTIONS.map(({ value, labelKey, icon: Icon }) => (
          <button
            key={value}
            type="button"
            className={cn(rowClass, "text-start")}
            onClick={() => setPreference(value)}
          >
            <span className="flex items-center gap-2">
              <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
              {t(labelKey)}
            </span>
            {preference === value ? <Check className="h-4 w-4 text-primary" /> : null}
          </button>
        ))}

        <div className="border-t border-border mt-4 pt-2">
          <button
            type="button"
            className={cn(rowClass, "text-destructive")}
            onClick={async () => {
              await auth.signOut();
              onClose?.();
              navigate({ to: "/" });
            }}
          >
            <span className="flex items-center gap-2">
              <LogOut className="h-4 w-4" />
              {t("nav.signOut")}
            </span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <DropdownMenuLabel className="font-normal text-xs text-muted-foreground">
        {t("profileMenu.accountSection")}
      </DropdownMenuLabel>
      <DropdownMenuItem asChild>
        <Link to="/settings" className="cursor-pointer">
          <Settings className="h-4 w-4 mr-2 text-muted-foreground" />
          {t("nav.settings")}
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem asChild>
        <Link to="/pricing" className="cursor-pointer">
          {t("profileMenu.planRow", { plan: planLabel(user?.plan, t) })}
        </Link>
      </DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuSub>
        <DropdownMenuSubTrigger className="cursor-pointer">
          <span className="flex-1">{t("language.label")}</span>
          <span className="text-muted-foreground text-xs mr-1">{currentLang.label}</span>
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent className="min-w-[11rem]">
          {SUPPORTED_LANGUAGES.map((lang) => (
            <DropdownMenuItem
              key={lang.code}
              className="cursor-pointer justify-between"
              onClick={() => void changeLanguage(lang.code)}
            >
              <span>{lang.label}</span>
              {currentCode === lang.code ? <Check className="h-4 w-4 text-primary" /> : null}
            </DropdownMenuItem>
          ))}
        </DropdownMenuSubContent>
      </DropdownMenuSub>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger className="cursor-pointer">
          <span className="flex-1">{t("appearance.label")}</span>
          <span className="text-muted-foreground text-xs mr-1">{t(currentAppearance.labelKey)}</span>
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent className="min-w-[11rem]">
          {APPEARANCE_OPTIONS.map(({ value, labelKey, icon: Icon }) => (
            <DropdownMenuItem
              key={value}
              className="cursor-pointer justify-between"
              onClick={() => setPreference(value)}
            >
              <span className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-muted-foreground" aria-hidden />
                {t(labelKey)}
              </span>
              {preference === value ? <Check className="h-4 w-4 text-primary" /> : null}
            </DropdownMenuItem>
          ))}
        </DropdownMenuSubContent>
      </DropdownMenuSub>
      <DropdownMenuSeparator />
      <DropdownMenuItem
        className="text-destructive focus:text-destructive cursor-pointer"
        onClick={async () => {
          await auth.signOut();
          navigate({ to: "/" });
        }}
      >
        <LogOut className="h-4 w-4 mr-2" />
        {t("nav.signOut")}
      </DropdownMenuItem>
    </>
  );
}

type SidebarProps = {
  user: VegaUser;
};

export function ProfileSidebarMenu({ user }: SidebarProps) {
  const { t } = useTranslation("common");

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center gap-3 rounded-lg px-2 py-2.5 min-h-11 text-start hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors duration-150 motion-reduce:transition-none"
          aria-label={t("profileMenu.openMenu")}
        >
          <div
            className="h-9 w-9 rounded-full bg-navy text-navy-foreground flex items-center justify-center text-sm font-semibold shrink-0"
            aria-hidden
          >
            {initialsFor(user, t("nav.account"))}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium leading-snug truncate">{displayNameFor(user, t)}</p>
            <p className="text-xs text-muted-foreground truncate">{planLabel(user?.plan, t)}</p>
          </div>
          <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        side="top"
        align="start"
        sideOffset={6}
        className="w-[min(300px,calc(100vw-2rem))] motion-reduce:animate-none"
      >
        <ProfileMenuBody user={user} variant="dropdown" />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

type MobileSheetProps = {
  user: VegaUser;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function MobileProfileSheet({ user, open, onOpenChange }: MobileSheetProps) {
  const { t } = useTranslation("common");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="max-h-[min(85dvh,32rem)] overflow-y-auto rounded-t-2xl pb-[env(safe-area-inset-bottom,0px)]"
      >
        <SheetHeader className="text-start">
          <SheetTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-muted-foreground" aria-hidden />
            {t("profileMenu.mobileTitle")}
          </SheetTitle>
        </SheetHeader>
        <div className="mt-4">
          <ProfileMenuBody user={user} variant="sheet" onClose={() => onOpenChange(false)} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

/** @deprecated use ProfileSidebarMenu */
export function SidebarAccountSection({ user }: SidebarProps) {
  return <ProfileSidebarMenu user={user} />;
}
