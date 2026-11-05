interface TableColumn {
  field: string;
  width: string;
  sort: boolean | ((left: string, right: string, order: string) => number);
  fieldFormat?: (record: { title: string }) => string;
}

function compareImportance(left: string | undefined, right: string | undefined, order: string): number {
  const leftImportance = left === undefined || left === '' ? 5 : Number(left);
  const rightImportance = right === undefined || right === '' ? 5 : Number(right);
  return (leftImportance - rightImportance) * (order === 'desc' ? -1 : 1);
}

export function getColumns(fields: string[]): TableColumn[] {
  const locale = $tw.wiki.filterTiddlers('[{$:/language}get[name]else[en-GB]]')[0];
  let formatter: Intl.DateTimeFormat | undefined;

  return fields.map(field => {
    const column: TableColumn = { field, width: 'auto', sort: true };

    if (field === 'tmo_importance') {
      column.sort = compareImportance;
    }

    if (field === 'modified' || field === 'created') {
      formatter ??= new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' });
      const dateFormatter = formatter;
      column.fieldFormat = record => {
        const date = $tw.wiki.getTiddler(record.title)!.fields[field];
        return date ? dateFormatter.format(date) : '';
      };
    }

    if (field === 'tmo_priority') {
      const ranks: Record<string, number> = { undefined: 2, '': 2 };
      ['Low', 'Medium', 'High'].forEach((priority, index) => {
        const label = $tw.wiki.getTiddlerText(
          '$:/plugins/linonetwo/tmo/language/' + locale + '/TraitTag/TMO/Task/Priority/' + priority,
          priority,
        );
        ranks[priority] = index + 1;
        ranks[label] = index + 1;
      });
      column.sort = (left, right, order) => (ranks[left] - ranks[right]) * (order === 'desc' ? -1 : 1);
    }

    return column;
  });
}
