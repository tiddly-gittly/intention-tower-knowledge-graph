interface TableColumn {
  field: string;
  width: string;
  sort: boolean | ((left: string, right: string, order: string) => number);
  fieldFormat?: (record: { title: string }) => string;
}

export function getColumn(field: string): TableColumn {
  const column: TableColumn = { field, width: 'auto', sort: true };
  const language = $tw.wiki.getTiddlerText('$:/language')!;
  const locale = $tw.wiki.getTiddler(language)!.fields.name as string;

  if (field === 'modified' || field === 'created') {
    const formatter = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' });
    column.fieldFormat = record => {
      const date = $tw.wiki.getTiddler(record.title)!.fields[field];
      return date ? formatter.format(date) : '';
    };
  }

  if (field === 'tmo_priority') {
    // Match the default Medium priority used by compareByPriority.
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
}
