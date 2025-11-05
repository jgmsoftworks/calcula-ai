import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlanRestrictedArea } from "@/components/planos/PlanRestrictedArea";
import { EstoqueReceitas } from "@/components/vitrine/EstoqueReceitas";
import { EntradasReceitas } from "@/components/vitrine/EntradasReceitas";
import { SaidasReceitas } from "@/components/vitrine/SaidasReceitas";
import { HistoricoReceitas } from "@/components/vitrine/HistoricoReceitas";

export default function Vitrine() {
  const [activeTab, setActiveTab] = useState("estoque");

  return (
    <PlanRestrictedArea 
      requiredPlan="professional"
      feature="Vitrine de Receitas"
      variant="overlay"
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gradient-primary">🏪 Vitrine</h1>
            <p className="text-muted-foreground mt-2">
              Controle o estoque de suas receitas prontas
            </p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="estoque" className="flex items-center gap-2">
              📦 Estoque
            </TabsTrigger>
            <TabsTrigger value="entradas" className="flex items-center gap-2">
              📥 Entradas
            </TabsTrigger>
            <TabsTrigger value="saidas" className="flex items-center gap-2">
              📤 Saídas
            </TabsTrigger>
            <TabsTrigger value="historico" className="flex items-center gap-2">
              📊 Histórico
            </TabsTrigger>
          </TabsList>

          <TabsContent value="estoque">
            <EstoqueReceitas />
          </TabsContent>

          <TabsContent value="entradas">
            <EntradasReceitas />
          </TabsContent>

          <TabsContent value="saidas">
            <SaidasReceitas />
          </TabsContent>

          <TabsContent value="historico">
            <HistoricoReceitas />
          </TabsContent>
        </Tabs>
      </div>
    </PlanRestrictedArea>
  );
}