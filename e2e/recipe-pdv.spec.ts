import { test, expect } from '../playwright-fixture';
test('PDV field sits below recipe image and preserves exact text on desktop and mobile',async({page},testInfo)=>{
  await page.goto('/e2e/fixtures/recipe-pdv.html');
  const input=page.getByLabel('Código PDV',{exact:true});
  await expect(input).toBeVisible();
  const picture=await page.locator('label[for="image-upload"]').boundingBox(), field=await input.boundingBox();
  expect(picture).not.toBeNull();expect(field).not.toBeNull();
  expect(field!.y).toBeGreaterThan(picture!.y+picture!.height);
  await input.fill('00471');await expect(input).toHaveValue('00471');
  await expect(input).toHaveAttribute('maxlength','64');
  expect(await page.locator('body').evaluate(e=>e.scrollWidth<=window.innerWidth+1)).toBe(true);
  await page.screenshot({path:testInfo.outputPath('recipe-pdv.png'),fullPage:true});
});
