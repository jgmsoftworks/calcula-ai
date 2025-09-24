import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useBackupManager } from "@/hooks/useBackupManager";
import { 
  Database, 
  Download, 
  Trash2, 
  RefreshCw, 
  HardDrive, 
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Archive
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export const BackupPanel = () => {
  const {
    backups,
    loading,
    stats,
    createBackup,
    deleteBackup,
    downloadBackup,
    fetchBackups,
    formatFileSize
  } = useBackupManager();

  const [creatingBackup, setCreatingBackup] = useState(false);
  const [backupType, setBackupType] = useState<'full' | 'incremental'>('full');

  const statusLabels = {
    in_progress: "Em Progresso",
    completed: "Concluído",
    failed: "Falhou"
  };

  const statusColors = {
    in_progress: "bg-yellow-100 text-yellow-800",
    completed: "bg-green-100 text-green-800", 
    failed: "bg-red-100 text-red-800"
  };

  const statusIcons = {
    in_progress: Clock,
    completed: CheckCircle,
    failed: XCircle
  };

  const handleCreateBackup = async () => {
    setCreatingBackup(true);
    try {
      await createBackup(backupType);
    } finally {
      setCreatingBackup(false);
    }
  };

  const handleDeleteBackup = async (backupId: string) => {
    if (!window.confirm("Tem certeza que deseja excluir este backup?")) {
      return;
    }
    await deleteBackup(backupId);
  };

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex items-center p-6">
            <Archive className="h-8 w-8 text-blue-600 mr-4" />
            <div>
              <p className="text-2xl font-bold">{stats.total_backups}</p>
              <p className="text-sm text-muted-foreground">Total de Backups</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <CheckCircle className="h-8 w-8 text-green-600 mr-4" />
            <div>
              <p className="text-2xl font-bold">{stats.successful_backups}</p>
              <p className="text-sm text-muted-foreground">Bem-sucedidos</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <HardDrive className="h-8 w-8 text-purple-600 mr-4" />
            <div>
              <p className="text-2xl font-bold">{formatFileSize(stats.total_size)}</p>
              <p className="text-sm text-muted-foreground">Tamanho Total</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center p-6">
            <Calendar className="h-8 w-8 text-orange-600 mr-4" />
            <div>
              <p className="text-sm font-bold">
                {stats.last_backup_date 
                  ? format(new Date(stats.last_backup_date), "dd/MM/yyyy HH:mm", { locale: ptBR })
                  : "Nunca"
                }
              </p>
              <p className="text-sm text-muted-foreground">Último Backup</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Backup Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Criar Backup
          </CardTitle>
          <CardDescription>
            Crie um backup dos dados críticos do sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-end">
            <div className="flex-1 max-w-xs">
              <label className="text-sm font-medium mb-2 block">
                Tipo de Backup
              </label>
              <Select value={backupType} onValueChange={(value: 'full' | 'incremental') => setBackupType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Completo</SelectItem>
                  <SelectItem value="incremental">Incremental</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button 
              onClick={handleCreateBackup}
              disabled={creatingBackup}
              className="flex items-center gap-2"
            >
              {creatingBackup ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Database className="h-4 w-4" />
              )}
              {creatingBackup ? "Criando..." : "Criar Backup"}
            </Button>
          </div>

          <Alert className="mt-4">
            <Database className="h-4 w-4" />
            <AlertDescription>
              <strong>Backup Completo:</strong> Inclui todos os dados das tabelas críticas (até 1000 registros por tabela).
              <br />
              <strong>Backup Incremental:</strong> Apenas metadados e contagens de registros.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Backup History */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Histórico de Backups</CardTitle>
              <CardDescription>
                Visualize e gerencie todos os backups criados
              </CardDescription>
            </div>
            <Button 
              onClick={fetchBackups} 
              disabled={loading}
              variant="outline"
              size="sm"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Carregando backups...</p>
            </div>
          ) : backups.length === 0 ? (
            <div className="text-center py-8">
              <Database className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhum backup encontrado</p>
              <p className="text-sm text-muted-foreground mt-1">
                Crie seu primeiro backup usando o botão acima
              </p>
            </div>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Tabelas</TableHead>
                    <TableHead>Registros</TableHead>
                    <TableHead>Tamanho</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                {backups.map((backup) => {
                    const StatusIcon = statusIcons[backup.status as keyof typeof statusIcons] || Clock;
                    
                    // Safely parse records count
                    let totalRecords = 0;
                    if (backup.records_count && typeof backup.records_count === 'object') {
                      try {
                        const recordsCount = backup.records_count as Record<string, number>;
                        totalRecords = Object.values(recordsCount).reduce((sum, count) => sum + (count || 0), 0);
                      } catch (error) {
                        console.warn('Error parsing records_count:', error);
                      }
                    }

                    return (
                      <TableRow key={backup.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <StatusIcon className="h-4 w-4" />
                            <Badge 
                              variant="secondary" 
                              className={statusColors[backup.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800'}
                            >
                              {statusLabels[backup.status as keyof typeof statusLabels] || backup.status}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {backup.backup_type === 'full' ? 'Completo' : 'Incremental'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {backup.tables_included?.length || 0} tabelas
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {totalRecords.toLocaleString('pt-BR')} registros
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm">
                            {backup.file_size ? formatFileSize(backup.file_size) : '-'}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div>{format(new Date(backup.created_at), "dd/MM/yyyy", { locale: ptBR })}</div>
                            <div className="text-muted-foreground">
                              {format(new Date(backup.created_at), "HH:mm", { locale: ptBR })}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {backup.status === 'completed' && backup.backup_data && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => downloadBackup(backup.id)}
                                title="Baixar backup"
                              >
                                <Download className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteBackup(backup.id)}
                              className="text-red-600 hover:text-red-700"
                              title="Excluir backup"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};