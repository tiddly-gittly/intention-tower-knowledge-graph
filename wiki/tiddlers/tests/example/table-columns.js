describe('ITKG table columns', function() {
  var getColumn = require('$:/plugins/linonetwo/intention-tower-knowledge-graph/utils/table-columns.js').getColumn;
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
    var sort = getColumn('tmo_priority').sort;
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
        expect(getColumn(field).fieldFormat({ title: 'ITKG date test' })).toBe(
          new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' }).format(date)
        );
      });
    });
  });

  it('keeps optional dates empty and ordinary fields sortable', function() {
    $tw.wiki.addTiddler({ title: 'ITKG date test' });
    expect(getColumn('modified').fieldFormat({ title: 'ITKG date test' })).toBe('');
    expect(getColumn('tmo_importance').sort).toBe(true);
  });
});
