import { Suspense } from 'react';
import StudyPageClient from './_components/StudyPageClient';

/**
 * Next.js build requirement:
 * `useSearchParams()` triggers a CSR bailout and must be inside a Suspense boundary.
 * We keep the page itself as a Server Component wrapper and render the full Study UI
 * in a Client Component (`StudyPageClient`).
 */
export default function StudyPage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 flex justify-center text-slate-500">
          Loading Study Center…
        </div>
      }
    >
      <StudyPageClient />
    </Suspense>
  );
}

