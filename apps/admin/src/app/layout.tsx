import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { SocietyProvider } from "@/context/SocietyContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { AuthGuard } from "@/components/AuthGuard";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Neighbr — Estate Operations Command Center",
  description: "Unified Gated Community Administration & Security Operations Portal",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-slate-950 dark:bg-slate-950 light:bg-slate-50 text-slate-100 dark:text-slate-100 light:text-slate-900 min-h-screen antialiased selection:bg-sky-500 selection:text-white transition-colors duration-200`}>
        <ThemeProvider>
          <AuthProvider>
            <SocietyProvider>
              <AuthGuard>{children}</AuthGuard>
            </SocietyProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
