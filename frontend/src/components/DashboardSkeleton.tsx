/**
 * DashboardSkeleton Component
 * Displays a loading skeleton during auth hydration to prevent flickering
 */

export default function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-white lg:bg-gray-50">
      {/* Header Skeleton */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="px-6 py-4 flex items-center justify-between">
          {/* Logo/Brand */}
          <div className="h-8 w-32 bg-gray-200 rounded animate-pulse" />
          {/* Header Right Side */}
          <div className="flex items-center gap-4">
            <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse" />
            <div className="h-8 w-8 bg-gray-200 rounded-full animate-pulse" />
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar Skeleton */}
        <aside className="w-56 bg-white border-r border-gray-200">
          <nav className="p-6 space-y-4">
            {/* Sidebar Items */}
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="h-10 bg-gray-200 rounded animate-pulse"
              />
            ))}
          </nav>
        </aside>

        {/* Main Content Skeleton */}
        <main className="flex-1 p-6">
          {/* Page Header */}
          <div className="mb-8">
            <div className="h-8 w-48 bg-gray-200 rounded animate-pulse mb-4" />
            <div className="h-5 w-96 bg-gray-100 rounded animate-pulse" />
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="bg-white p-6 rounded-lg border border-gray-200"
              >
                <div className="h-5 w-20 bg-gray-200 rounded animate-pulse mb-3" />
                <div className="h-8 w-32 bg-gray-200 rounded animate-pulse" />
              </div>
            ))}
          </div>

          {/* Chart/Table Skeleton */}
          <div className="bg-white p-6 rounded-lg border border-gray-200">
            <div className="h-6 w-32 bg-gray-200 rounded animate-pulse mb-6" />
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-12 bg-gray-100 rounded animate-pulse"
                />
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
