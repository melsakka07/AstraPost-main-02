import { Scale, FileCheck, ShieldAlert, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default function TermsPage() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl space-y-12">
      <div className="text-center space-y-4">
        <Badge variant="outline" className="px-3 py-1 text-sm">Legal</Badge>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Terms of Service</h1>
        <p className="text-muted-foreground text-lg">Last updated: March 9, 2026</p>
      </div>

      <div className="grid md:grid-cols-3 gap-8 mb-12">
        <Card className="bg-primary/5 border-none shadow-none">
            <CardContent className="pt-6 flex flex-col items-center text-center gap-2">
                <Scale className="h-8 w-8 text-primary" />
                <h3 className="font-semibold">Fair Usage</h3>
                <p className="text-sm text-muted-foreground">Guidelines for using our platform responsibly.</p>
            </CardContent>
        </Card>
        <Card className="bg-primary/5 border-none shadow-none">
            <CardContent className="pt-6 flex flex-col items-center text-center gap-2">
                <FileCheck className="h-8 w-8 text-primary" />
                <h3 className="font-semibold">Content Rights</h3>
                <p className="text-sm text-muted-foreground">You own your content, we just help you post it.</p>
            </CardContent>
        </Card>
        <Card className="bg-primary/5 border-none shadow-none">
            <CardContent className="pt-6 flex flex-col items-center text-center gap-2">
                <ShieldAlert className="h-8 w-8 text-primary" />
                <h3 className="font-semibold">Limitations</h3>
                <p className="text-sm text-muted-foreground">Our liability and service warranties explained.</p>
            </CardContent>
        </Card>
      </div>

      <div className="prose prose-lg prose-neutral dark:prose-invert max-w-none">
        <div className="bg-card border rounded-2xl p-8 md:p-12 shadow-sm space-y-8">
            <section>
                <h2 className="flex items-center gap-2 text-2xl font-bold text-foreground">
                    <span className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary text-sm">1</span>
                    Introduction
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                    These Terms of Service ("Terms") govern your access to and use of AstroPost's website, products, and services ("Services"). 
                    Please read these Terms carefully, and contact us if you have any questions. By accessing or using our Services, you agree to be bound by these Terms and by our Privacy Policy.
                </p>
            </section>

            <div className="h-px bg-border" />

            <section>
                <h2 className="flex items-center gap-2 text-2xl font-bold text-foreground">
                    <span className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary text-sm">2</span>
                    Use of Services
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                    You may use our Services only if you can form a binding contract with AstroPost, and only in compliance with these Terms and all applicable local, state, national, and international laws, rules, and regulations.
                </p>
            </section>

            <div className="h-px bg-border" />

            <section>
                <h2 className="flex items-center gap-2 text-2xl font-bold text-foreground">
                    <span className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary text-sm">3</span>
                    Your Content
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                    You retain your rights to any content you submit, post or display on or through the Services. By submitting, posting or displaying content on or through the Services, you grant us a worldwide, non-exclusive, royalty-free license (with the right to sublicense) to use, copy, reproduce, process, adapt, modify, publish, transmit, display and distribute such content in any and all media or distribution methods (now known or later developed).
                </p>
            </section>

            <div className="h-px bg-border" />

            <section>
                <h2 className="flex items-center gap-2 text-2xl font-bold text-foreground">
                    <span className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary text-sm">4</span>
                    AstroPost Rights
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                    All right, title, and interest in and to the Services (excluding Content provided by users) are and will remain the exclusive property of AstroPost and its licensors. 
                    The Services are protected by copyright, trademark, and other laws of both the United States and foreign countries.
                </p>
            </section>

            <div className="h-px bg-border" />

            <section>
                <h2 className="flex items-center gap-2 text-2xl font-bold text-foreground">
                    <span className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary text-sm">5</span>
                    Restrictions
                </h2>
                <p className="text-muted-foreground mb-4">
                    You agree not to do any of the following while accessing or using the Services:
                </p>
                <ul className="space-y-2 list-none pl-0 text-muted-foreground">
                    <li className="flex gap-3">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2.5 shrink-0" />
                        Access, tamper with, or use non-public areas of the Services, AstroPost's computer systems, or the technical delivery systems of AstroPost's providers.
                    </li>
                    <li className="flex gap-3">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2.5 shrink-0" />
                        Probe, scan, or test the vulnerability of any system or network or breach or circumvent any security or authentication measures.
                    </li>
                    <li className="flex gap-3">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2.5 shrink-0" />
                        Access or search or attempt to access or search the Services by any means (automated or otherwise) other than through our currently available, published interfaces that are provided by AstroPost.
                    </li>
                    <li className="flex gap-3">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2.5 shrink-0" />
                        Interfere with, or disrupt, (or attempt to do so), the access of any user, host or network, including, without limitation, sending a virus, overloading, flooding, spamming, mail-bombing the Services.
                    </li>
                </ul>
            </section>

            <div className="h-px bg-border" />

            <section>
                <h2 className="flex items-center gap-2 text-2xl font-bold text-foreground">
                    <span className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary text-sm">6</span>
                    Termination
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                    We may suspend or terminate your access to and use of the Services, at our sole discretion, at any time and without notice to you. 
                    Upon any termination, discontinuation or cancellation of Services or your Account, the following provisions will survive: ownership provisions, warranty disclaimers, limitations of liability, and dispute resolution provisions.
                </p>
            </section>
            
             <div className="bg-muted/30 p-6 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-4 not-prose">
                <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-background rounded-full flex items-center justify-center border shadow-sm">
                        <Mail className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h4 className="font-semibold">Have questions?</h4>
                        <p className="text-sm text-muted-foreground">Contact our legal team</p>
                    </div>
                </div>
                <a 
                    href="mailto:terms@astropost.com" 
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                >
                    Email Legal Team
                </a>
            </div>
        </div>
      </div>
    </div>
  );
}
