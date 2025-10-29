import { useState } from 'react';
import { Plus, Trash2, Upload, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { NumericInputPtBr } from '@/components/ui/numeric-input-ptbr';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';


interface PassoPreparo {
  id: string;
  ordem: number;
  descricao: string;
  imagem?: string;
}

interface ConservacaoItem {
  id: string;
  descricao: string;
  temperatura: string;
  tempo: number;
  unidade_tempo: string;
}

interface GeralStepProps {
  receitaId: string | null;
  nomeReceita: string;
  observacoes: string;
  imagemReceita: string;
  passosPreparo: PassoPreparo[];
  conservacao: ConservacaoItem[];
  onGeralChange: (data: Partial<{
    nomeReceita: string;
    observacoes: string;
    imagemReceita: string;
    passosPreparo: PassoPreparo[];
    conservacao: ConservacaoItem[];
  }>) => void;
}

export function GeralStep({ 
  receitaId, 
  nomeReceita,
  observacoes, 
  imagemReceita, 
  passosPreparo, 
  conservacao, 
  onGeralChange 
}: GeralStepProps) {

  const adicionarPasso = () => {
    const novoPasso: PassoPreparo = {
      id: Date.now().toString(),
      ordem: passosPreparo.length + 1,
      descricao: '',
    };
    const novosPassos = [...passosPreparo, novoPasso];
    onGeralChange({ passosPreparo: novosPassos });
  };

  const removerPasso = (id: string) => {
    const novosPassos = passosPreparo.filter(passo => passo.id !== id);
    const passosReordenados = novosPassos.map((passo, index) => ({
      ...passo,
      ordem: index + 1
    }));
    onGeralChange({ passosPreparo: passosReordenados });
  };

  const atualizarPasso = (id: string, descricao: string) => {
    const novosPassos = passosPreparo.map(passo =>
      passo.id === id ? { ...passo, descricao } : passo
    );
    onGeralChange({ passosPreparo: novosPassos });
  };

  const adicionarImagemPasso = (id: string, imagemUrl: string) => {
    const novosPassos = passosPreparo.map(passo =>
      passo.id === id ? { ...passo, imagem: imagemUrl } : passo
    );
    onGeralChange({ passosPreparo: novosPassos });
  };

  const atualizarConservacao = (id: string, campo: keyof ConservacaoItem, valor: any) => {
    const novaConservacao = conservacao.map(item =>
      item.id === id ? { ...item, [campo]: valor } : item
    );
    onGeralChange({ conservacao: novaConservacao });
  };

  const handleTemperaturaChange = (id: string, valor: string) => {
    // Remove qualquer °C existente para permitir edição
    const numeroLimpo = valor.replace('°C', '');
    atualizarConservacao(id, 'temperatura', numeroLimpo);
  };

  const handleTemperaturaBlur = (id: string, valor: string) => {
    // Adiciona °C automaticamente se não estiver presente
    const numeroLimpo = valor.replace('°C', '').trim();
    if (numeroLimpo && !isNaN(Number(numeroLimpo))) {
      atualizarConservacao(id, 'temperatura', `${numeroLimpo}°C`);
    }
  };

  const handleImageUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        // Aqui você pode implementar o upload para o Supabase Storage
        const url = URL.createObjectURL(file);
        onGeralChange({ imagemReceita: url });
      }
    };
    input.click();
  };

  return (
    <div className="space-y-6">
      {/* Nome da Receita */}
      <div className="space-y-2">
        <Label htmlFor="nomeReceita" className="text-sm font-medium">
          Nome da Receita
        </Label>
        <Input
          id="nomeReceita"
          placeholder="Digite o nome da receita..."
          value={nomeReceita}
          onChange={(e) => onGeralChange({ nomeReceita: e.target.value })}
          className="text-lg font-medium h-12"
        />
      </div>

      {/* Layout Principal: Imagem e Conservação/Observações */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Área de Upload de Imagem */}
        <div className="cursor-pointer hover:bg-muted/50 transition-colors relative overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm h-[280px] flex flex-col items-center justify-center" onClick={handleImageUpload}>
            {imagemReceita ? (
              <>
                <img 
                  src={imagemReceita} 
                  alt="Receita" 
                  className="w-full h-full object-cover rounded-lg"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onGeralChange({ imagemReceita: '' });
                  }}
                  className="absolute top-2 right-2 p-1 h-6 w-6 bg-background/80 hover:bg-background"
                >
                  <Plus className="h-3 w-3 rotate-45" />
                </Button>
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs text-center py-1 rounded-b-lg">
                  Clique para alterar a imagem
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center text-center p-6">
                <Upload className="h-12 w-12 text-primary mb-4" />
                <p className="font-medium">Clique para adicionar uma imagem</p>
              </div>
            )}
        </div>

        {/* Conservação */}
        <Card className="h-[280px]">
          <CardHeader className="pb-2 pt-4">
            <CardTitle className="text-base">Conservação:</CardTitle>
          </CardHeader>
          <CardContent className="pt-0 pb-4 px-4">
            <Table>
              <TableHeader>
                <TableRow className="h-10">
                  <TableHead className="text-sm py-2">Descrição</TableHead>
                  <TableHead className="text-sm py-2">Temp. °C</TableHead>
                  <TableHead className="text-sm py-2">Tempo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {conservacao.map((item) => (
                  <TableRow key={item.id} className="h-14">
                    <TableCell className="font-medium text-sm py-2">{item.descricao}</TableCell>
                    <TableCell className="py-2">
                      <Input
                        value={item.temperatura}
                        onChange={(e) => handleTemperaturaChange(item.id, e.target.value)}
                        onBlur={(e) => handleTemperaturaBlur(item.id, e.target.value)}
                        onFocus={(e) => e.target.select()}
                        className="w-12 h-8 text-xs px-1"
                      />
                    </TableCell>
                    <TableCell className="py-2">
                      <NumericInputPtBr
                        tipo="quantidade_un"
                        min={0}
                        value={item.tempo}
                        onChange={(valor) => atualizarConservacao(item.id, 'tempo', valor)}
                        className="w-10 h-8 text-xs px-1"
                      />
                      <Select 
                        value={item.unidade_tempo} 
                        onValueChange={(value) => atualizarConservacao(item.id, 'unidade_tempo', value)}
                      >
                        <SelectTrigger className="w-16 h-8 text-xs px-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="horas">horas</SelectItem>
                          <SelectItem value="dias">dias</SelectItem>
                          <SelectItem value="meses">meses</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
              </Table>
          </CardContent>
        </Card>
      </div>

      {/* Modo de Preparo */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg">Modo de Preparo:</CardTitle>
            <Button onClick={adicionarPasso} className="bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Passo
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {passosPreparo.map((passo, index) => (
            <div key={passo.id} className="space-y-3">
              <div className="flex items-start gap-4">
                <div className="flex items-center gap-2 min-w-fit">
                  <Label className="font-medium text-primary">Passo {passo.ordem}</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = 'image/*';
                      input.onchange = (e) => {
                        const file = (e.target as HTMLInputElement).files?.[0];
                        if (file) {
                          const url = URL.createObjectURL(file);
                          adicionarImagemPasso(passo.id, url);
                        }
                      };
                      input.click();
                    }}
                    className="p-1 h-6 w-6"
                  >
                    <Image className="h-3 w-3" />
                  </Button>
                  {passosPreparo.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removerPasso(passo.id)}
                      className="p-1 h-6 w-6"
                    >
                      <Trash2 className="h-3 w-3 text-destructive" />
                    </Button>
                  )}
                </div>
                <Textarea
                  placeholder="Descreva o passo..."
                  value={passo.descricao}
                  onChange={(e) => atualizarPasso(passo.id, e.target.value)}
                  rows={2}
                  className="flex-1"
                />
                {passo.imagem && (
                  <div className="w-16 h-16">
                    <img 
                      src={passo.imagem} 
                      alt={`Passo ${passo.ordem}`}
                      className="w-full h-full object-cover rounded border"
                    />
                  </div>
                )}
              </div>
              {index < passosPreparo.length - 1 && <Separator />}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Observações */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Observações:</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Adicione observações importantes sobre a receita..."
            value={observacoes}
            onChange={(e) => onGeralChange({ observacoes: e.target.value })}
            rows={6}
            className="resize-none"
          />
        </CardContent>
      </Card>
    </div>
  );
}