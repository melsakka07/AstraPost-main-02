import Link from "next/link";
import { FileText, Rocket, Shield, CreditCard, LayoutGrid } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

export default function DocsPage() {
  const categories = [
    {
      title: "Getting Started",
      icon: <Rocket className="h-5 w-5" />,
      description: "Learn the basics of setting up your AstroPost account.",
      articles: [
        { title: "Introduction to AstroPost", href: "/docs/intro" },
        { title: "Connecting Your Social Accounts", href: "/docs/connecting-accounts" },
        { title: "Your First Post", href: "/docs/first-post" },
      ]
    },
    {
      title: "Core Features",
      icon: <LayoutGrid className="h-5 w-5" />,
      description: "Master the tools to create and schedule content.",
      articles: [
        { title: "Using the Smart Scheduler", href: "/docs/scheduler" },
        { title: "Generating Content with AI", href: "/docs/ai-writer" },
        { title: "Creating Threads (Sard)", href: "/docs/threads" },
        { title: "Affiliate Link Generator", href: "/docs/affiliate" },
      ]
    },
    {
      title: "Account & Billing",
      icon: <CreditCard className="h-5 w-5" />,
      description: "Manage your subscription and team settings.",
      articles: [
        { title: "Plans and Pricing", href: "/docs/pricing" },
        { title: "Managing Your Subscription", href: "/docs/subscription" },
        { title: "Team Management", href: "/docs/teams" },
      ]
    },
    {
      title: "Security & Privacy",
      icon: <Shield className="h-5 w-5" />,
      description: "How we protect your data and account.",
      articles: [
        { title: "Two-Factor Authentication", href: "/docs/2fa" },
        { title: "GDPR & Data Export", href: "/docs/gdpr" },
        { title: "Privacy Policy", href: "/privacy" },
      ]
    }
  ];

  return (
    <div className="container mx-auto px-4 py-16 max-w-5xl space-y-12">
      <div className="text-center space-y-6 max-w-2xl mx-auto">
        <Badge variant="outline">Documentation</Badge>
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight">How can we help?</h1>
        <p className="text-xl text-muted-foreground">
          Everything you need to know about using AstroPost effectively.
        </p>
        
        <div className="relative max-w-md mx-auto">
          <Input 
            type="search" 
            placeholder="Search documentation..." 
            className="pl-10 h-12 bg-background shadow-sm"
          />
          <div className="absolute left-3 top-3.5 text-muted-foreground">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8 pt-8">
        {categories.map((category, index) => (
          <div key={index} className="bg-card border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary">
                {category.icon}
              </div>
              <div>
                <h2 className="text-xl font-bold">{category.title}</h2>
                <p className="text-sm text-muted-foreground">{category.description}</p>
              </div>
            </div>
            
            <ul className="space-y-3 pl-13 ml-12 border-l border-muted pl-4">
              {category.articles.map((article, i) => (
                <li key={i}>
                  <Link 
                    href={article.href} 
                    className="group flex items-center text-sm font-medium hover:text-primary transition-colors"
                  >
                    <FileText className="h-3.5 w-3.5 mr-2 text-muted-foreground group-hover:text-primary" />
                    {article.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      
      <div className="bg-muted/30 rounded-xl p-8 text-center mt-12 border border-dashed">
        <h3 className="text-lg font-semibold mb-2">Can't find what you're looking for?</h3>
        <p className="text-muted-foreground mb-4">Our support team is here to help you get back on track.</p>
        <Link href="mailto:support@astropost.com" className="text-primary font-medium hover:underline">
          Contact Support &rarr;
        </Link>
      </div>
    </div>
  );
}
