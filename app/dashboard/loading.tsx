import { StatCardsSkeleton, PageHeaderSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return (
    <div className="space-y-8">
      <PageHeaderSkeleton />
      <StatCardsSkeleton count={4} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="h-64 animate-pulse rounded-2xl border border-gray-200 bg-white shadow-sm" />
        <div className="h-64 animate-pulse rounded-2xl border border-gray-200 bg-white shadow-sm" />
      </div>
      <div className="h-80 animate-pulse rounded-2xl border border-gray-200 bg-white shadow-sm" />
    </div>
  );
}
