import { ListSkeleton, PageHeaderSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
        <PageHeaderSkeleton />
        <ListSkeleton count={4} />
      </div>
    </div>
  );
}
