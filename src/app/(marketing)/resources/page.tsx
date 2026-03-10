import Link from "next/link";
import { Book, FileText, Video, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

export default function ResourcesPage() {
  const resources = [
    {
      icon: <Book className="h-6 w-6 text-primary" />,
      title: "Knowledge Base",
      description: "Step-by-step guides on how to use AstroPost features.",
      link: "/docs",
      button: "View Docs"
    },
    {
      icon: <FileText className="h-6 w-6 text-primary" />,
      title: "API Reference",
      description: "For developers integrating with AstroPost.",
      link: "/docs/api",
      button: "Read API Docs"
    },
    {
      icon: <Video className="h-6 w-6 text-primary" />,
      title: "Video Tutorials",
      description: "Watch our video series on mastering X growth.",
      link: "#",
      button: "Watch Now"
    },
    {
      icon: <MessageSquare className="h-6 w-6 text-primary" />,
      title: "Community Forum",
      description: "Connect with other creators and share tips.",
      link: "/community",
      button: "Join Community"
    }
  ];

  return (
    <div className="container mx-auto px-4 py-16 space-y-12">
      <div className="text-center max-w-2xl mx-auto space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">Resources</h1>
        <p className="text-xl text-muted-foreground">
          Everything you need to succeed with AstroPost.
        </p>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {resources.map((resource, index) => (
          <Card key={index} className="flex flex-col h-full hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                {resource.icon}
              </div>
              <CardTitle className="text-xl">{resource.title}</CardTitle>
            </CardHeader>
            <CardContent className="flex-1">
              <p className="text-muted-foreground text-sm">{resource.description}</p>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full" asChild>
                <Link href={resource.link}>{resource.button}</Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <div className="bg-muted/50 rounded-2xl p-8 md:p-12 text-center max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold mb-4">Need personalized help?</h2>
        <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
          Our support team is available 24/7 to assist you with any questions or issues.
        </p>
        <Button size="lg" asChild>
          <Link href="mailto:support@astropost.com">Contact Support</Link>
        </Button>
      </div>
    </div>
  );
}
