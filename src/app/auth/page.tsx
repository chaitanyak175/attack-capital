"use client";

import AuthSwitch from "@/components/ui/auth-switch";
import { useRouter } from "next/navigation";
import { signIn, signUp, useSession } from "@/lib/auth-client";
import { useEffect, useState } from "react";

export default function AuthPage() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (session?.user && !isPending) {
      console.log("User authenticated, redirecting to dashboard");
      router.push("/");
    }
  }, [session, isPending, router]);

  useEffect(() => {
    if (isPending) {
      const timeout = setTimeout(() => {
        console.warn("Auth loading timeout, forcing reload");
        window.location.reload();
      }, 10000);
      
      return () => clearTimeout(timeout);
    }
  }, [isPending]);

  const handleSignIn = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const result = await signIn.email({ 
        email, 
        password,
        callbackURL: "/"
      });
      
      if (result.error) {
        console.error("Sign in error:", result.error.message || "Failed to sign in");
        alert(result.error.message || "Failed to sign in");
        return;
      }
      
      console.log("Successfully signed in!");
      router.push("/");
    } catch (error: any) {
      console.error("Sign in error:", error);
      alert(error?.message || "Failed to sign in");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (email: string, password: string, name: string) => {
    try {
      setIsLoading(true);
      const result = await signUp.email({ 
        email, 
        password, 
        name,
        callbackURL: "/"
      });
      
      if (result.error) {
        console.error("Sign up error:", result.error.message || "Failed to create account");
        alert(result.error.message || "Failed to create account");
        return;
      }
      
      console.log("Account created successfully!");
      router.push("/");
    } catch (error: any) {
      console.error("Sign up error:", error);
      alert(error?.message || "Failed to create account");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    try {
      setIsLoading(true);
      const result = await signIn.email({ 
        email: "demo@attackcapital.com", 
        password: "demo123",
        callbackURL: "/"
      });
      
      if (result.error) {
        console.error("Demo login failed:", result.error.message);
        alert("Demo login failed. Please use the sign up form to create an account.");
        return;
      }
      
      console.log("Demo login successful!");
      router.push("/");
    } catch (error: any) {
      console.error("Demo login error:", error);
      alert("Demo login failed. Please use the sign up form.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isPending) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (session?.user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">AMD System</h1>
          <p className="text-gray-600">Advanced Answering Machine Detection</p>
        </div>
        
        <AuthSwitch 
          onSignIn={handleSignIn}
          onSignUp={handleSignUp}
          className="shadow-xl"
          disabled={isLoading}
        />
        
        {/* Demo User Block */}
        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-gradient-to-br from-blue-50 to-indigo-100 text-gray-500">or try demo</span>
            </div>
          </div>
          
          <div className="mt-4 p-4 bg-white/80 backdrop-blur-sm rounded-lg border border-gray-200 shadow-lg">
            <div className="text-center mb-3">
              <h3 className="text-sm font-semibold text-gray-800">Demo User Access</h3>
              <p className="text-xs text-gray-600 mt-1">
                Experience the AMD system with pre-configured demo data
              </p>
            </div>
            
            <button
              onClick={handleDemoLogin}
              className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-medium py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-md hover:shadow-lg flex items-center justify-center space-x-2"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>Continue as Demo User</span>
            </button>
            
            <div className="mt-3 text-xs text-gray-500 text-center">
              <div className="flex items-center justify-center space-x-4">
                <span>• No registration required</span>
                <span>• Sample call data</span>
                <span>• Full feature access</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Secure authentication powered by Better Auth
          </p>
        </div>
      </div>
    </div>
  );
}
