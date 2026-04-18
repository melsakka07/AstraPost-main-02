"use client";

import dynamic from "next/dynamic";

const GlobalAdminSearch = dynamic(() =>
  import("@/components/admin/global-search").then((mod) => mod.GlobalAdminSearch)
);

export function GlobalAdminSearchWrapper() {
  return <GlobalAdminSearch />;
}
