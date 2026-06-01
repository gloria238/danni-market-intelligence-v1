import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Danni Research Terminal",
  description:
    "AI-Powered Market Research. Ask any market question and receive a structured investment memo.",
  openGraph: {
    title: "Danni Research Terminal",
    description:
      "AI-Powered Market Research. Ask any market question and receive a structured investment memo.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen antialiased bg-background text-foreground">
        {children}
        <Toaster
          position="bottom-right"
          theme="dark"
          toastOptions={{
            style: {
              background: "oklch(0.16 0.015 258)",
              border: "1px solid oklch(0.24 0.015 258)",
              color: "oklch(0.96 0.003 260)",
              fontSize: "0.8125rem",
            },
          }}
        />
      </body>
    </html>
  );
}
