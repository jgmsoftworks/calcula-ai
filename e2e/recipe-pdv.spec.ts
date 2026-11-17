import { test, expect } from '../playwright-fixture';
test('PDV aligns with preservation and preserves exact text on desktop and mobile',async({page,isMobile},testInfo)=>{
  await page.goto('/e2e/fixtures/recipe-pdv.html');
  const input=page.getByLabel('Código PDV',{exact:true});
  await expect(input).toBeVisible();
  await expect(page.getByText(/Use o mesmo código do produto/)).toHaveCount(0);
  await input.fill('00471');await expect(input).toHaveValue('00471');
  await expect(input).toHaveAttribute('maxlength','64');
  const verifyLayout=async()=>{
    const picture=await page.locator('label[for="image-upload"]').boundingBox();
    const field=await input.boundingBox();
    const preservation=await page.locator('.recipe-preservation-panel').boundingBox();
    expect(picture).not.toBeNull();expect(field).not.toBeNull();expect(preservation).not.toBeNull();
    expect(field!.y).toBeGreaterThan(picture!.y+picture!.height);
    if (!isMobile) {
      expect(preservation!.x).toBeGreaterThan(field!.x+field!.width);
      expect(Math.abs(field!.y+field!.height-preservation!.y-preservation!.height)).toBeLessThanOrEqual(1);
    } else expect(preservation!.y).toBeGreaterThan(field!.y+field!.height);
    expect(await page.locator('body').evaluate(e=>e.scrollWidth<=window.innerWidth+1)).toBe(true);
  };
  await verifyLayout();
  await page.locator('.recipe-general-grid').screenshot({path:testInfo.outputPath('recipe-pdv.png')});
  if (!isMobile) {
    await page.setViewportSize({width:900,height:1000});
    await verifyLayout();
    await page.locator('.recipe-general-grid').screenshot({path:testInfo.outputPath('tablet','recipe-pdv.png')});
  }
});
