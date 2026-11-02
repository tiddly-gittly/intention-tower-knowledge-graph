import { expect, test } from '@playwright/test';

const plugin = '$:/plugins/linonetwo/intention-tower-knowledge-graph';

test.beforeEach(async ({ page }) => {
  await page.route('**/recipes/default/tiddlers/**', route =>
    route.request().method() === 'PUT' ? route.fulfill({ status: 204, headers: { etag: '"default/test/1:itkg"' } }) : route.continue());
  await page.goto('/');
  await page.waitForFunction('Boolean(window.$tw?.rootWidget)');
});

test('edits the selected week above the calendar and keeps each week’s text', async ({ page }) => {
  await page.evaluate(({ plugin }) => {
    const tw = (window as any).$tw;
    tw.wiki.setText('$:/layout', 'text', undefined, '');
    tw.wiki.setText('$:/temp/ITKG/CurrentWeekIndex', 'text', undefined, '0');
    tw.wiki.setText('$:/config/NewJournal/Title', 'text', undefined, 'ITKG browser week YYYY-0MM-0DD');
    tw.wiki.addTiddler({ title: 'ITKG browser weekly journal', text: `{{${plugin}/ViewTemplate/ArrangeNextWeek}}` });
    tw.wiki.setText('$:/StoryList', 'list', undefined, ['ITKG browser weekly journal']);
  }, { plugin });

  const editor = page.locator('.itkg-week-journal-editor textarea');
  const create = page.getByRole('button', { name: /创建周记/ });
  await expect(create).toBeVisible();
  await create.click();
  await expect(editor).toBeVisible();
  await editor.fill('本周回顾：完成意义之塔优化');
  await editor.blur();
  await expect.poll(() => page.evaluate(() => {
    const tw = (window as any).$tw;
    const title = document.querySelector('.itkg-week-journal-select-container button:nth-child(2)')!.textContent!.trim();
    return tw.wiki.getTiddlerText(title);
  })).toBe('本周回顾：完成意义之塔优化');

  const editorBox = await editor.boundingBox();
  const calendarBox = await page.locator('.itkg-week-arrangement-weeks-container').boundingBox();
  expect(editorBox!.y + editorBox!.height).toBeLessThanOrEqual(calendarBox!.y);

  await page.getByRole('button', { name: '下一周', exact: true }).click();
  await expect(create).toBeVisible();
  await create.click();
  await editor.fill('下周计划：完善任务管理');
  await editor.blur();
  await page.getByRole('button', { name: '上一周', exact: true }).click();
  await expect(editor).toHaveValue('本周回顾：完成意义之塔优化');
  await page.getByRole('button', { name: '下一周', exact: true }).click();
  await expect(editor).toHaveValue('下周计划：完善任务管理');
});

test('sorts priorities through the canvas header and formats dates locally', async ({ page }) => {
  await page.evaluate(({ plugin }) => {
    const tw = (window as any).$tw;
    tw.wiki.setText('$:/layout', 'text', undefined, '');
    for (const [index, priority] of ['Medium', 'High', 'Low'].entries()) {
      tw.wiki.addTiddler({ title: `ITKG browser row ${index}`, tmo_priority: priority, modified: new Date('2024-06-07T02:09:27Z') });
    }
    tw.wiki.addTiddler({ title: 'ITKG browser table', text: `<$basic-table filter="[prefix[ITKG browser row ]]" sort="tmo_priority" columns="""['title', 'tmo_priority', 'modified'].map(field => $tw.modules.execute('${plugin}/utils/table-columns.js').getColumn(field))""" />` });
    tw.wiki.setText('$:/StoryList', 'list', undefined, ['ITKG browser table']);
  }, { plugin });
  await expect(page.locator('.tc-hyper-table canvas').first()).toBeVisible();
  await page.waitForFunction(() => {
    function find(widget: any): any {
      if (widget.tableInstance) return widget;
      for (const child of widget.children || []) {
        const result = find(child);
        if (result) return result;
      }
    }
    const widget = find((window as any).$tw.rootWidget);
    (window as any).itkgTestTable = widget.tableInstance;
    return widget.tableInstance.rowCount === 4;
  });
  const priorities = () => page.evaluate(() => {
    const table = (window as any).itkgTestTable;
    return [1, 2, 3].map(row => table.getCellValue(1, row));
  });
  await expect.poll(priorities).toEqual(['低', '中', '高']);
  const dateText = await page.evaluate(() => (window as any).itkgTestTable.getCellValue(2, 1));
  const expectedDate = await page.evaluate(() => new Intl.DateTimeFormat('zh-Hans', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date('2024-06-07T02:09:27Z')));
  expect(dateText).toBe(expectedDate);
  const header = await page.evaluate(() => {
    const rect = (window as any).itkgTestTable.getCellRelativeRect(1, 0);
    return { x: rect.bounds.x1 + 72, y: (rect.bounds.y1 + rect.bounds.y2) / 2 };
  });
  await page.locator('.tc-hyper-table canvas').first().click({ position: header });
  await expect.poll(priorities).toEqual(['低', '中', '高']);
  await page.locator('.tc-hyper-table canvas').first().click({ position: header });
  await expect.poll(priorities).toEqual(['高', '中', '低']);
});
