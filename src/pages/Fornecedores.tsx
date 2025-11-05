import { FornecedoresTabela } from '@/components/estoque/FornecedoresTabela';

const Fornecedores = () => {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Fornecedores</h1>
        <p className="text-muted-foreground">
          Gerencie seus fornecedores e informações de contato
        </p>
      </div>

      <FornecedoresTabela />
    </div>
  );
};

export default Fornecedores;
