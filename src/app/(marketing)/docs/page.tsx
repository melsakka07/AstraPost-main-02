import { Badge } from "@/components/ui/badge";

export default function DocsPage() {
  const categories = [
    {
      title: "Getting Started",
      articles: [
        { title: "Introduction to AstroPost", link: "#" },
        { title: "Setting up your account", link: "#" },
        { title: "Connecting X (Twitter) Account", link: "#" },
      ]
    },
    {
      title: "Features",
      articles: [
        { title: "Scheduling Tweets & Threads", link: "#" },
        { title: "Using the AI Writer", link: "#" },
        { title: "Understanding Analytics", link: "#" },
        { title: "Affiliate Link Generator", link: "#" },
      ]
    },
    {
      title: "Billing & Account",
      articles: [
        { title: "Managing your subscription", link: "#" },
        { title: "Team Management", link: "#" },
        { title: "Account Security", link: "#" },
      ]
    }
  ];

  return (
    <div className="container mx-auto px-4 py-16 max-w-5xl space-y-12">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 border-b pb-6">
        <div>
          <Badge variant="outline" className="mb-2">Documentation</Badge>
          <h1 className="text-4xl font-bold tracking-tight">How can we help?</h1>
        </div>
        <div className="relative w-full md:w-auto mt-4 md:mt-0">
          <input 
            type="search" 
            placeholder="Search docs..." 
            className="w-full md:w-64 pl-10 pr-4 py-2 rounded-md border focus:outline-none focus:ring-2 focus:ring-primary text-sm"
          />
          <svg className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        {categories.map((category, index) => (
          <div key={index} className="space-y-4">
            <h2 className="text-xl font-bold">{category.title}</h2>
            <ul className="space-y-2">
              {category.articles.map((article, i) => (
                <li key={i}>
                  <a href={article.link} className="text-muted-foreground hover:text-primary transition-colors text-sm block py-1">
                    {article.title}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
