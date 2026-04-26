import { generateSeoMetadata } from "@/lib/seo";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  return generateSeoMetadata(
    { en: "Create Account — AstraPost", ar: "إنشاء حساب — أسترا بوست" },
    {
      en: "Join thousands of creators managing their X presence with AstraPost.",
      ar: "انضم إلى آلاف المبدعين الذين يديرون تواجدهم على X مع أسترا بوست.",
    }
  );
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
