import { Cairo, Geist, Geist_Mono } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { UpgradeModal } from "@/components/ui/upgrade-modal";
import type { Metadata, Viewport } from "next";

/** Locales that should switch the document to RTL. */
const RTL_LOCALES = new Set(["ar", "he", "fa", "ur"]);

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

/**
 * Cairo — Arabic + Latin typeface loaded via Next.js font optimization.
 * Applied via :lang(ar) in globals.css so it activates only when the
 * document language is Arabic, leaving the Geist stack unchanged for all
 * other locales. Weights 400–700 cover body copy, UI labels, and headings.
 */
const cairo = Cairo({
  variable: "--font-arabic",
  subsets: ["arabic", "latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  preload: true,
});

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  width: "device-width",
  initialScale: 1,
  // maximumScale removed — WCAG 1.4.4 requires text to be resizable up to 200%
  // colorScheme: tells the browser which themes the page supports so native UI
  // elements (scrollbars, form controls, mobile status bar) match the active theme
  // and prevents a white background flash before ThemeProvider hydrates.
  colorScheme: "light dark",
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://astrapost.app"),
  title: {
    default: "AstraPost | AI-Powered Social Media Management",
    template: "%s | AstraPost",
  },
  description:
    "Schedule tweets, generate threads with AI, and analyze your growth with AstraPost. The ultimate tool for X (Twitter) creators.",
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
  authors: [{ name: "AstraPost Team" }],
  creator: "AstraPost",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: "AstraPost",
    title: "AstraPost | AI-Powered Social Media Management",
    description:
      "Schedule tweets, generate threads with AI, and analyze your growth with AstraPost.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "AstraPost Dashboard Preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AstraPost",
    description:
      "Schedule tweets, generate threads with AI, and analyze your growth with AstraPost.",
    images: ["/og-image.png"],
    creator: "@AstraPostApp",
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  // `locale` cookie is set by the user's language preference in Settings.
  // Falls back to "en" so unauthenticated/marketing pages default to English.
  const locale = cookieStore.get("locale")?.value ?? "en";
  const dir = RTL_LOCALES.has(locale) ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${cairo.variable} min-h-dvh overflow-x-hidden antialiased`}
      >
        {/*
          Skip-to-main-content link — WCAG 2.4.1 "Bypass Blocks" (Level A).
          Visually hidden until focused via keyboard; jumps straight to the
          <main id="main-content"> element in the dashboard/page layouts.
          - start-4 uses CSS logical property so it appears on the correct
            side in both LTR (left) and RTL (right) layouts.
          - Text is translated for Arabic sessions so screen-reader users
            hear the announcement in their own language.
          - Colors use design-system tokens so it works in dark mode
            without any JavaScript or hydration dependency.
        */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground focus:shadow-md focus:outline-none focus:ring-2 focus:ring-ring"
        >
          {dir === "rtl" ? "تخطى إلى المحتوى الرئيسي" : "Skip to main content"}
        </a>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <UpgradeModal />
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
