import { Suspense } from "react";
import HifzPageClient from "./_components/HifzPageClient";

export default function HifzPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 flex justify-center text-slate-500">
          Loading Hifz Tracker…
        </div>
      }
    >
      <HifzPageClient />
    </Suspense>
  );
}
