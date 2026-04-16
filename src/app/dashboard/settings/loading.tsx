import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <div className="space-y-6">
      {/* Profile section */}
      <div id="profile" className="scroll-mt-24 space-y-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-6 w-48" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
        <Skeleton className="h-16 w-full" />
      </div>

      {/* Subscription section */}
      <div id="subscription" className="scroll-mt-24 space-y-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5" />
            <Skeleton className="h-6 w-32" />
          </div>
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>

      {/* Connected accounts section */}
      <div id="accounts" className="scroll-mt-24">
        <div className="grid gap-6 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-4">
              <div className="flex items-center gap-2">
                <Skeleton className="h-5 w-5" />
                <Skeleton className="h-6 w-32" />
              </div>
              <Skeleton className="h-24 w-full" />
            </div>
          ))}
        </div>
      </div>

      {/* Voice profile section */}
      <div id="voice" className="scroll-mt-24">
        <Skeleton className="h-48 w-full" />
      </div>

      {/* Notifications section */}
      <div id="notifications" className="scroll-mt-24">
        <Skeleton className="h-48 w-full" />
      </div>

      {/* Privacy section */}
      <div id="privacy" className="scroll-mt-24">
        <Skeleton className="h-48 w-full" />
      </div>
    </div>
  );
}
