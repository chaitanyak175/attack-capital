"use client";

import { cn } from "@/lib/utils";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card, CardHeader, CardContent } from "@/components/ui/Card";
import { Mail, Lock, User } from "lucide-react";

interface AuthSwitchProps {
  onSignIn?: (email: string, password: string) => void;
  onSignUp?: (email: string, password: string, name: string) => void;
  className?: string;
  disabled?: boolean;
}

export const AuthSwitch = ({ onSignIn, onSignUp, className, disabled = false }: AuthSwitchProps) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isSignUp) {
        onSignUp?.(email, password, name);
      } else {
        onSignIn?.(email, password);
      }
    } catch (error) {
      console.error("Auth error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setEmail("");
    setPassword("");
    setName("");
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    resetForm();
  };


  return (
    <div className={cn("w-full max-w-md mx-auto", className)}>
      {/* Header with animated background */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 opacity-90"></div>
        <div className="absolute inset-0 bg-gradient-to-r from-blue-400 via-purple-400 to-indigo-400 opacity-50 animate-pulse"></div>
        
        <Card className="relative backdrop-blur-sm bg-white/95 border-0 shadow-2xl">
          <CardHeader className="text-center pb-2">
            {/* Animated Logo */}
            <div className="flex items-center justify-center mb-6">
              <div className="relative">
                <div className="h-16 w-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center shadow-lg transform transition-transform duration-300 hover:scale-110">
                  <div className="h-8 w-8 rounded-full bg-white flex items-center justify-center">
                    <div className="h-4 w-4 rounded-full bg-gradient-to-r from-blue-500 to-purple-600"></div>
                  </div>
                </div>
                <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 opacity-30 blur animate-pulse"></div>
              </div>
            </div>

            {/* Animated Title */}
            <div className="space-y-2">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent transition-all duration-500">
                {isSignUp ? "Join Us Today" : "Welcome Back"}
              </h1>
              <p className="text-gray-600 transition-all duration-500">
                {isSignUp 
                  ? "Create your account to get started" 
                  : "Sign in to continue to your account"
                }
              </p>
            </div>

            {/* Mode Toggle Tabs */}
            <div className="flex bg-gray-100 rounded-lg p-1 mt-6 relative">
              <div 
                className={cn(
                  "absolute top-1 bottom-1 left-1 right-1/2 bg-white rounded-md shadow-sm transition-all duration-300 ease-in-out",
                  isSignUp && "left-1/2 right-1"
                )}
              ></div>
              <button
                type="button"
                onClick={() => !isSignUp && toggleMode()}
                className={cn(
                  "flex-1 py-2 px-4 text-sm font-medium rounded-md transition-all duration-300 relative z-10",
                  !isSignUp ? "text-gray-900" : "text-gray-500 hover:text-gray-700"
                )}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => isSignUp && toggleMode()}
                className={cn(
                  "flex-1 py-2 px-4 text-sm font-medium rounded-md transition-all duration-300 relative z-10",
                  isSignUp ? "text-gray-900" : "text-gray-500 hover:text-gray-700"
                )}
              >
                Sign Up
              </button>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className={cn(
                "space-y-4 transition-all duration-500 ease-in-out",
                isSignUp ? "opacity-100 max-h-96" : "opacity-100 max-h-64"
              )}>
                {isSignUp && (
                  <div className="animate-in slide-in-from-top-2 duration-300">
                    <Input
                      label="Full Name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Enter your full name"
                      required
                      disabled={isLoading || disabled}
                      leftIcon={<User className="h-4 w-4" />}
                    />
                  </div>
                )}

                <Input
                  label="Email Address"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  disabled={isLoading || disabled}
                  leftIcon={<Mail className="h-4 w-4" />}
                />

                <Input
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  disabled={isLoading || disabled}
                  leftIcon={<Lock className="h-4 w-4" />}
                />
              </div>

              {!isSignUp && (
                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center space-x-2">
                    <input type="checkbox" className="rounded border-gray-300" />
                    <span className="text-gray-600">Remember me</span>
                  </label>
                  <button
                    type="button"
                    className="text-blue-600 hover:text-blue-500 transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98]"
                disabled={isLoading || disabled}
                size="lg"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin -ml-1 mr-3 h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                    {isSignUp ? "Creating Account..." : "Signing In..."}
                  </>
                ) : (
                  <>
                    {isSignUp ? "Create Account" : "Sign In"}
                    <svg className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </Button>
            </form>

            {/* Terms and Privacy */}
            {isSignUp && (
              <p className="text-xs text-gray-500 text-center animate-in fade-in duration-300">
                By creating an account, you agree to our{" "}
                <button className="text-blue-600 hover:underline">Terms of Service</button>
                {" "}and{" "}
                <button className="text-blue-600 hover:underline">Privacy Policy</button>
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AuthSwitch;
