import { ArrowUp } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface Feedback {
  id: string;
  title: string;
  description: string;
  category: string;
  status: string;
  upvotes: number;
  hasUpvoted: boolean;
  user: {
      name: string;
      image: string;
  };
  createdAt: string;
}

interface FeedbackItemProps {
  item: Feedback;
  onUpvote: (id: string) => void;
  isVoting: boolean;
}

export function FeedbackItem({ item, onUpvote, isVoting }: FeedbackItemProps) {
  return (
    <div className="flex gap-4 p-4 border rounded-lg bg-card hover:bg-accent/5 transition-colors">
      <div className="flex flex-col items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          className={cn(
            "flex flex-col h-auto py-2 px-3 gap-1 min-w-[3.5rem]",
            item.hasUpvoted && "border-primary bg-primary/10 text-primary hover:bg-primary/20"
          )}
          onClick={() => onUpvote(item.id)}
          disabled={isVoting}
        >
          <ArrowUp className={cn("h-4 w-4", item.hasUpvoted && "fill-current")} />
          <span className="font-bold">{item.upvotes}</span>
        </Button>
      </div>
      <div className="flex-1 space-y-2">
        <div className="flex items-start justify-between">
          <h3 className="font-semibold text-lg">{item.title}</h3>
          <span className={cn(
              "text-xs px-2 py-1 rounded-full capitalize font-medium",
              item.status === "completed" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
              item.status === "in_progress" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
              item.status === "planned" ? "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" :
              "bg-muted text-muted-foreground"
          )}>
            {item.status.replace("_", " ")}
          </span>
        </div>
        <p className="text-muted-foreground text-sm line-clamp-2">{item.description}</p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
          <Avatar className="h-5 w-5">
            <AvatarImage src={item.user.image} />
            <AvatarFallback>{item.user.name[0]}</AvatarFallback>
          </Avatar>
          <span>{item.user.name}</span>
          <span>•</span>
          <span className="capitalize">{item.category}</span>
        </div>
      </div>
    </div>
  );
}
