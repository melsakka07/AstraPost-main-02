"use client";

import { useEffect, useState } from "react";
import { Plus, Loader2, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Feedback, FeedbackItem } from "./feedback-item";

const feedbackSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(10, "Description must be at least 10 characters"),
  category: z.enum(["feature", "bug", "other"]),
});

type FeedbackFormValues = z.infer<typeof feedbackSchema>;

export function FeedbackList({ isLoggedIn }: { isLoggedIn: boolean }) {
  const [items, setItems] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVoting, setIsVoting] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("all");

  const form = useForm<FeedbackFormValues>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "feature",
    },
  });

  const fetchFeedback = async () => {
    try {
      const res = await fetch("/api/feedback");
      const data = await res.json();
      setItems(data.items || []);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load roadmap");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeedback();
  }, []);

  const onUpvote = async (id: string) => {
    if (!isLoggedIn) {
      toast.error("Please login to vote");
      window.location.href = "/login";
      return;
    }

    setIsVoting(id);
    try {
      const res = await fetch(`/api/feedback/${id}/upvote`, {
        method: "POST",
      });
      
      if (!res.ok) throw new Error("Vote failed");
      
      const { voted } = await res.json();
      
      // Optimistic update
      setItems(prev => prev.map(item => {
        if (item.id === id) {
          return {
            ...item,
            hasUpvoted: voted,
            upvotes: voted ? item.upvotes + 1 : item.upvotes - 1
          };
        }
        return item;
      }).sort((a, b) => b.upvotes - a.upvotes)); // Re-sort

      toast.success(voted ? "Upvoted!" : "Vote removed");
    } catch (error) {
      toast.error("Failed to vote");
    } finally {
      setIsVoting(null);
    }
  };

  const onSubmit = async (data: FeedbackFormValues) => {
    if (!isLoggedIn) return;
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) throw new Error("Failed to submit");

      toast.success("Feedback submitted!");
      setOpen(false);
      form.reset();
      fetchFeedback(); // Refresh list
    } catch (error) {
      toast.error("Something went wrong");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getFilteredItems = (status: string) => {
    if (status === "all") return items;
    if (status === "planned") return items.filter(i => i.status === "planned" || i.status === "in_progress");
    if (status === "completed") return items.filter(i => i.status === "completed");
    if (status === "pending") return items.filter(i => i.status === "pending");
    return items;
  };

  const filteredItems = getFilteredItems(activeTab);

  if (loading) {
      return (
          <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
      )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="planned">In Progress</TabsTrigger>
            <TabsTrigger value="completed">Completed</TabsTrigger>
            <TabsTrigger value="pending">Ideas</TabsTrigger>
          </TabsList>
        </Tabs>

        {isLoggedIn ? (
            <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button>
                <Plus className="mr-2 h-4 w-4" />
                Submit Idea
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                <DialogTitle>Submit Feedback</DialogTitle>
                <DialogDescription>
                    Share your ideas, report bugs, or request features.
                </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Title</FormLabel>
                        <FormControl>
                            <Input placeholder="e.g. Add Instagram Reels Support" {...field} />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a category" />
                            </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                            <SelectItem value="feature">Feature Request</SelectItem>
                            <SelectItem value="bug">Bug Report</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                            <Textarea 
                                placeholder="Describe your idea in detail..." 
                                className="min-h-[100px]"
                                {...field} 
                            />
                        </FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Submit
                        </Button>
                    </div>
                </form>
                </Form>
            </DialogContent>
            </Dialog>
        ) : (
            <Button asChild>
                <a href="/login?redirect=/roadmap">Login to Submit</a>
            </Button>
        )}
      </div>

      <div className="space-y-4">
         {filteredItems.length === 0 ? (
             <div className="text-center py-20 border rounded-xl border-dashed bg-muted/30">
                 <MessageSquare className="h-10 w-10 mx-auto text-muted-foreground mb-4 opacity-50" />
                 <h3 className="text-lg font-medium">No feedback found</h3>
                 <p className="text-muted-foreground">Be the first to submit an idea!</p>
             </div>
         ) : (
             filteredItems.map(item => (
                 <FeedbackItem 
                    key={item.id} 
                    item={item} 
                    onUpvote={onUpvote}
                    isVoting={isVoting === item.id}
                 />
             ))
         )}
      </div>
    </div>
  );
}
