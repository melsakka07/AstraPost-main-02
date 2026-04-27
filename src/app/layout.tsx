import { Cairo, Geist, Geist_Mono } from "next/font/google";
import { cookies, headers } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { UpgradeModal } from "@/components/ui/upgrade-modal";
import { auth } from "@/lib/auth";
import { getSeoLocale } from "@/lib/seo";
import type { Metadata, Viewport } from "next";

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

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getSeoLocale();
  const isAr = locale === "ar";

  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://astrapost.app"),
    title: {
      default: isAr
        ? "أسترا بوست | إدارة وسائل التواصل الاجتماعي بالذكاء الاصطناعي"
        : "AstraPost | AI-Powered Social Media Management",
      template: isAr ? "%s | أسترا بوست" : "%s | AstraPost",
    },
    description: isAr
      ? "جدول التغريدات، وأنشئ خيوطاً بالذكاء الاصطناعي، وحلل نموك مع أسترا بوست. الأداة المثلى لمبدعي X (تويتر)."
      : "Schedule tweets, generate threads with AI, and analyze your growth with AstraPost. The ultimate tool for X (Twitter) creators.",
    keywords: isAr
      ? [
          "تويتر",
          "X",
          "وسائل التواصل الاجتماعي",
          "جدولة",
          "كاتب ذكاء اصطناعي",
          "تحليلات",
          "صانع خيوط",
          "أداة نمو",
          "أتمتة التسويق",
        ]
      : [
          "Twitter",
          "X",
          "Social Media",
          "Scheduler",
          "AI Writer",
          "Analytics",
          "Thread Maker",
          "Growth Tool",
          "Marketing Automation",
        ],
    authors: [{ name: "AstraPost Team" }],
    creator: "AstraPost",
    icons: {
      icon: [
        { url: "/favicon.ico", sizes: "any" },
        { url: "/favicon-32.png", type: "image/png", sizes: "32x32" },
      ],
      apple: "/app-icon-180.png",
    },
    manifest: "/manifest.json",
    openGraph: {
      type: "website",
      locale: isAr ? "ar_SA" : "en_US",
      url: "/",
      siteName: "AstraPost",
      title: isAr
        ? "أسترا بوست | إدارة وسائل التواصل الاجتماعي بالذكاء الاصطناعي"
        : "AstraPost | AI-Powered Social Media Management",
      description: isAr
        ? "جدول التغريدات، وأنشئ خيوطاً بالذكاء الاصطناعي، وحلل نموك مع أسترا بوست."
        : "Schedule tweets, generate threads with AI, and analyze your growth with AstraPost.",
      images: [
        {
          url: "/og-1200x630.png",
          width: 1200,
          height: 630,
          alt: isAr ? "معاينة لوحة تحكم أسترا بوست" : "AstraPost Dashboard Preview",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: "AstraPost",
      description: isAr
        ? "جدول التغريدات، وأنشئ خيوطاً بالذكاء الاصطناعي، وحلل نموك مع أسترا بوست."
        : "Schedule tweets, generate threads with AI, and analyze your growth with AstraPost.",
      images: ["/og-1200x630.png"],
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
      languages: {
        en: "https://astrapost.app?lang=en",
        ar: "https://astrapost.app?lang=ar",
      },
    },
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth.api.getSession({ headers: await headers() });
  const cookieStore = await cookies();
  const headersList = await headers();
  const cookieLocale = cookieStore.get("locale")?.value;

  // Check for ?lang= query param (used by hreflang alternate URLs for SEO)
  let urlLang: string | undefined;
  try {
    const host = headersList.get("host") || "";
    const proto = headersList.get("x-forwarded-proto") || "https";
    const pathAndQuery =
      headersList.get("x-invoke-path") || headersList.get("x-middleware-request-url") || "";
    const urlStr = pathAndQuery.startsWith("http")
      ? pathAndQuery
      : `${proto}://${host}${pathAndQuery}`;
    urlLang = new URL(urlStr).searchParams.get("lang") || undefined;
  } catch {
    /* ignore */
  }

  const acceptLang = headersList.get("accept-language");
  const detectedLocale =
    (urlLang === "ar" || urlLang === "en" || urlLang === "pseudo" ? urlLang : undefined) ||
    cookieLocale ||
    (/(^|,)\s*ar(-[A-Z]+)?\s*(;q=0\.[5-9])?/.test(acceptLang ?? "") ? "ar" : undefined) ||
    session?.user?.language ||
    "en";
  const language = detectedLocale;
  const dir = language === "ar" || language === "pseudo" ? "rtl" : "ltr";
  const messages = await getMessages();

  return (
    <html lang={language} dir={dir} suppressHydrationWarning>
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
          className="focus:bg-background focus:text-foreground focus:ring-ring sr-only focus:not-sr-only focus:fixed focus:start-4 focus:top-4 focus:z-[100] focus:rounded-md focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-md focus:ring-2 focus:outline-none"
        >
          {dir === "rtl" ? "تخطى إلى المحتوى الرئيسي" : "Skip to main content"}
        </a>
        <NextIntlClientProvider messages={messages} locale={language}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <TooltipProvider>{children}</TooltipProvider>
            <UpgradeModal />
            <Toaster position="bottom-right" richColors closeButton />
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
