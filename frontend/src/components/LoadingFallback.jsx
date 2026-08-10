/**
 * Loading Fallback Components
 * Used with React Suspense for lazy-loaded components
 */

import { memo } from 'react';

/**
 * Page Loading Spinner
 * Full-page loading indicator for route transitions
 */
export const PageLoadingFallback = memo(() => (
  <div className="page-bg flex items-center justify-center">
    <div className="text-center">
      <div className="spinner mx-auto mb-4"></div>
      <p className="text-theme-secondary font-medium">Loading...</p>
    </div>
  </div>
));

PageLoadingFallback.displayName = 'PageLoadingFallback';

/**
 * Component Loading Spinner
 * Inline loading indicator for lazy-loaded components
 */
export const ComponentLoadingFallback = memo(() => (
  <div className="flex justify-center items-center py-12">
    <div className="spinner"></div>
  </div>
));

ComponentLoadingFallback.displayName = 'ComponentLoadingFallback';

/**
 * Card Loading Skeleton
 * Skeleton loader for employee cards
 */
export const CardLoadingSkeleton = memo(() => (
  <div className="card animate-pulse">
    <div className="h-6 skeleton w-3/4 mb-2"></div>
    <div className="h-5 skeleton w-1/2 mb-4"></div>
    <div className="space-y-2">
      <div className="h-4 skeleton w-full"></div>
      <div className="h-4 skeleton w-5/6"></div>
      <div className="h-4 skeleton w-4/6"></div>
      <div className="h-4 skeleton w-3/6"></div>
    </div>
    <div className="flex gap-2 mt-6 pt-4 border-t border-theme">
      <div className="h-9 skeleton flex-1"></div>
      <div className="h-9 skeleton flex-1"></div>
    </div>
  </div>
));

CardLoadingSkeleton.displayName = 'CardLoadingSkeleton';

/**
 * List Loading Skeleton
 * Skeleton loader for employee list
 */
export const ListLoadingSkeleton = memo(({ count = 6 }) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    {Array.from({ length: count }).map((_, index) => (
      <CardLoadingSkeleton key={index} />
    ))}
  </div>
));

ListLoadingSkeleton.displayName = 'ListLoadingSkeleton';

export default PageLoadingFallback;
