import Link from "next/link";
import { Rocket } from "lucide-react";

export function SiteFooter() {
  return (
    <footer className="border-t py-12 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-4">
                <div className="flex items-center gap-2 font-bold text-lg">
                    <Rocket className="h-5 w-5 text-primary" />
                    <span>AstroPost</span>
                </div>
                <p className="text-sm text-muted-foreground">
                    The AI-powered social media management tool for modern creators.
                </p>
            </div>
            
            <div>
                <h4 className="font-semibold mb-4">Product</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                    <li><Link href="/features" className="hover:text-foreground">Features</Link></li>
                    <li><Link href="/pricing" className="hover:text-foreground">Pricing</Link></li>
                    <li><Link href="/changelog" className="hover:text-foreground">Changelog</Link></li>
                </ul>
            </div>

            <div>
                <h4 className="font-semibold mb-4">Resources</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                    <li><Link href="/docs" className="hover:text-foreground">Documentation</Link></li>
                    <li><Link href="/blog" className="hover:text-foreground">Blog</Link></li>
                    <li><Link href="/community" className="hover:text-foreground">Community</Link></li>
                </ul>
            </div>

            <div>
                <h4 className="font-semibold mb-4">Legal</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                    <li><Link href="/legal/privacy" className="hover:text-foreground">Privacy Policy</Link></li>
                    <li><Link href="/legal/terms" className="hover:text-foreground">Terms of Service</Link></li>
                </ul>
            </div>
        </div>
        
        <div className="mt-12 pt-8 border-t text-center text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} AstroPost. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
