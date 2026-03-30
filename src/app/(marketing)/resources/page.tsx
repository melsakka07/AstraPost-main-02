import Link from "next/link";
import { Book, FileText, Video, MessageSquare, ArrowRight, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Resources",
  description: "Guides, tutorials, and tools to help you succeed with AstraPost.",
  alternates: { canonical: "/resources" },
  openGraph: {
    title: "Resources — AstraPost",
    description: "Guides, tutorials, and tools to help you succeed with AstraPost.",
    url: "/resources",
  },
};

export default function ResourcesPage() {
  const resources = [
    {
      icon: <Book className="h-6 w-6 text-primary" />,
      title: "Knowledge Base",
      description: "Step-by-step guides on how to use AstraPost features.",
      link: "/docs",
      button: "View Docs",
      comingSoon: false,
    },
    {
      icon: <FileText className="h-6 w-6 text-primary" />,
      title: "API Reference",
      description: "For developers integrating with AstraPost.",
      link: null,
      button: "Read API Docs",
      comingSoon: true,
    },
    {
      icon: <Video className="h-6 w-6 text-primary" />,
      title: "Video Tutorials",
      description: "Watch our video series on mastering X growth.",
      link: null,
      button: "Watch Now",
      comingSoon: true,
    },
    {
      icon: <MessageSquare className="h-6 w-6 text-primary" />,
      title: "Community Forum",
      description: "Connect with other creators and share tips.",
      link: "/community",
      button: "Join Community",
      comingSoon: false,
    },
  ];

  return (
    <div className="relative min-h-dvh">
      {/* Background gradient */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-gradient-to-br from-primary/5 via-purple-500/5 to-pink-500/5 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 py-16 md:py-24 space-y-16">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-6">
          <Badge variant="outline" className="px-4 py-1">Resources</Badge>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight bg-gradient-to-br from-foreground via-foreground to-foreground/70 bg-clip-text text-transparent">
            Everything you need to succeed
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Everything you need to succeed with AstraPost.
          </p>
        </div>

        {/* Resources Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {resources.map((resource, index) => (
            <Card key={index} className="flex flex-col h-full hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200">
              <CardHeader>
                <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  {resource.icon}
                </div>
                <CardTitle className="text-xl">{resource.title}</CardTitle>
              </CardHeader>
              <CardContent className="flex-1">
                <p className="text-muted-foreground text-sm leading-relaxed">{resource.description}</p>
              </CardContent>
              <CardFooter>
                {resource.comingSoon ? (
                  <Button variant="outline" className="w-full" disabled>
                    <Clock className="mr-2 h-4 w-4" />
                    Coming Soon
                  </Button>
                ) : (
                  <Button variant="outline" className="w-full group" asChild>
                    <Link href={resource.link!}>
                      {resource.button}
                      <ArrowRight className="ms-2 h-4 w-4 transition-transform group-hover:translate-x-1 rtl:scale-x-[-1] rtl:group-hover:-translate-x-1" />
                    </Link>
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>

        {/* Support CTA */}
        <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-muted/50 to-muted/20 p-8 md:p-12 text-center max-w-4xl mx-auto">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-purple-500/5 to-pink-500/5" />
          <div className="relative">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">Need personalized help?</h2>
            <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
              Our support team is available 24/7 to assist you with any questions or issues.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" asChild>
                <Link href="mailto:support@astrapost.com">Contact Support</Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/docs">Browse Documentation</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
