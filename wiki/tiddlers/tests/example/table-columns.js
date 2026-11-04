describe('ITKG table columns', function() {
  var getColumns = require('$:/plugins/linonetwo/intention-tower-knowledge-graph/utils/table-columns.js').getColumns;
  var originalLanguage;

  beforeEach(function() {
    originalLanguage = $tw.wiki.getTiddler('$:/language');
    $tw.wiki.addTiddler({ title: '$:/languages/ITKG-test', name: 'zh-Hans' });
    $tw.wiki.addTiddler({ title: '$:/language', text: '$:/languages/ITKG-test' });
  });

  afterEach(function() {
    $tw.wiki.addTiddler(originalLanguage);
    $tw.wiki.deleteTiddler('$:/languages/ITKG-test');
    $tw.wiki.deleteTiddler('ITKG date test');
  });

  it('sorts translated priorities by their meaning in both directions', function() {
    var sort = getColumns(['tmo_priority'])[0].sort;
    expect(['中', '高', '低'].sort(function(a, b) { return sort(a, b, 'asc'); })).toEqual(['低', '中', '高']);
    expect(['中', '高', '低'].sort(function(a, b) { return sort(a, b, 'desc'); })).toEqual(['高', '中', '低']);
    expect(sort('High', 'Medium', 'asc')).toBeGreaterThan(0);
    expect(sort('中', '中', 'asc')).toBe(0);
    expect(sort(undefined, 'Medium', 'asc')).toBe(0);
    expect(sort('', '中', 'asc')).toBe(0);
  });

  it('formats timestamps in the active wiki language and local time zone', function() {
    var date = new Date('2024-06-07T02:09:27Z');
    $tw.wiki.addTiddler({ title: 'ITKG date test', modified: date, created: date });
    ['zh-Hans', 'en-GB'].forEach(function(locale) {
      $tw.wiki.addTiddler({ title: '$:/languages/ITKG-test', name: locale });
      ['modified', 'created'].forEach(function(field) {
        expect(getColumns([field])[0].fieldFormat({ title: 'ITKG date test' })).toBe(
          new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
        );
      });
    });
  });

  it('keeps optional dates empty and ordinary fields sortable', function() {
    $tw.wiki.addTiddler({ title: 'ITKG date test' });
    expect(getColumns(['modified'])[0].fieldFormat({ title: 'ITKG date test' })).toBe('');
    expect(getColumns(['title'])[0].sort).toBe(true);
  });

  it('sorts numeric importance and uses the existing default importance of five', function() {
    var sort = getColumns(['tmo_importance'])[0].sort;
    expect(['10', '2', '7'].sort(function(left, right) { return sort(left, right, 'asc'); })).toEqual(['2', '7', '10']);
    expect(['10', '2', '7'].sort(function(left, right) { return sort(left, right, 'desc'); })).toEqual(['10', '7', '2']);
    expect(sort(undefined, '5', 'asc')).toBe(0);
    expect(sort('', '5', 'asc')).toBe(0);
  });

  it('preserves field order and formats both date columns in one batch', function() {
    var date = new Date('2024-06-07T02:09:27Z');
    $tw.wiki.addTiddler({ title: 'ITKG date test', modified: date, created: date });
    var columns = getColumns(['title', 'modified', 'created', 'tmo_priority', 'tmo_importance']);
    expect(columns.map(function(column) { return column.field; })).toEqual(['title', 'modified', 'created', 'tmo_priority', 'tmo_importance']);
    expect(columns[1].fieldFormat({ title: 'ITKG date test' })).toBe(columns[2].fieldFormat({ title: 'ITKG date test' }));
  });

  it('accepts empty batches and keeps ordinary fields sortable', function() {
    expect(getColumns([])).toEqual([]);
    expect(getColumns(['title'])[0]).toEqual({ field: 'title', width: 'auto', sort: true });
  });

  it('uses core English when the wiki language setting is empty', function() {
    var date = new Date('2024-06-07T02:09:27Z');
    $tw.wiki.addTiddler({ title: '$:/language', text: '' });
    $tw.wiki.addTiddler({ title: 'ITKG date test', modified: date });
    expect(getColumns(['modified'])[0].fieldFormat({ title: 'ITKG date test' })).toBe(
      new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
    );
  });
});
