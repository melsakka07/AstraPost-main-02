import { Badge } from "@/components/ui/badge";

export default function ChangelogPage() {
  const releases = [
    {
      version: "v0.1.0",
      date: "March 9, 2026",
      title: "Initial Release",
      description: "Welcome to AstroPost! We've launched with core features to help you schedule and create content for X.",
      changes: [
        { type: "new", content: "Smart Scheduler: Drag & drop calendar interface." },
        { type: "new", content: "AI Writer: Generate threads and hooks using GPT-4o." },
        { type: "new", content: "Affiliate Generator: Create product promotion tweets instantly." },
        { type: "new", content: "Analytics Dashboard: Track impressions and engagement." },
        { type: "fix", content: "Resolved authentication issues with X API." },
      ]
    },
    {
      version: "v0.0.5",
      date: "February 20, 2026",
      title: "Beta Preview",
      description: "Private beta release for early adopters.",
      changes: [
        { type: "new", content: "Basic post composer." },
        { type: "new", content: "User authentication via Twitter." },
        { type: "imp", content: "Improved mobile responsiveness." },
      ]
    }
  ];

  return (
    <div className="container mx-auto px-4 py-16 max-w-4xl space-y-12">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">Changelog</h1>
        <p className="text-muted-foreground">Stay up to date with the latest features and improvements.</p>
      </div>

      <div className="relative border-l border-muted ml-4 md:ml-0 space-y-12 pl-8 md:pl-0">
        {releases.map((release, index) => (
          <div key={index} className="relative md:grid md:grid-cols-4 gap-8">
            <div className="md:text-right md:pr-8 mb-4 md:mb-0">
              <div className="absolute -left-[3.25rem] md:left-auto md:right-[-2.3rem] top-1.5 h-3 w-3 rounded-full border bg-background ring-4 ring-muted" />
              <h3 className="font-bold text-lg">{release.version}</h3>
              <time className="text-sm text-muted-foreground">{release.date}</time>
            </div>
            
            <div className="md:col-span-3 bg-card border rounded-xl p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-2">{release.title}</h2>
              <p className="text-muted-foreground mb-6">{release.description}</p>
              
              <ul className="space-y-3">
                {release.changes.map((change, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <Badge variant={
                      change.type === "new" ? "default" : 
                      change.type === "fix" ? "destructive" : "secondary"
                    } className="uppercase text-[10px] px-1.5 py-0.5 h-5 mt-0.5 shrink-0">
                      {change.type}
                    </Badge>
                    <span>{change.content}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
