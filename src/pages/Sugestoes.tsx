import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { MessageSquarePlus, MapPin } from "lucide-react";
import { SuggestionForm } from "@/components/sugestoes/SuggestionForm";
import { RoadmapList } from "@/components/sugestoes/RoadmapList";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";

export default function Sugestoes() {
  const [activeTab, setActiveTab] = useState<"suggestions" | "roadmap">("suggestions");
  const { user, loading } = useAuth();

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

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "suggestions" | "roadmap")}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="suggestions" className="flex items-center gap-2">
            <MessageSquarePlus className="h-4 w-4" />
            Enviar Sugestão
          </TabsTrigger>
          <TabsTrigger value="roadmap" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Próximas Atualizações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="suggestions" className="space-y-6">
          <Card className="p-6">
            <SuggestionForm />
          </Card>
        </TabsContent>

        <TabsContent value="roadmap" className="space-y-6">
          <RoadmapList />
        </TabsContent>
      </Tabs>
    </div>
  );
}