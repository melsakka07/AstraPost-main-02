
import type { TemplateAiMeta } from "@/lib/ai/template-prompts";

export interface Template {
  id: string;
  title: string;
  description?: string | null;
  content: string[];
  category: string;
  isUserTemplate?: boolean;
  aiMeta?: TemplateAiMeta | null;
}

export const SYSTEM_TEMPLATES: Template[] = [
  {
    id: "educational-thread",
    title: "How-To Guide",
    description: "Teach your audience a new skill in simple steps.",
    category: "Educational",
    content: [
      "How to master [SKILL] in [NUMBER] steps 🧵👇",
      "1️⃣ Step One: The Foundation\n\nStart by...",
      "2️⃣ Step Two: The Process\n\nNext, you need to...",
      "3️⃣ Step Three: The Polish\n\nFinally, ensure that...",
      "💡 Summary:\n\n- Point 1\n- Point 2\n- Point 3\n\nSave this for later! 🔖"
    ]
  },
  {
    id: "storytelling-thread",
    title: "Personal Story",
    description: "Share a personal experience or lesson learned.",
    category: "Personal",
    content: [
      "I used to struggle with [PROBLEM].\n\nHere is how I overcame it (and how you can too): 🧵",
      "It started when...",
      "I tried everything, but nothing worked until...",
      "The turning point was...",
      "Here is what I learned:\n\n[LESSON]",
      "If you are going through this, remember: [ADVICE]"
    ]
  },
  {
    id: "contrarian-take",
    title: "Contrarian Take",
    description: "Challenge a common belief in your niche.",
    category: "Engagement",
    content: [
      "Unpopular opinion: [BELIEF] is wrong. ❌\n\nHere is why: 🧵",
      "Most people think...",
      "But the reality is...",
      "Data/Experience shows that...",
      "Instead, you should focus on...",
      "Do you agree? Let's discuss below! 👇"
    ]
  },
  {
    id: "listicle-thread",
    title: "Curated List",
    description: "Share a list of tools, resources, or tips.",
    category: "Educational",
    content: [
      "10 tools that will save you 100+ hours this year 🛠️\n\nA thread 🧵",
      "1. [TOOL NAME]\n\nBest for: [USE CASE]\nLink: [URL]",
      "2. [TOOL NAME]\n\nBest for: [USE CASE]\nLink: [URL]",
      "3. [TOOL NAME]\n\nBest for: [USE CASE]\nLink: [URL]",
      "Which one is your favorite?"
    ]
  },
  {
    id: "product-launch",
    title: "Product Launch",
    description: "Announce a new product or feature.",
    category: "Promotional",
    content: [
      "🚀 BIG NEWS: We are finally launching [PRODUCT]!\n\nHere is what makes it special: 🧵",
      "Problem: [PAIN POINT]",
      "Solution: [PRODUCT]",
      "Feature 1: [BENEFIT]",
      "Feature 2: [BENEFIT]",
      "Get it here: [LINK] 🔗\n\n#Launch #Startup"
    ]
  }
];

export async function fetchUserTemplates(): Promise<Template[]> {
  const res = await fetch("/api/templates");
  if (!res.ok) throw new Error("Failed to fetch templates");
  const data = await res.json();
  return data.map((t: any) => ({
    ...t,
    isUserTemplate: true
  }));
}

export async function deleteUserTemplate(id: string): Promise<void> {
  const res = await fetch(`/api/templates/${id}`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete template");
}

export async function createUserTemplate(template: Omit<Template, "id" | "isUserTemplate">): Promise<Template> {
  const res = await fetch("/api/templates", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(template),
  });
  if (!res.ok) throw new Error("Failed to create template");
  const data = await res.json();
  return { ...data, isUserTemplate: true };
}

export { type TemplateAiMeta } from "@/lib/ai/template-prompts";
