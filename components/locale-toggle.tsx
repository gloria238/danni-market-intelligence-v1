"use client";

import { useLocale, type Locale } from "@/lib/i18n";
import { Globe } from "lucide-react";

export function LocaleToggle() {
  const { locale, setLocale } = useLocale();

  const toggle = () => {
    setLocale(locale === "en" ? "zh" : "en");
  };

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-1.5 text-xs text-muted hover:text-foreground-secondary transition-colors px-2 py-1 rounded-lg hover:bg-surface"
      title={locale === "en" ? "Switch to 简体中文" : "Switch to English"}
    >
      <Globe className="h-3.5 w-3.5" />
      <span className="font-medium">{locale === "en" ? "中文" : "EN"}</span>
    </button>
  );
}
