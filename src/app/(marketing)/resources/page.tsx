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
      icon: <Book className="text-primary h-6 w-6" />,
      title: "Knowledge Base",
      description: "Step-by-step guides on how to use AstraPost features.",
      link: "/docs",
      button: "View Docs",
      comingSoon: false,
    },
    {
      icon: <FileText className="text-primary h-6 w-6" />,
      title: "API Reference",
      description: "For developers integrating with AstraPost.",
      link: null,
      button: "Read API Docs",
      comingSoon: true,
    },
    {
      icon: <Video className="text-primary h-6 w-6" />,
      title: "Video Tutorials",
      description: "Watch our video series on mastering X growth.",
      link: null,
      button: "Watch Now",
      comingSoon: true,
    },
    {
      icon: <MessageSquare className="text-primary h-6 w-6" />,
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
        <div className="from-primary/5 absolute top-0 left-1/2 h-[800px] w-[800px] -translate-x-1/2 rounded-full bg-gradient-to-br via-purple-500/5 to-pink-500/5 blur-3xl" />
      </div>

      <div className="container mx-auto space-y-16 px-4 py-16 md:py-24">
        {/* Header */}
        <div className="mx-auto max-w-3xl space-y-6 text-center">
          <Badge variant="outline" className="px-4 py-1">
            Resources
          </Badge>
          <h1 className="from-foreground via-foreground to-foreground/70 bg-gradient-to-br bg-clip-text text-4xl font-bold tracking-tight text-transparent md:text-6xl">
            Everything you need to succeed
          </h1>
          <p className="text-muted-foreground mx-auto max-w-2xl text-xl leading-relaxed">
            Everything you need to succeed with AstraPost.
          </p>
        </div>

        {/* Resources Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {resources.map((resource, index) => (
            <Card
              key={index}
              className="flex h-full flex-col transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg"
            >
              <CardHeader>
                <div className="bg-primary/10 mb-4 flex h-10 w-10 items-center justify-center rounded-lg">
                  {resource.icon}
                </div>
                <CardTitle className="text-xl">{resource.title}</CardTitle>
              </CardHeader>
              <CardContent className="flex-1">
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {resource.description}
                </p>
              </CardContent>
              <CardFooter>
                {resource.comingSoon ? (
                  <Button variant="outline" className="w-full" disabled>
                    <Clock className="mr-2 h-4 w-4" />
                    Coming Soon
                  </Button>
                ) : (
                  <Button variant="outline" className="group w-full" asChild>
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
        <div className="border-border/50 from-muted/50 to-muted/20 relative mx-auto max-w-4xl overflow-hidden rounded-2xl border bg-gradient-to-br p-8 text-center md:p-12">
          <div className="from-primary/5 absolute inset-0 bg-gradient-to-r via-purple-500/5 to-pink-500/5" />
          <div className="relative">
            <h2 className="mb-4 text-2xl font-bold md:text-3xl">Need personalized help?</h2>
            <p className="text-muted-foreground mx-auto mb-8 max-w-lg">
              Our support team is available 24/7 to assist you with any questions or issues.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
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
