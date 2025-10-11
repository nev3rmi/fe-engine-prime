/**
 * Root Route Handler
 *
 * Note: This component should rarely render as middleware handles
 * redirects based on authentication status (see middleware.ts:32-42)
 * - Authenticated users → /dashboard
 * - Unauthenticated users → /login
 *
 * This loading state serves as a fallback if middleware doesn't redirect.
 * Related: FE-229 (Root Route Authentication Bypass Fix)
 */
export default function Home() {
  return (
    <div className="bg-background flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2 border-gray-900 dark:border-gray-100" />
        <p className="text-gray-600 dark:text-gray-400">Redirecting...</p>
      </div>
    </div>
  );
}
