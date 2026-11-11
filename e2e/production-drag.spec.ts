import type { Locator, Page } from '@playwright/test';
import { test, expect } from '../playwright-fixture';

async function drag(page:Page,source:Locator,target:Locator,touch=false) {
  await source.scrollIntoViewIfNeeded();
  const from=await source.boundingBox(),to=await target.boundingBox();
  if(!from||!to)throw new Error('Drag endpoints must be visible');
  const start={x:from.x+from.width/2,y:from.y+from.height/2};
  const end={x:to.x+to.width/2,y:to.y+to.height/2};
  if(touch){
    const cdp=await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[start]});
    // Exercise the real touch sensor's long-press activation threshold.
    await page.waitForTimeout(300);
    for(let step=1;step<=12;step++){
      await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:start.x+(end.x-start.x)*step/12,y:start.y+(end.y-start.y)*step/12}]});
    }
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
    await cdp.detach();
  }else{
    await page.mouse.move(start.x,start.y);await page.mouse.down();
    await page.mouse.move(start.x+10,start.y,{steps:2});
    await page.mouse.move(end.x,end.y,{steps:20});await page.mouse.up();
  }
}
const target=(page:Page,stage:string,mobile:boolean)=>mobile?page.getByRole('tab',{name:new RegExp(stage)}):page.getByRole('region',{name:stage,exact:true});

test('grab the title and drop into an empty stage, even with a search filter',async({page,isMobile})=>{
  await page.goto('/e2e/fixtures/production-board.html');
  await page.getByLabel('Buscar tarefa',{exact:true}).fill('cenoura');
  await drag(page,page.getByRole('heading',{name:'Bolo de cenoura'}),target(page,'Em produção',isMobile),isMobile);
  await expect(page.getByLabel('Movimentações')).toHaveText('one:em_producao');
  if(isMobile)await page.getByRole('tab',{name:/Em produção/}).click();
  await expect(page.getByRole('region',{name:'Em produção',exact:true}).getByRole('article',{name:'Bolo de cenoura'})).toBeVisible();
});

test('drop on an occupied column, cancel with Escape, and preserve button clicks',async({page,isMobile})=>{
  test.skip(isMobile,'Desktop pointer interactions; mobile long-press is covered separately.');
  await page.goto('/e2e/fixtures/production-board.html');
  const first=page.getByRole('article',{name:'Bolo de cenoura'});
  await first.getByRole('button',{name:'Iniciar produção'}).click();
  await drag(page,page.getByRole('heading',{name:'Torta de morango'}),first.getByRole('heading',{name:'Bolo de cenoura'}));
  await expect(page.getByLabel('Movimentações')).toHaveText('one:em_producao,two:em_producao');
  const title=await first.getByRole('heading').boundingBox();
  if(!title)throw new Error('Missing title');
  await page.mouse.move(title.x+15,title.y+5);await page.mouse.down();await page.mouse.move(title.x+70,title.y+20,{steps:5});
  await page.keyboard.press('Escape');await page.mouse.up();
  await expect(page.getByLabel('Movimentações')).toHaveText('one:em_producao,two:em_producao');
  await first.getByRole('button',{name:'Opções de Bolo de cenoura'}).click();
  await page.getByRole('menuitem',{name:'Editar tarefa'}).click();
  await expect(page.getByLabel('Movimentações')).toContainText('edit');
});

test('same-column ordering still works and dropping outside does not move',async({page,isMobile})=>{
  test.skip(isMobile,'Desktop reordering; touch movement to tabs is covered separately.');
  await page.goto('/e2e/fixtures/production-board.html');
  await drag(page,page.getByRole('heading',{name:'Bolo de cenoura'}),page.getByRole('heading',{name:'Torta de morango'}));
  await expect(page.getByRole('region',{name:'A fazer',exact:true}).getByRole('article').first()).toHaveAttribute('aria-label','Torta de morango');
  await expect(page.getByLabel('Movimentações')).toHaveText('order');
  await drag(page,page.getByRole('heading',{name:'Bolo de cenoura'}),page.getByLabel('Buscar tarefa',{exact:true}));
  await expect(page.getByLabel('Movimentações')).toHaveText('order');
});

