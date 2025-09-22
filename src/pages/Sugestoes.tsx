import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { MessageSquarePlus, MapPin, Settings } from "lucide-react";
import { SuggestionForm } from "@/components/sugestoes/SuggestionForm";
import { RoadmapList } from "@/components/sugestoes/RoadmapList";
import { AdminPanel } from "@/components/sugestoes/AdminPanel";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Sugestoes() {
  const [activeTab, setActiveTab] = useState<"suggestions" | "roadmap" | "admin">("roadmap");
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center space-x-3">
        <MessageSquarePlus className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Sugestões & Roadmap</h1>
          <p className="text-muted-foreground">
            Envie suas sugestões e acompanhe as próximas atualizações
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "suggestions" | "roadmap" | "admin")}>
        <TabsList className={`grid w-full ${isAdmin ? 'grid-cols-3' : 'grid-cols-2'}`}>
          {isAdmin && (
            <TabsTrigger value="admin" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Admin
            </TabsTrigger>
          )}
          <TabsTrigger value="roadmap" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Próximas Atualizações
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="suggestions" className="flex items-center gap-2">
              <MessageSquarePlus className="h-4 w-4" />
              Enviar Sugestão
            </TabsTrigger>
          )}
        </TabsList>

        {!isAdmin && (
          <Alert className="mt-6">
            <MessageSquarePlus className="h-4 w-4" />
            <AlertDescription>
              O envio de sugestões foi temporariamente restrito aos administradores. 
              Continue acompanhando nosso roadmap de atualizações!
            </AlertDescription>
          </Alert>
        )}

        {isAdmin && (
          <TabsContent value="admin" className="space-y-6">
            <AdminPanel />
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="suggestions" className="space-y-6">
            <Card className="p-6">
              <SuggestionForm />
            </Card>
          </TabsContent>
        )}

        <TabsContent value="roadmap" className="space-y-6">
          <RoadmapList />
        </TabsContent>
      </Tabs>
    </div>
  );
}