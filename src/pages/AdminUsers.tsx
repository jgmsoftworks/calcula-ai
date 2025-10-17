import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, Store, User, Crown, Building2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { EditUserPlanModal } from '@/components/admin/EditUserPlanModal';

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  business_name: string | null;
  plan: string;
  created_at: string;
  cnpj_cpf: string | null;
}

interface FornecedorStatus {
  user_id: string;
  eh_fornecedor: boolean;
  fornecedor_id: string | null;
}

export default function AdminUsers() {
  const { isAdmin, loading } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [fornecedorStatus, setFornecedorStatus] = useState<Map<string, FornecedorStatus>>(new Map());
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<string>("all");
  const [confirmAction, setConfirmAction] = useState<{
    userId: string;
    userName: string;
    action: "add" | "remove";
  } | null>(null);
  const [processingUserId, setProcessingUserId] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);

      // Fetch user profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, user_id, full_name, business_name, plan, created_at, cnpj_cpf")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      setUsers(profiles || []);

      // Fetch fornecedor status for all users
      const { data: fornecedores, error: fornecedoresError } = await supabase
        .from("fornecedores")
        .select("user_id, eh_fornecedor, id")
        .eq("eh_fornecedor", true);

      if (fornecedoresError) throw fornecedoresError;

      const statusMap = new Map<string, FornecedorStatus>();
      fornecedores?.forEach((f) => {
        statusMap.set(f.user_id, {
          user_id: f.user_id,
          eh_fornecedor: f.eh_fornecedor,
          fornecedor_id: f.id,
        });
      });

      setFornecedorStatus(statusMap);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar usuários",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleToggleFornecedor = async (userId: string, currentStatus: boolean) => {
    try {
      setProcessingUserId(userId);

      const { data, error } = await supabase.functions.invoke("admin-toggle-fornecedor-role", {
        body: { userId, setAsFornecedor: !currentStatus },
      });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: data.message,
      });

      // Refresh data
      await fetchUsers();
    } catch (error: any) {
      toast({
        title: "Erro ao alterar status",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessingUserId(null);
      setConfirmAction(null);
    }
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      searchTerm === "" ||
      user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.business_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.cnpj_cpf?.includes(searchTerm);

    const matchesPlan = selectedPlan === "all" || user.plan === selectedPlan;

    return matchesSearch && matchesPlan;
  });

  const getPlanBadge = (plan: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "outline"; label: string }> = {
      free: { variant: "secondary", label: "Free" },
      professional: { variant: "default", label: "Professional" },
      enterprise: { variant: "outline", label: "Enterprise" },
    };

    const planConfig = variants[plan] || { variant: "secondary", label: plan };
    return <Badge variant={planConfig.variant}>{planConfig.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              Acesso negado. Apenas administradores podem acessar esta página.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gerenciar Usuários</h1>
          <p className="text-muted-foreground">
            Gerencie permissões de fornecedores e status de usuários
          </p>
        </div>
        <Badge variant="outline">
          {filteredUsers.length} usuário{filteredUsers.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, negócio ou documento..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedPlan} onValueChange={setSelectedPlan}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filtrar por plano" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os planos</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {loadingUsers ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredUsers.map((user) => {
            const isFornecedor = fornecedorStatus.get(user.user_id)?.eh_fornecedor || false;
            const isProcessing = processingUserId === user.user_id;

            return (
              <Card key={user.id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-lg">
                          {user.full_name || "Nome não informado"}
                        </h3>
                        {getPlanBadge(user.plan)}
                      </div>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        {user.business_name && (
                          <p className="flex items-center gap-2">
                            <Building2 className="h-3 w-3" />
                            {user.business_name}
                          </p>
                        )}
                        {user.cnpj_cpf && <p>Doc: {user.cnpj_cpf}</p>}
                        <p>Cadastro: {new Date(user.created_at).toLocaleDateString("pt-BR")}</p>
                      </div>
                      <div className="flex items-center gap-2 pt-2">
                        <Badge variant={isFornecedor ? "default" : "secondary"}>
                          {isFornecedor ? (
                            <>
                              <Store className="h-3 w-3 mr-1" />
                              Fornecedor
                            </>
                          ) : (
                            <>
                              <User className="h-3 w-3 mr-1" />
                              Cliente
                            </>
                          )}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingUser(user)}
                      >
                        <Crown className="h-4 w-4 mr-1" />
                        Plano
                      </Button>
                      <Button
                        variant={isFornecedor ? "destructive" : "default"}
                        size="sm"
                        disabled={isProcessing}
                        onClick={() =>
                          setConfirmAction({
                            userId: user.user_id,
                            userName: user.full_name || user.business_name || "este usuário",
                            action: isFornecedor ? "remove" : "add",
                          })
                        }
                      >
                        {isProcessing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : isFornecedor ? (
                          "Remover Fornecedor"
                        ) : (
                          "Tornar Fornecedor"
                        )}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {filteredUsers.length === 0 && (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  Nenhum usuário encontrado com os filtros aplicados
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <AlertDialog open={!!confirmAction} onOpenChange={() => setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar alteração</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmAction?.action === "add" ? (
                <>
                  Deseja transformar <strong>{confirmAction.userName}</strong> em fornecedor?
                  <br />
                  <br />
                  Este usuário ganhará acesso ao painel de fornecedor e aparecerá no marketplace.
                </>
              ) : (
                <>
                  Deseja remover <strong>{confirmAction?.userName}</strong> da lista de fornecedores?
                  <br />
                  <br />
                  Este usuário perderá acesso ao painel de fornecedor e será removido do marketplace.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmAction) {
                  const currentStatus = confirmAction.action === "remove";
                  handleToggleFornecedor(confirmAction.userId, currentStatus);
                }
              }}
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de edição de plano */}
      {editingUser && (
        <EditUserPlanModal
          open={!!editingUser}
          onOpenChange={(open) => !open && setEditingUser(null)}
          user={editingUser}
          onSuccess={fetchUsers}
        />
      )}
    </div>
  );
}
