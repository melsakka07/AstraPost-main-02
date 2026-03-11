import { useState, useEffect } from "react";
import { LayoutTemplate, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SYSTEM_TEMPLATES, Template, fetchUserTemplates, deleteUserTemplate } from "@/lib/templates";

interface TemplatesDialogProps {
  onSelect: (tweets: string[]) => void;
}

export function TemplatesDialog({ onSelect }: TemplatesDialogProps) {
  const [open, setOpen] = useState(false);
  const [userTemplates, setUserTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("system");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await fetchUserTemplates();
      setUserTemplates(data);
    } catch (error) {
      console.error(error);
      // toast.error("Failed to load your templates"); // Silently fail or show error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && activeTab === "my-templates") {
      loadTemplates();
    }
  }, [open, activeTab]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this template?")) return;
    try {
      await deleteUserTemplate(id);
      setUserTemplates(prev => prev.filter(t => t.id !== id));
      toast.success("Template deleted");
    } catch (error) {
      toast.error("Failed to delete template");
    }
  };

  const handleSelect = (template: Template) => {
    onSelect(template.content);
    setOpen(false);
  };

  const systemCategories = ["all", "Educational", "Promotional", "Personal", "Engagement"];

  const filteredSystem = selectedCategory === "all" 
    ? SYSTEM_TEMPLATES 
    : SYSTEM_TEMPLATES.filter(t => t.category === selectedCategory);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full justify-start gap-2">
          <LayoutTemplate className="h-4 w-4" />
          Templates
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl h-[600px] flex flex-col">
        <DialogHeader>
          <DialogTitle>Content Templates</DialogTitle>
          <DialogDescription>
            Choose a proven template or use one of your own.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
          <TabsList className="mb-4">
            <TabsTrigger value="system">System Templates</TabsTrigger>
            <TabsTrigger value="my-templates">My Templates</TabsTrigger>
          </TabsList>

          <TabsContent value="system" className="flex-1 flex flex-col overflow-hidden">
            <div className="flex gap-2 pb-4 overflow-x-auto">
              {systemCategories.map(cat => (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(cat)}
                  className="capitalize"
                >
                  {cat}
                </Button>
              ))}
            </div>

            <ScrollArea className="flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
                {filteredSystem.map(template => (
                  <div 
                    key={template.id} 
                    className="border rounded-lg p-4 hover:border-primary cursor-pointer transition-colors flex flex-col gap-2 bg-card text-card-foreground"
                    onClick={() => handleSelect(template)}
                  >
                    <div className="flex justify-between items-start">
                      <h3 className="font-semibold">{template.title}</h3>
                      <Badge variant="secondary" className="capitalize">{template.category}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{template.description}</p>
                    <div className="mt-2 p-2 bg-muted/50 rounded text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap font-mono">
                      {template.content[0]}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="my-templates" className="flex-1 flex flex-col overflow-hidden">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : userTemplates.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <p>No templates found.</p>
                <p className="text-sm">Save your drafts as templates to see them here.</p>
              </div>
            ) : (
              <ScrollArea className="flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-4">
                  {userTemplates.map(template => (
                    <div 
                      key={template.id} 
                      className="border rounded-lg p-4 hover:border-primary cursor-pointer transition-colors flex flex-col gap-2 relative group bg-card text-card-foreground"
                      onClick={() => handleSelect(template)}
                    >
                      <div className="flex justify-between items-start">
                        <h3 className="font-semibold">{template.title}</h3>
                        <Badge variant="secondary" className="capitalize">{template.category}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{template.description || "No description"}</p>
                      <div className="mt-2 p-2 bg-muted/50 rounded text-xs text-muted-foreground line-clamp-3 whitespace-pre-wrap font-mono">
                        {template.content[0]}
                      </div>
                      
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6"
                        onClick={(e) => handleDelete(e, template.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
