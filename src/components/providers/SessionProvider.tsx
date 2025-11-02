"use client";

import { useSession } from "@/lib/auth-client";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";

interface SessionProviderProps {
  children: React.ReactNode;
}

export function SessionProvider({ children }: SessionProviderProps) {
  const { data: session, isPending, error } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [debugInfo, setDebugInfo] = useState<string>("");
  const [loadingTimeout, setLoadingTimeout] = useState<boolean>(false);

  const publicRoutes = ['/login', '/signup'];
  const isPublicRoute = publicRoutes.includes(pathname) || 
                       pathname.startsWith('/hybridaction') || 
                       pathname.startsWith('/api/') ||
                       pathname.startsWith('/_next/') ||
                       pathname.includes('chrome-extension');

  useEffect(() => {
    if (isPending) {
      const timeout = setTimeout(() => {
        setLoadingTimeout(true);
      }, 5000);

      return () => clearTimeout(timeout);
    } else {
      setLoadingTimeout(false);
    }
  }, [isPending]);

  useEffect(() => {
    const debugMsg = `Session: ${JSON.stringify(session)}, isPending: ${isPending}, error: ${error}, pathname: ${pathname}`;
    setDebugInfo(debugMsg);
    console.log("SessionProvider Debug:", debugMsg);

    if (isPending) return;

    if (error) {
      console.error("Session error:", error);
      router.push('/login');
      return;
    }

    if (!session?.user) {
      if (!isPublicRoute) {
        router.push('/login');
      }
      return;
    }

    if (session?.user && (pathname === '/login' || pathname === '/signup')) {
      router.push('/');
      return;
    }
  }, [session, isPending, error, pathname, isPublicRoute, router]);

  if (error) {
    return (
      <div className="min-h-screen bg-linear-to-br from-red-50 to-red-100 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">Authentication Error</div>
          <p className="text-red-500 mb-4">{error.message || "Failed to load session"}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            Retry
          </button>
          <div className="mt-4 text-xs text-gray-500 max-w-md">
            Debug: {debugInfo}
          </div>
        </div>
      </div>
    );
  }

  if (isPending) {
    return (
      <div className="min-h-screen bg-linear-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">
            {loadingTimeout ? "Taking longer than expected..." : "Loading session..."}
          </p>
          {loadingTimeout && (
            <div className="mt-4">
              <button 
                onClick={() => router.push('/login')} 
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 mr-2"
              >
                Go to Login
              </button>
              <button 
                onClick={() => window.location.reload()} 
                className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
              >
                Reload
              </button>
            </div>
          )}
          <div className="mt-4 text-xs text-gray-500 max-w-md">
            Debug: {debugInfo}
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
