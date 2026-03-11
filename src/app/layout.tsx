import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { UpgradeModal } from "@/components/ui/upgrade-modal";
import type { Metadata, Viewport } from "next";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://astropost.com"),
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
    "Growth Tool",
    "Marketing Automation"
  ],
  authors: [{ name: "AstroPost Team" }],
  creator: "AstroPost",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "AstroPost",
    title: "AstroPost | AI-Powered Social Media Management",
    description:
      "Schedule tweets, generate threads with AI, and analyze your growth with AstroPost.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "AstroPost Dashboard Preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AstroPost",
    description:
      "Schedule tweets, generate threads with AI, and analyze your growth with AstroPost.",
    images: ["/og-image.png"],
    creator: "@AstroPostApp",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: "/",
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
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen overflow-x-hidden antialiased`}
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
             <main id="main-content" className="flex-1 min-w-0">{children}</main>
             <SiteFooter />
          </div>
          <UpgradeModal />
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
