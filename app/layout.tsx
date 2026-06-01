import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Danni Research Terminal",
  description: "AI-Powered Market Research Platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen antialiased">
        {children}
        <Toaster
          position="bottom-right"
          theme="dark"
          toastOptions={{
            style: {
              background: "#131316",
              border: "1px solid #1e1e24",
              color: "#fafafa",
            },
          }}
        />
      </body>
    </html>
  );
}
