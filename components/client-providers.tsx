"use client";

import { LocaleProvider } from "@/lib/i18n";
import type { ReactNode } from "react";

export function ClientProviders({ children }: { children: ReactNode }) {
  return <LocaleProvider>{children}</LocaleProvider>;
}
