import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSuggestions } from "@/hooks/useSuggestions";
import { Send, Lightbulb } from "lucide-react";

const suggestionSchema = z.object({
  title: z.string().min(5, "Título deve ter pelo menos 5 caracteres").max(100, "Título muito longo"),
  description: z.string().min(20, "Descrição deve ter pelo menos 20 caracteres").max(1000, "Descrição muito longa"),
  category: z.enum(["bug", "improvement", "feature"], {
    required_error: "Selecione uma categoria",
  }),
  impact: z.enum(["low", "medium", "high"], {
    required_error: "Selecione o nível de impacto",
  }),
  urgency: z.enum(["low", "medium", "high"], {
    required_error: "Selecione o nível de urgência",
  }),
  allow_contact: z.boolean().default(false),
});

type SuggestionFormData = z.infer<typeof suggestionSchema>;

export const SuggestionForm = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { createSuggestion, loading } = useSuggestions();

  const form = useForm<SuggestionFormData>({
    resolver: zodResolver(suggestionSchema),
    defaultValues: {
      title: "",
      description: "",
      category: undefined,
      impact: undefined,
      urgency: undefined,
      allow_contact: false,
    },
  });

  const onSubmit = async (data: SuggestionFormData) => {
    setIsSubmitting(true);
    try {
      const result = await createSuggestion({
        title: data.title,
        description: data.description,
        category: data.category,
        impact: data.impact,
        urgency: data.urgency,
        allow_contact: data.allow_contact,
      });
      if (result.success) {
        form.reset();
      }
    } catch (error) {
      console.error("Erro ao enviar sugestão:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const categoryLabels = {
    bug: "Bug / Problema",
    improvement: "Melhoria",
    feature: "Novo Recurso"
  };

  const levelLabels = {
    low: "Baixo",
    medium: "Médio",
    high: "Alto"
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-primary" />
          Enviar Nova Sugestão
        </CardTitle>
        <CardDescription>
          Ajude-nos a melhorar o CalculaAI! Suas sugestões são valiosas para o desenvolvimento da plataforma.
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Título da Sugestão *</FormLabel>
                      <FormControl>
                        <Input 
                          placeholder="Ex: Melhorar filtros no dashboard" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a categoria" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(categoryLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="impact"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nível de Impacto *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o impacto" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(levelLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="urgency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nível de Urgência *</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a urgência" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(levelLabels).map(([value, label]) => (
                          <SelectItem key={value} value={value}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição Detalhada *</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Descreva sua sugestão de forma detalhada. Inclua o contexto, benefícios esperados e qualquer informação adicional que possa ajudar no desenvolvimento."
                      className="min-h-[120px]"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="allow_contact"
              render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-1 leading-none">
                    <FormLabel>
                      Permitir contato para esclarecimentos
                    </FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Autorizo o contato da equipe para esclarecer dúvidas sobre esta sugestão.
                    </p>
                  </div>
                </FormItem>
              )}
            />

            <div className="flex justify-between items-center">
              <p className="text-sm text-muted-foreground">
                Você pode enviar até 3 sugestões por dia.
              </p>
              
              <Button 
                type="submit" 
                disabled={isSubmitting || loading}
                className="flex items-center gap-2"
              >
                {isSubmitting ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <Send className="h-4 w-4" />
                )}
                {isSubmitting ? "Enviando..." : "Enviar Sugestão"}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};