import { useState } from 'react';
import { Plus, Trash2, Upload, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface PassoPreparo {
  id: string;
  ordem: number;
  descricao: string;
  imagem_url?: string;
}

export function GeralStep() {
  const [nomeReceita, setNomeReceita] = useState('');
  const [conservacao, setConservacao] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [imagemReceita, setImagemReceita] = useState('');
  const [passosPreparo, setPassosPreparo] = useState<PassoPreparo[]>([
    { id: '1', ordem: 1, descricao: '' }
  ]);

  const adicionarPasso = () => {
    const novoPasso: PassoPreparo = {
      id: Date.now().toString(),
      ordem: passosPreparo.length + 1,
      descricao: '',
    };
    setPassosPreparo([...passosPreparo, novoPasso]);
  };

  const removerPasso = (id: string) => {
    const novosPassos = passosPreparo.filter(passo => passo.id !== id);
    // Reordenar os passos
    const passosReordenados = novosPassos.map((passo, index) => ({
      ...passo,
      ordem: index + 1
    }));
    setPassosPreparo(passosReordenados);
  };

  const atualizarPasso = (id: string, descricao: string) => {
    setPassosPreparo(passosPreparo.map(passo =>
      passo.id === id ? { ...passo, descricao } : passo
    ));
  };

  const adicionarImagemPasso = (id: string, imagemUrl: string) => {
    setPassosPreparo(passosPreparo.map(passo =>
      passo.id === id ? { ...passo, imagem_url: imagemUrl } : passo
    ));
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-2">Informações Gerais</h3>
        <p className="text-muted-foreground">Complete as informações básicas da receita</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Informações Básicas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Dados da Receita</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="nome-receita">Nome da Receita *</Label>
              <Input
                id="nome-receita"
                placeholder="Ex: Bolo de Chocolate Premium"
                value={nomeReceita}
                onChange={(e) => setNomeReceita(e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="imagem-receita">Foto da Receita</Label>
              <div className="flex gap-2">
                <Input
                  id="imagem-receita"
                  placeholder="URL da imagem ou clique para fazer upload"
                  value={imagemReceita}
                  onChange={(e) => setImagemReceita(e.target.value)}
                />
                <Button variant="outline" size="sm">
                  <Upload className="h-4 w-4" />
                </Button>
              </div>
              {imagemReceita && (
                <div className="mt-2">
                  <img 
                    src={imagemReceita} 
                    alt="Preview da receita" 
                    className="w-full h-32 object-cover rounded border"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="conservacao">Conservação</Label>
              <Textarea
                id="conservacao"
                placeholder="Ex: Manter refrigerado por até 3 dias"
                value={conservacao}
                onChange={(e) => setConservacao(e.target.value)}
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                placeholder="Observações gerais sobre a receita"
                value={observacoes}
                onChange={(e) => setObservacoes(e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>

        {/* Modo de Preparo */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-base">Modo de Preparo</CardTitle>
              <Button size="sm" onClick={adicionarPasso}>
                <Plus className="h-4 w-4 mr-1" />
                Passo
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 max-h-96 overflow-y-auto">
            {passosPreparo.map((passo, index) => (
              <div key={passo.id} className="space-y-3 p-3 border rounded-lg">
                <div className="flex justify-between items-center">
                  <Label className="font-medium">Passo {passo.ordem}</Label>
                  {passosPreparo.length > 1 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removerPasso(passo.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  )}
                </div>
                
                <Textarea
                  placeholder={`Descreva o passo ${passo.ordem} do preparo...`}
                  value={passo.descricao}
                  onChange={(e) => atualizarPasso(passo.id, e.target.value)}
                  rows={3}
                />

                <div>
                  <Label className="text-sm text-muted-foreground">Foto do Passo (opcional)</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      placeholder="URL da imagem"
                      value={passo.imagem_url || ''}
                      onChange={(e) => adicionarImagemPasso(passo.id, e.target.value)}
                      className="text-sm"
                    />
                    <Button variant="outline" size="sm">
                      <Image className="h-4 w-4" />
                    </Button>
                  </div>
                  {passo.imagem_url && (
                    <div className="mt-2">
                      <img 
                        src={passo.imagem_url} 
                        alt={`Passo ${passo.ordem}`}
                        className="w-full h-24 object-cover rounded border"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>

                {index < passosPreparo.length - 1 && <Separator className="mt-3" />}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}