import { CardGridSkeleton, PageHeaderSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:py-10 sm:px-6 lg:px-8">
        <PageHeaderSkeleton />
        <CardGridSkeleton count={8} />
      </div>
    </div>
  );
}
