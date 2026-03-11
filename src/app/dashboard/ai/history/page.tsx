import { headers } from "next/headers";
import Link from "next/link";
import { eq, desc } from "drizzle-orm";
import { Sparkles, History, RefreshCcw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { aiGenerations } from "@/lib/schema";

export default async function AiHistoryPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;

  const history = await db.query.aiGenerations.findMany({
    where: eq(aiGenerations.userId, session.user.id),
    orderBy: [desc(aiGenerations.createdAt)],
    limit: 50,
  });

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 md:space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">AI Generation History</h1>
          <p className="text-muted-foreground">Review and reuse your past AI-generated content.</p>
        </div>
        <Link href="/dashboard/compose">
          <Button>
            <Sparkles className="mr-2 h-4 w-4" />
            New Content
          </Button>
        </Link>
      </div>

      {history.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-12 text-center">
          <History className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
          <CardTitle>No history yet</CardTitle>
          <CardDescription>Start using the AI tools to see your history here.</CardDescription>
          <Link href="/dashboard/compose" className="mt-4">
            <Button variant="outline">Go to Composer</Button>
          </Link>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {history.map((item) => (
            <Card key={item.id} className="overflow-hidden">
              <CardHeader className="bg-muted/30 py-3 flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="capitalize">
                    {item.type}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {new Date(item.createdAt).toLocaleString()}
                  </span>
                </div>
                <div className="flex gap-2">
                    <Link href={`/dashboard/compose?restore=${item.id}`}>
                        <Button variant="ghost" size="sm" className="h-8">
                            <RefreshCcw className="h-3.5 w-3.5 mr-2" />
                            Reuse
                        </Button>
                    </Link>
                </div>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                {item.inputPrompt && (
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Prompt</span>
                    <p className="text-sm line-clamp-2 text-foreground/80">{item.inputPrompt}</p>
                  </div>
                )}
                <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-wider">Output</span>
                    <div className="bg-muted/50 rounded p-3 text-sm whitespace-pre-wrap">
                        {renderOutput(item)}
                    </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function renderOutput(item: any) {
    const content = item.outputContent;
    if (!content) return "No content";

    if (item.type === "thread" && Array.isArray(content.tweets)) {
        return content.tweets.map((t: string, i: number) => `[Tweet ${i+1}]\n${t}`).join("\n\n");
    }
    
    if (item.type === "hashtags" && Array.isArray(content.hashtags)) {
        return content.hashtags.join(" ");
    }

    if (content.text) return content.text;
    if (content.tweets && Array.isArray(content.tweets)) return content.tweets.join("\n\n");

    return typeof content === 'string' ? content : JSON.stringify(content, null, 2);
}
