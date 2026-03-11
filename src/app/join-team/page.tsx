"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

function JoinTeamContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      toast.error("Invalid invitation link");
      router.push("/dashboard");
    }
  }, [token, router]);

  async function handleJoin() {
    setIsLoading(true);
    try {
      const res = await fetch("/api/team/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || result.message || "Failed to join team");
      }

      toast.success("Successfully joined the team!");
      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setIsLoading(false);
    }
  }

  if (!token) return null;

  return (
    <Card className="w-full max-w-md mx-auto mt-20">
      <CardHeader className="text-center">
        <div className="mx-auto bg-primary/10 p-3 rounded-full w-fit mb-4">
            <Users className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl">Join Team Workspace</CardTitle>
        <CardDescription>
          You have been invited to join a team on AstroPost.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center text-muted-foreground">
        Click the button below to accept the invitation and access the team workspace.
      </CardContent>
      <CardFooter>
        <Button className="w-full" size="lg" onClick={handleJoin} disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Accept Invitation
        </Button>
      </CardFooter>
    </Card>
  );
}

export default function JoinTeamPage() {
    return (
        <div className="container flex h-screen w-screen flex-col items-center justify-center">
            <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin text-primary" />}>
                <JoinTeamContent />
            </Suspense>
        </div>
    )
}
