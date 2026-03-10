import { Shield, Lock, Eye, Mail } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export default function PrivacyPage() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl space-y-12">
      <div className="text-center space-y-4">
        <Badge variant="outline" className="px-3 py-1 text-sm">Legal</Badge>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="text-muted-foreground text-lg">Last updated: March 9, 2026</p>
      </div>

      <div className="grid md:grid-cols-3 gap-8 mb-12">
        <Card className="bg-primary/5 border-none shadow-none">
            <CardContent className="pt-6 flex flex-col items-center text-center gap-2">
                <Shield className="h-8 w-8 text-primary" />
                <h3 className="font-semibold">Data Protection</h3>
                <p className="text-sm text-muted-foreground">We use industry standard encryption to protect your data.</p>
            </CardContent>
        </Card>
        <Card className="bg-primary/5 border-none shadow-none">
            <CardContent className="pt-6 flex flex-col items-center text-center gap-2">
                <Lock className="h-8 w-8 text-primary" />
                <h3 className="font-semibold">Secure Access</h3>
                <p className="text-sm text-muted-foreground">Only you have access to your connected social accounts.</p>
            </CardContent>
        </Card>
        <Card className="bg-primary/5 border-none shadow-none">
            <CardContent className="pt-6 flex flex-col items-center text-center gap-2">
                <Eye className="h-8 w-8 text-primary" />
                <h3 className="font-semibold">Transparency</h3>
                <p className="text-sm text-muted-foreground">We are clear about what data we collect and why.</p>
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
                    Welcome to AstroPost ("we," "our," or "us"). We respect your privacy and are committed to protecting your personal data. 
                    This privacy policy will inform you as to how we look after your personal data when you visit our website (regardless of where you visit it from) 
                    and tell you about your privacy rights and how the law protects you.
                </p>
            </section>

            <div className="h-px bg-border" />

            <section>
                <h2 className="flex items-center gap-2 text-2xl font-bold text-foreground">
                    <span className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary text-sm">2</span>
                    Data We Collect
                </h2>
                <p className="text-muted-foreground mb-4">
                    We may collect, use, store and transfer different kinds of personal data about you which we have grouped together follows:
                </p>
                <ul className="grid sm:grid-cols-2 gap-4 list-none pl-0">
                    <li className="bg-muted/50 p-4 rounded-lg">
                        <strong className="text-foreground block mb-1">Identity Data</strong>
                        <span className="text-sm text-muted-foreground">First name, last name, username or similar identifier.</span>
                    </li>
                    <li className="bg-muted/50 p-4 rounded-lg">
                        <strong className="text-foreground block mb-1">Contact Data</strong>
                        <span className="text-sm text-muted-foreground">Email address and communication preferences.</span>
                    </li>
                    <li className="bg-muted/50 p-4 rounded-lg">
                        <strong className="text-foreground block mb-1">Technical Data</strong>
                        <span className="text-sm text-muted-foreground">IP address, login data, browser type, and time zone setting.</span>
                    </li>
                    <li className="bg-muted/50 p-4 rounded-lg">
                        <strong className="text-foreground block mb-1">Social Media Data</strong>
                        <span className="text-sm text-muted-foreground">X (Twitter) profile info, tokens, and posted content.</span>
                    </li>
                </ul>
            </section>

            <div className="h-px bg-border" />

            <section>
                <h2 className="flex items-center gap-2 text-2xl font-bold text-foreground">
                    <span className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary text-sm">3</span>
                    How We Use Your Data
                </h2>
                <p className="text-muted-foreground mb-4">
                    We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:
                </p>
                <ul className="space-y-2 list-none pl-0 text-muted-foreground">
                    <li className="flex gap-3">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2.5 shrink-0" />
                        Where we need to perform the contract we are about to enter into or have entered into with you.
                    </li>
                    <li className="flex gap-3">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2.5 shrink-0" />
                        Where it is necessary for our legitimate interests (or those of a third party) and your interests and fundamental rights do not override those interests.
                    </li>
                    <li className="flex gap-3">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary mt-2.5 shrink-0" />
                        Where we need to comply with a legal or regulatory obligation.
                    </li>
                </ul>
            </section>

            <div className="h-px bg-border" />

            <section>
                <h2 className="flex items-center gap-2 text-2xl font-bold text-foreground">
                    <span className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/10 text-primary text-sm">4</span>
                    Data Security
                </h2>
                <p className="text-muted-foreground leading-relaxed">
                    We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used or accessed in an unauthorized way, altered or disclosed. 
                    In addition, we limit access to your personal data to those employees, agents, contractors and other third parties who have a business need to know.
                </p>
            </section>
            
             <div className="bg-muted/30 p-6 rounded-xl border flex flex-col sm:flex-row items-center justify-between gap-4 not-prose">
                <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-background rounded-full flex items-center justify-center border shadow-sm">
                        <Mail className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h4 className="font-semibold">Have questions?</h4>
                        <p className="text-sm text-muted-foreground">Contact our privacy team</p>
                    </div>
                </div>
                <a 
                    href="mailto:privacy@astropost.com" 
                    className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                >
                    Email Privacy Team
                </a>
            </div>
        </div>
      </div>
    </div>
  );
}
