import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { GeralTab } from '../../src/components/receitas/GeralTab';
import type { ReceitaFormData } from '../../src/types/receitas';
import '../../src/index.css';
// Isolated real form tab, synthetic state, no signed-in session or backend writes.
export default function RecipeFixture() {
  const [form,setForm]=useState<ReceitaFormData>({nome:'Brigadeiro tradicional',codigo_pdv:'',tipo_produto_id:null,
    rendimento_valor:20,rendimento_unidade:'un',observacoes:'',status:'finalizada',preco_venda:3.5,markup_id:null,
    markup_tipo:null,peso_unitario:20,tempo_preparo_total:30,tempo_preparo_mao_obra:0,conservacao:null});
  return <main className="recipe-editor" style={{maxWidth:1200,margin:'auto',padding:20}}><GeralTab receita={null} formData={form}
    onFormChange={(field,value)=>setForm(current=>({...current,[field]:value}))} onUpdate={()=>{}} mode="create"/></main>;
}
createRoot(document.getElementById('root')!).render(<RecipeFixture/>);
