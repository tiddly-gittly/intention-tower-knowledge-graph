import { expect, test } from '@playwright/test';
import type { Widget } from 'tiddlywiki';

interface TableWidget extends Widget {
  tableInstance?: {
    options: { widthMode: string };
    getAllColsWidth(): number;
    getDrawRange(): { width: number };
  };
}

const plugin = '$:/plugins/linonetwo/intention-tower-knowledge-graph';

test.beforeEach(async ({ page }) => {
  await page.route(
    '**/recipes/default/tiddlers/**',
    route => route.request().method() === 'PUT' ? route.fulfill({ status: 204, headers: { etag: '"default/test/1:itkg"' } }) : route.continue(),
  );
  await page.goto('/');
  await page.waitForFunction('Boolean(window.$tw?.rootWidget)');
  await page.evaluate(({ plugin }) => {
    const tw = $tw;
    tw.wiki.setText('$:/layout', 'text', undefined, `${plugin}/layout/layout`);
    tw.wiki.addTiddler({ title: 'Scope task', tags: [tw.wiki.getTiddlerText(`${plugin}/Config/task-tag`)], text: 'Scope body' });
    tw.wiki.addTiddler({ title: 'Scope child', tags: ['Scope task'] });
    tw.wiki.addTiddler({ title: 'Scope unrelated', text: 'Scope body' });
  }, { plugin });
});

test('limits autocomplete to tower content and offers creation actions', async ({ page }) => {
  const input = page.locator('.itkg-search input');
  await expect(input).toBeVisible();
  await input.focus();
  await expect(page.locator('.itkg-search-action')).toHaveCount(3);
  await input.fill('Scope');
  await expect(page.locator('.itkg-search-result').filter({ hasText: 'Scope task' })).toBeVisible();
  await expect(page.locator('.itkg-search-result').filter({ hasText: 'Scope child' })).toBeVisible();
  await expect(page.locator('.itkg-search-result').filter({ hasText: 'Scope unrelated' })).toHaveCount(0);
  await expect(page.locator('.itkg-search-action')).toHaveCount(3);
  await page.locator('.itkg-search-action').filter({ hasText: '新项目' }).click();
  await expect.poll(() =>
    page.evaluate(() => {
      const tw = $tw;
      const fields = tw.wiki.getTiddler('Scope')?.fields;
      return fields && { tags: fields.tags, state: fields.tmo_taskState, layout: tw.wiki.getTiddlerText('$:/layout') };
    })
  ).toEqual({ tags: ['项目', '任务'], state: 'New', layout: '' });
});

test('supports keyboard creation and keeps the search scope for special prefixes', async ({ page }) => {
  const input = page.locator('.itkg-search input');
  for (const prefix of ['>', '#', '[', '?']) {
    await input.fill(prefix);
    await expect(page.locator('.itkg-search-action')).toHaveCount(3);
    await expect(page.locator('.aa-Source')).toHaveCount(1);
  }
  await input.fill('Keyboard task');
  await expect(page.locator('.itkg-search-action').first()).toHaveText('新任务：Keyboard task');
  await input.press('ArrowDown');
  await input.press('ArrowUp');
  await input.press('Enter');
  await expect.poll(() => page.evaluate(() => $tw.wiki.getTiddler('Keyboard task')?.fields.tags)).toEqual(['任务']);
});

test('creates intentions and opens existing results from the list', async ({ page }) => {
  const input = page.locator('.itkg-search input');
  await input.fill('New purpose');
  await page.locator('.itkg-search-action').filter({ hasText: '新意义' }).click();
  await expect.poll(() => page.evaluate(() => $tw.wiki.getTiddler('New purpose')?.fields.tags)).toEqual(['意义']);
  await page.evaluate(({ plugin }) => {
    $tw.wiki.setText('$:/layout', 'text', undefined, `${plugin}/layout/layout`);
  }, { plugin });
  await input.fill('Scope task');
  await page.locator('.itkg-search-result').filter({ hasText: 'Scope task' }).click();
  await expect.poll(() => page.evaluate(() => $tw.wiki.getTiddlerList('$:/StoryList'))).toContain('Scope task');
  await expect.poll(() => page.evaluate(() => $tw.wiki.getTiddlerText('$:/layout'))).toBe('');
});

test('places the layout button beside search on wide screens and above it on narrow screens', async ({ page }) => {
  for (const width of [1600, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    const button = page.locator('.itkg-back-to-layout button');
    const search = page.locator('.itkg-search');
    await expect(button).toBeVisible();
    const buttonBox = (await button.boundingBox())!;
    const searchBox = (await search.boundingBox())!;
    if (width > 640) {
      expect(buttonBox.x + buttonBox.width).toBeLessThan(searchBox.x);
    } else {
      expect(buttonBox.y + buttonBox.height).toBeLessThan(searchBox.y);
      expect(Math.abs(buttonBox.width - searchBox.width)).toBeLessThan(1);
      expect(searchBox.x + searchBox.width).toBeLessThanOrEqual(width);
    }
  }
});

test('fills the weekly table container on wide screens', async ({ page }) => {
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.evaluate(({ plugin }) => {
    const tw = $tw;
    tw.wiki.setText('$:/state/ITKG/ProjectsOverview', 'text', undefined, `${plugin}/ViewTemplate/ArrangeNextWeek`);
    tw.wiki.setText('$:/temp/ITKG/CurrentWeekIndex', 'text', undefined, '0');
    const title = tw.wiki.filterTiddlers('[weekstart[0]format:date{$:/config/NewJournal/Title}]')[0];
    tw.wiki.addTiddler({ title, text: '' });
  }, { plugin });
  const table = page.locator('.itkg-week-arrangement-container .tc-hyper-table');
  await expect(table).toBeVisible();
  const metrics = () =>
    page.evaluate(() => {
      const tw = $tw;
      function find(widget: TableWidget): TableWidget | undefined {
        if (widget.tableInstance) return widget;
        for (const child of widget.children) {
          const match = find(child);
          if (match) return match;
        }
      }
      const table = find(tw.rootWidget)!.tableInstance!;
      return { mode: table.options.widthMode, tableWidth: table.getAllColsWidth(), containerWidth: table.getDrawRange().width };
    });
  await expect.poll(async () => (await metrics()).mode).toBe('adaptive');
  await expect.poll(async () => (await metrics()).tableWidth).toBeGreaterThan(1500);
  const sizes = await metrics();
  expect(Math.abs(sizes.tableWidth - sizes.containerWidth)).toBeLessThan(5);
  for (const width of [2560, 1024]) {
    await page.setViewportSize({ width, height: 1080 });
    await expect.poll(async () => Math.abs((await metrics()).tableWidth - (width - 30))).toBeLessThan(5);
  }
});
