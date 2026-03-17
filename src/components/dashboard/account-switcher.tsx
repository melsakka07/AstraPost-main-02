
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ChevronsUpDown, Check, Plus, Search } from "lucide-react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

type Team = {
  id: string;
  name: string;
  image: string | null;
  role?: string;
  isPersonal?: boolean;
  isOwner?: boolean;
};

interface AccountSwitcherProps {
  user: {
    id: string;
    name: string;
    image: string | null;
  };
  currentTeamId: string;
  teams: {
    team: Team;
    role: string;
  }[];
}

export function AccountSwitcher({ user, currentTeamId, teams }: AccountSwitcherProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  // Construct the full list of selectable accounts
  // 1. Personal Workspace
  const personalTeam: Team = {
    id: user.id,
    name: "Personal Workspace",
    image: user.image,
    role: "owner",
    isPersonal: true,
    isOwner: true,
  };

  // 2. Team memberships
  const otherTeams = teams.map((t) => ({
    id: t.team.id,
    name: t.team.name,
    image: t.team.image,
    role: t.role,
    isPersonal: false,
  }));

  const allTeams = [personalTeam, ...otherTeams];
  
  const selectedTeam = allTeams.find((t) => t.id === currentTeamId) || personalTeam;

  const filteredTeams = allTeams.filter(t => 
    t.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const personalTeamsFiltered = filteredTeams.filter(t => t.isPersonal);
  const otherTeamsFiltered = filteredTeams.filter(t => !t.isPersonal);

  const handleTeamSelect = async (team: Team) => {
    setOpen(false);

    try {
      const res = await fetch("/api/team/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId: team.id }),
      });

      if (!res.ok) {
        toast.error("Failed to switch workspace");
        return;
      }

      toast.success(`Switched to ${team.name}`);
      router.refresh();
    } catch {
      toast.error("Failed to switch workspace");
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Select a team"
          className="w-auto justify-between gap-1.5 px-2 sm:w-[200px] sm:gap-2 sm:px-3"
        >
          <Avatar className="h-6 w-6 shrink-0">
            <AvatarImage
              src={selectedTeam.image || `https://avatar.vercel.sh/${selectedTeam.id}.png`}
              alt={selectedTeam.name}
            />
            <AvatarFallback>SC</AvatarFallback>
          </Avatar>
          <span className="hidden truncate sm:block sm:flex-1">{selectedTeam.name}</span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0">
        <div className="p-2">
            <div className="flex items-center border-b px-3 pb-2 mb-2">
                <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
                <Input 
                    placeholder="Search team..." 
                    className="flex h-6 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 border-0 focus-visible:ring-0 px-0"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>
            
            <div className="max-h-[300px] overflow-y-auto">
                {personalTeamsFiltered.length > 0 && (
                    <div className="mb-2">
                        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Personal Account</div>
                        {personalTeamsFiltered.map(team => (
                            <div
                                key={team.id}
                                onClick={() => handleTeamSelect(team)}
                                className={cn(
                                    "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                                    selectedTeam.id === team.id && "bg-accent text-accent-foreground"
                                )}
                            >
                                <Avatar className="mr-2 h-5 w-5">
                                    <AvatarImage
                                        src={team.image || `https://avatar.vercel.sh/${team.id}.png`}
                                        alt={team.name}
                                    />
                                    <AvatarFallback>SC</AvatarFallback>
                                </Avatar>
                                {team.name}
                                {selectedTeam.id === team.id && (
                                    <Check className="ml-auto h-4 w-4" />
                                )}
                            </div>
                        ))}
                    </div>
                )}
                
                {otherTeamsFiltered.length > 0 && (
                     <div className="mb-2">
                        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">Teams</div>
                        {otherTeamsFiltered.map(team => (
                            <div
                                key={team.id}
                                onClick={() => handleTeamSelect(team)}
                                className={cn(
                                    "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                                    selectedTeam.id === team.id && "bg-accent text-accent-foreground"
                                )}
                            >
                                <Avatar className="mr-2 h-5 w-5">
                                    <AvatarImage
                                        src={team.image || `https://avatar.vercel.sh/${team.id}.png`}
                                        alt={team.name}
                                        className="grayscale"
                                    />
                                    <AvatarFallback>SC</AvatarFallback>
                                </Avatar>
                                {team.name}
                                {selectedTeam.id === team.id && (
                                    <Check className="ml-auto h-4 w-4" />
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {filteredTeams.length === 0 && (
                    <div className="py-6 text-center text-sm">No team found.</div>
                )}
            </div>
            
            <Separator className="my-2" />
            
            <div
                onClick={() => {
                  setOpen(false);
                  router.push("/dashboard/settings/team");
                }}
                className="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-accent hover:text-accent-foreground"
            >
                <Plus className="mr-2 h-4 w-4" />
                Create Team
            </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
