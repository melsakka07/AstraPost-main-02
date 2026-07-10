"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

interface SidebarContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
}

const SidebarContext = createContext<SidebarContextValue>({
  open: false,
  setOpen: () => {},
});

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const value = useMemo(() => ({ open, setOpen }), [open]);
  return <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>;
}

export function useSidebar() {
  return useContext(SidebarContext);
}
