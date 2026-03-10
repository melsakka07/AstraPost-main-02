import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import type { Metadata } from "next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "AstroPost | AI-Powered Social Media Management",
    template: "%s | AstroPost",
  },
  description:
    "Schedule tweets, generate threads with AI, and analyze your growth with AstroPost. The ultimate tool for X (Twitter) creators.",
  keywords: [
    "Twitter",
    "X",
    "Social Media",
    "Scheduler",
    "AI Writer",
    "Analytics",
    "Thread Maker",
  ],
  authors: [{ name: "AstroPost Team" }],
  creator: "AstroPost",
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "AstroPost",
    title: "AstroPost | AI-Powered Social Media Management",
    description:
      "Schedule tweets, generate threads with AI, and analyze your growth with AstroPost.",
  },
  twitter: {
    card: "summary_large_image",
    title: "AstroPost",
    description:
      "Schedule tweets, generate threads with AI, and analyze your growth with AstroPost.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {/* We only show the site header on public pages, dashboard has its own layout */}
          <div className="flex flex-col min-h-screen">
             <SiteHeader />
             <main id="main-content" className="flex-1">{children}</main>
             <SiteFooter />
          </div>
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
