import { CardGridSkeleton, PageHeaderSkeleton } from "@/components/ui/skeletons";

export default function Loading() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-[1800px] px-4 py-8 sm:py-14 lg:py-16 sm:px-6 lg:px-8 2xl:px-16">
        <PageHeaderSkeleton />
        <CardGridSkeleton count={8} />
      </div>
    </div>
  );
}
