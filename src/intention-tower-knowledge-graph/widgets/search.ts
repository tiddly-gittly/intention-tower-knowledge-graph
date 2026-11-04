import { widget as Widget } from '$:/core/modules/widgets/widget.js';

const plugin = '$:/plugins/linonetwo/intention-tower-knowledge-graph';
const kinds = ['task', 'project', 'intention'] as const;
type Kind = typeof kinds[number];

interface SearchItem {
  title: string;
  caption: string;
  kind?: Kind;
}

interface SearchParameters {
  query: string;
}

interface SearchWidget extends Widget {
  autoCompleteState?: unknown;
  autoCompleteInstance: {
    update(options: Record<string, unknown>): void;
    setQuery(query: string): void;
    setIsOpen(open: boolean): void;
  };
}

function lingo(key: string): string {
  const language = $tw.wiki.filterTiddlers('[{$:/language}get[name]else[en-GB]]')[0];
  return $tw.wiki.getTiddlerText(`${plugin}/language/${language}/${key}`, $tw.wiki.getTiddlerText(`${plugin}/language/en-GB/${key}`))!;
}

function getCandidates(): string[] {
  const roots = kinds.map(kind => $tw.wiki.getTiddlerText(`${plugin}/Config/${kind}-tag`)!);
  const journalTags = [
    ...$tw.utils.parseStringArray($tw.wiki.getTiddlerText(`${plugin}/Config/WeekJournalTags`, '')),
    ...$tw.utils.parseStringArray($tw.wiki.getTiddlerText('$:/config/NewJournal/Tags', '')),
    ...($tw.wiki.getTiddler('$:/config/NewJournal/Tags')!.fields.tags ?? []),
  ];
  const calendarTag = $tw.wiki.getTiddlerText(`${plugin}/Config/default-calendar-entry-tag`)!;
  const visited = new Set<string>([...roots, ...journalTags, calendarTag]);
  const candidates = new Set<string>();
  const queue = [...visited];
  for (const title of queue) {
    for (const child of $tw.wiki.getTiddlersWithTag(title)) {
      candidates.add(child);
      if (!visited.has(child)) {
        visited.add(child);
        queue.push(child);
      }
    }
  }
  return [...candidates].filter(title => !title.startsWith('$:/'));
}

class IntentionTowerSearch extends Widget {
  search!: SearchWidget;

  render(parent: Element, nextSibling: Element): void {
    this.parentDomNode = parent;
    this.computeAttributes();
    this.search = this.makeChildWidget({
      type: 'auto-complete-search',
      attributes: {
        id: { type: 'string', value: 'itkg' },
        autoFocus: { type: 'string', value: 'no' },
      },
    }) as SearchWidget;
    this.children = [this.search];
    this.search.render(parent, nextSibling);
    this.search.autoCompleteInstance.update({
      plugins: undefined,
      reshape: ({ sources }: { sources: Array<{ sourceId: string }> }) => sources.filter(source => source.sourceId === 'itkg'),
      onStateChange: (state: unknown) => {
        this.search.autoCompleteState = state;
      },
      detachedMediaQuery: 'none',
      openOnFocus: true,
      placeholder: lingo('Search/Placeholder'),
      getSources: ({ query }: SearchParameters) => [{
        sourceId: 'itkg',
        getItems: () => {
          const needle = query.trim().toLocaleLowerCase();
          const matches = getCandidates().filter(title => {
            const tiddler = this.wiki.getTiddler(title)!;
            return ['title', 'caption', 'alias', 'text'].some(field => tiddler.getFieldString(field).toLocaleLowerCase().includes(needle));
          }).sort((left, right) => left.localeCompare(right));
          return [
            ...kinds.map(kind => ({ title: query.trim(), caption: `${lingo(`Search/Create/${kind}`)}${query.trim() ? `：${query.trim()}` : ''}`, kind })),
            ...matches.map(title => ({ title, caption: title })),
          ];
        },
        onSelect: ({ item }: { item: SearchItem }) => {
          if (item.kind) {
            this.create(item.kind, item.title);
          } else {
            this.dispatchEvent({ type: 'tm-navigate', navigateTo: item.title, navigateFromNode: this });
          }
          this.search.autoCompleteInstance.setQuery('');
          this.search.autoCompleteInstance.setIsOpen(false);
        },
        templates: {
          item: ({ item, createElement }: { item: SearchItem; createElement: (tag: string, props: Record<string, unknown>, text: string) => unknown }) =>
            createElement('div', { className: item.kind ? 'itkg-search-action' : 'itkg-search-result' }, item.caption),
        },
      }],
    });
  }

  create(kind: Kind, title: string): void {
    const tags = [this.wiki.getTiddlerText(`${plugin}/Config/${kind}-tag`)!];
    if (kind === 'project') tags.push(this.wiki.getTiddlerText(`${plugin}/Config/task-tag`)!);
    const newTitle = this.wiki.generateNewTitle(title || lingo(`Search/Create/${kind}`), {});
    this.wiki.addTiddler({
      ...this.wiki.getCreationFields(),
      ...this.wiki.getModificationFields(),
      title: newTitle,
      tags,
      text: '',
      ...(kind === 'intention' ? {} : { tmo_taskState: 'New', tmo_priority: '' }),
    });
    this.dispatchEvent({ type: 'tm-navigate', navigateTo: newTitle, navigateFromNode: this });
  }

  refresh(): boolean {
    return false;
  }
}

declare const exports: Record<string, typeof IntentionTowerSearch>;
exports['itkg-search'] = IntentionTowerSearch;
