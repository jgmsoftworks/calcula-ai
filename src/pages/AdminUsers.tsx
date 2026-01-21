import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, Store, User, Crown, Building2, Mail, Clock, Calendar, CheckCircle, AlertCircle, MailCheck } from "lucide-react";
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

interface MergedUser {
  user_id: string;
  email: string | null;
  email_confirmed_at: string | null;
  last_sign_in_at: string | null;
  created_at: string;
  full_name: string | null;
  business_name: string | null;
  plan: string;
  cnpj_cpf: string | null;
  has_profile: boolean;
  eh_fornecedor: boolean;
  fornecedor_id: string | null;
}

export default function AdminUsers() {
  const { isAdmin, loading } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<MergedUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPlan, setSelectedPlan] = useState<string>("all");
  const [selectedEmailStatus, setSelectedEmailStatus] = useState<string>("all");
  const [confirmAction, setConfirmAction] = useState<{
    userId: string;
    userName: string;
    action: "add" | "remove";
  } | null>(null);
  const [confirmEmailAction, setConfirmEmailAction] = useState<{
    userId: string;
    email: string;
  } | null>(null);
  const [processingUserId, setProcessingUserId] = useState<string | null>(null);
  const [confirmingEmailUserId, setConfirmingEmailUserId] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<MergedUser | null>(null);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);

      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('Sessão não encontrada');
      }

      const { data, error } = await supabase.functions.invoke('admin-list-all-users', {
        headers: {
          Authorization: `Bearer ${session.session.access_token}`
        }
      });

      if (error) throw error;

      setUsers(data.users || []);
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

  const handleConfirmEmail = async (userId: string) => {
    try {
      setConfirmingEmailUserId(userId);

      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error('Sessão não encontrada');
      }

      const { data, error } = await supabase.functions.invoke('admin-confirm-user-email', {
        headers: {
          Authorization: `Bearer ${session.session.access_token}`
        },
        body: { userId }
      });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: data.message,
      });

      await fetchUsers();
    } catch (error: any) {
      toast({
        title: "Erro ao confirmar email",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setConfirmingEmailUserId(null);
      setConfirmEmailAction(null);
    }
  };

  const filteredUsers = users.filter((user) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      searchTerm === "" ||
      user.full_name?.toLowerCase().includes(searchLower) ||
      user.business_name?.toLowerCase().includes(searchLower) ||
      user.cnpj_cpf?.includes(searchTerm) ||
      user.email?.toLowerCase().includes(searchLower);

    const matchesPlan = selectedPlan === "all" || user.plan === selectedPlan;

    const matchesEmailStatus = 
      selectedEmailStatus === "all" ||
      (selectedEmailStatus === "verified" && user.email_confirmed_at) ||
      (selectedEmailStatus === "pending" && !user.email_confirmed_at);

    return matchesSearch && matchesPlan && matchesEmailStatus;
  });

  const formatLastSignIn = (lastSignIn: string | null | undefined) => {
    if (!lastSignIn) return 'Nunca acessou';
    
    const date = new Date(lastSignIn);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Hoje';
    if (diffDays === 1) return 'Ontem';
    if (diffDays < 7) return `há ${diffDays} dias`;
    if (diffDays < 30) return `há ${Math.floor(diffDays / 7)} semanas`;
    if (diffDays < 365) return `há ${Math.floor(diffDays / 30)} meses`;
    return `há ${Math.floor(diffDays / 365)} anos`;
  };

  const getPlanBadge = (plan: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "outline"; label: string }> = {
      free: { variant: "secondary", label: "Free" },
      professional: { variant: "default", label: "Professional" },
      enterprise: { variant: "outline", label: "Enterprise" },
    };

    const planConfig = variants[plan] || { variant: "secondary", label: plan };
    return <Badge variant={planConfig.variant}>{planConfig.label}</Badge>;
  };

  const getEmailStatusBadge = (emailConfirmedAt: string | null) => {
    if (emailConfirmedAt) {
      return (
        <Badge variant="default" className="bg-emerald-600/90 hover:bg-emerald-600">
          <CheckCircle className="h-3 w-3 mr-1" />
          Email verificado
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="bg-amber-500/90 text-white hover:bg-amber-500">
        <AlertCircle className="h-3 w-3 mr-1" />
        Aguardando verificação
      </Badge>
    );
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
            Gerencie permissões de fornecedores, planos e verificação de email
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
          <div className="flex gap-4 flex-wrap">
            <div className="flex-1 min-w-[250px]">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, email, negócio ou documento..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedPlan} onValueChange={setSelectedPlan}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filtrar por plano" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os planos</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="professional">Professional</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
            <Select value={selectedEmailStatus} onValueChange={setSelectedEmailStatus}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Status do email" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="verified">Email verificado</SelectItem>
                <SelectItem value="pending">Aguardando verificação</SelectItem>
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
            const isProcessing = processingUserId === user.user_id;
            const isConfirmingEmail = confirmingEmailUserId === user.user_id;

            return (
              <Card key={user.user_id}>
                <CardContent className="pt-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-lg">
                          {user.full_name || user.email?.split('@')[0] || "Nome não informado"}
                        </h3>
                        {getPlanBadge(user.plan)}
                        {getEmailStatusBadge(user.email_confirmed_at)}
                        {!user.has_profile && (
                          <Badge variant="outline" className="text-xs">
                            Sem perfil
                          </Badge>
                        )}
                      </div>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        {user.email && (
                          <p className="flex items-center gap-2">
                            <Mail className="h-3 w-3" />
                            {user.email}
                          </p>
                        )}
                        {user.business_name && (
                          <p className="flex items-center gap-2">
                            <Building2 className="h-3 w-3" />
                            {user.business_name}
                          </p>
                        )}
                        {user.cnpj_cpf && <p>Doc: {user.cnpj_cpf}</p>}
                        <div className="flex items-center gap-4 flex-wrap">
                          <p className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Cadastro: {new Date(user.created_at).toLocaleDateString("pt-BR")}
                          </p>
                          <p className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Último acesso: {formatLastSignIn(user.last_sign_in_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pt-2">
                        <Badge variant={user.eh_fornecedor ? "default" : "secondary"}>
                          {user.eh_fornecedor ? (
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
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      {!user.email_confirmed_at && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={isConfirmingEmail}
                          onClick={() =>
                            setConfirmEmailAction({
                              userId: user.user_id,
                              email: user.email || "",
                            })
                          }
                          className="border-emerald-600 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                        >
                          {isConfirmingEmail ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <>
                              <MailCheck className="h-4 w-4 mr-1" />
                              Confirmar Email
                            </>
                          )}
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setEditingUser(user)}
                      >
                        <Crown className="h-4 w-4 mr-1" />
                        Plano
                      </Button>
                      <Button
                        variant={user.eh_fornecedor ? "destructive" : "default"}
                        size="sm"
                        disabled={isProcessing}
                        onClick={() =>
                          setConfirmAction({
                            userId: user.user_id,
                            userName: user.full_name || user.business_name || "este usuário",
                            action: user.eh_fornecedor ? "remove" : "add",
                          })
                        }
                      >
                        {isProcessing ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : user.eh_fornecedor ? (
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

      {/* Dialog de confirmação para fornecedor */}
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

      {/* Dialog de confirmação para email */}
      <AlertDialog open={!!confirmEmailAction} onOpenChange={() => setConfirmEmailAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar verificação de email</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja confirmar manualmente o email <strong>{confirmEmailAction?.email}</strong>?
              <br />
              <br />
              Após a confirmação, o usuário poderá fazer login normalmente no sistema.
              Um perfil será criado automaticamente se ainda não existir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmEmailAction) {
                  handleConfirmEmail(confirmEmailAction.userId);
                }
              }}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              Confirmar Email
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal de edição de plano */}
      {editingUser && (
        <EditUserPlanModal
          open={!!editingUser}
          onOpenChange={(open) => !open && setEditingUser(null)}
          user={{
            user_id: editingUser.user_id,
            full_name: editingUser.full_name || '',
            business_name: editingUser.business_name || '',
            plan: editingUser.plan
          }}
          onSuccess={fetchUsers}
        />
      )}
    </div>
  );
}
