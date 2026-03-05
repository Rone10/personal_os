import { Suspense } from "react";
import ResourcesPageClient from "./_components/ResourcesPageClient";

export default function ResourcesPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 flex justify-center text-slate-500">
          Loading Resources…
        </div>
      }
    >
      <ResourcesPageClient />
    </Suspense>
  );
}
