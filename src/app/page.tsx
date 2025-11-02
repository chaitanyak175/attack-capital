"use client";

import { DialingInterface } from "@/components/DialingInterface";
import { CallHistory } from "@/components/CallHistory";
import { useSession, signOut } from "@/lib/auth-client";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function Home() {
  const { data: session } = useSession();

  const handleSignOut = async () => {
    try {
      await signOut();
      console.log("Successfully signed out");
    } catch (error) {
      console.error("Sign out error:", error);
      alert("Failed to sign out");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Card className="w-full rounded-none border-x-0 border-t-0">
        <CardHeader className="w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold tracking-tight">AMD Dashboard</h1>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">
                Welcome, {session?.user?.name || session?.user?.email || "User"}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
              >
                Sign Out
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="w-full py-6 px-4 sm:px-6 lg:px-8">
        <Card className="w-full">
          <CardContent className="p-6">
            <Tabs defaultValue="dial" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="dial">Dial Interface</TabsTrigger>
                <TabsTrigger value="history">Call History</TabsTrigger>
              </TabsList>
              <TabsContent value="dial" className="mt-6">
                <DialingInterface />
              </TabsContent>
              <TabsContent value="history" className="mt-6">
                <CallHistory />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
