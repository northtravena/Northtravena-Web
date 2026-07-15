// src/components/PageLoader.tsx
// Suspense fallback shown while a lazy-loaded page chunk is downloading.

export function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-4">
        <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-400 text-sm">Loading page…</p>
      </div>
    </div>
  );
}