test('shared page drag uses the existing move API and asks for actual yield before finishing',async({page,isMobile})=>{
  let task={id:'task',titulo:'Assar bolos',status:'a_fazer',updated_at:'2026-11-11T12:00:00Z',receita_id:'recipe',rendimento_previsto:12,rendimento_unidade:'un',rendimento_real:null as number|null,funcionario:{nome:'Ana'}};
  const moves:Array<Record<string,unknown>>=[];
  let releaseStart!:()=>void;
  const delayedStart=new Promise<void>(resolve=>{releaseStart=resolve;});
  await page.route('**/functions/v1/producao-compartilhada',async route=>{
    const body=route.request().postDataJSON();
    if(body.action==='move'){
      moves.push(body);
      if(moves.length===1)await delayedStart;
      task={...task,status:task.status==='a_fazer'?'em_producao':'feito',rendimento_real:body.rendimentoReal};
      await route.fulfill({json:{task}});
    }else await route.fulfill({json:{tasks:[task],date:'2026-11-11',expiresAt:'2026-11-12T12:00:00Z'}});
  });
  await page.goto('/producao-compartilhada/fixture-token');
  await page.getByRole('dialog',{name:'Aviso de cookies'}).getByRole('button',{name:'Recusar opcionais',exact:true}).click();
  await page.getByLabel('Buscar produção').fill('Assar');
  await drag(page,page.getByRole('heading',{name:'Assar bolos'}),target(page,'Em produção',isMobile),isMobile);
  await expect.poll(()=>moves.length).toBe(1);
  if(isMobile)await page.getByRole('tab',{name:/Em produção/}).click();
  try{
    // The server has not replied: the card must already be in the destination.
    await expect(page.getByRole('region',{name:'Em produção',exact:true}).getByRole('article',{name:'Assar bolos'})).toHaveAttribute('aria-busy','true');
    const frames=await page.evaluate(async()=>{
      const frames:Array<{copies:number;stage:string|null}>=[];
      for(let frame=0;frame<20;frame++){
        await new Promise<void>(resolve=>requestAnimationFrame(()=>resolve()));
        const cards=document.querySelectorAll('article[aria-label="Assar bolos"]');
        frames.push({copies:cards.length,stage:cards[0]?.closest('section')?.id??null});
      }
      return frames;
    });
    expect(frames.every(frame=>frame.copies===1&&frame.stage==='board-em_producao')).toBe(true);
  }finally{releaseStart();}
  await expect(page.getByRole('button',{name:'Finalizar produção',exact:true})).toBeEnabled();
  await drag(page,page.getByRole('heading',{name:'Assar bolos'}),target(page,'Feito',isMobile),isMobile);
  await expect(page.getByRole('dialog')).toBeVisible();expect(moves).toHaveLength(1);
  await page.getByRole('button',{name:'Cancelar',exact:true}).click();expect(moves).toHaveLength(1);
  await drag(page,page.getByRole('heading',{name:'Assar bolos'}),target(page,'Feito',isMobile),isMobile);
  await page.getByLabel('Quanto rendeu? (un)').fill('11');
  await page.getByRole('dialog').getByRole('button',{name:'Finalizar produção',exact:true}).click();
  await expect.poll(()=>moves.length).toBe(2);expect(moves[1].rendimentoReal).toBe(11);
});

test('failed shared save returns only the affected card and explains the failure',async({page,isMobile})=>{
  let rejectSave!:()=>void;
  const pendingSave=new Promise<void>(resolve=>{rejectSave=resolve;});
  const task={id:'task',titulo:'Assar bolos',status:'a_fazer',updated_at:'2026-11-11T12:00:00Z',funcionario:{nome:'Ana'}};
  await page.route('**/functions/v1/producao-compartilhada',async route=>{
    if(route.request().postDataJSON().action==='move'){
      await pendingSave;await route.fulfill({json:{error:'Falha simulada ao salvar'}});
    }else await route.fulfill({json:{tasks:[task],date:'2026-11-11',expiresAt:'2026-11-12T12:00:00Z'}});
  });
  await page.goto('/producao-compartilhada/fixture-token');
  await page.getByRole('dialog',{name:'Aviso de cookies'}).getByRole('button',{name:'Recusar opcionais',exact:true}).click();
  await drag(page,page.getByRole('heading',{name:'Assar bolos'}),target(page,'Em produção',isMobile),isMobile);
  if(isMobile)await page.getByRole('tab',{name:/Em produção/}).click();
  try{await expect(page.getByRole('region',{name:'Em produção',exact:true}).getByRole('article')).toHaveAttribute('aria-busy','true');}
  finally{rejectSave();}
  await expect(page.getByRole('alert')).toContainText('Falha simulada ao salvar');
  if(isMobile)await page.getByRole('tab',{name:/A fazer/}).click();
  await expect(page.getByRole('region',{name:'A fazer',exact:true}).getByRole('button',{name:'Iniciar produção'})).toBeEnabled();
});
