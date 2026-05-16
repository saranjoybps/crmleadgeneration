import type { Metadata } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";

export const metadata: Metadata = {
  title: "JOY CRM",
  description: "Modern Tenant-based SaaS CRM.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <script
          id="theme-script"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{
            __html: `
            (function() {
              try {
                var stored = localStorage.getItem("joy-theme");
                var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
                var theme = stored === "light" || stored === "dark" || stored === "system" ? stored : "system";
                var resolved = theme === "system" ? (prefersDark ? "dark" : "light") : theme;
                document.documentElement.setAttribute("data-theme", resolved);
              } catch (e) {}
            })();
          `,
          }}
        />
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
