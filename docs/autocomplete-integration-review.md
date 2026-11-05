# Declarative Autocomplete Integration

## Upstream API

The [upstream PR #46](https://github.com/tiddly-gittly/tw-command-palette/pull/46)
adds an opt-in `mode="search"` to `auto-complete-search`.
The default palette retains its prefixes, history and global sources.
The Demo bundles autocomplete 0.9.7 built locally from upstream commit `8886af4`.

| Attribute            | Purpose                                                            |
| -------------------- | ------------------------------------------------------------------ |
| `candidateFilter`    | Defines searchable entries using the embedding widget's variables. |
| `actionFilter`       | Selects WikiText action tiddlers for this instance.                |
| `placeholder`        | Sets the localized input hint.                                     |
| `openOnFocus`        | Shows actions on focus independently of autofocus.                 |
| `detachedMediaQuery` | Selects inline or detached/mobile presentation.                    |
| `limit`              | Limits search results, separately from creation actions.           |

Search mode matches title, caption, alias and body within the candidate filter.
Queries use a filter variable, so brackets, quotes and palette prefixes remain
literal search text. Empty input displays actions; text searches are debounced
per instance. Open results refresh when wiki content changes. Attribute updates
refresh the widget while preserving its query and focus within that instance.

Action captions and descriptions render as WikiText. Actions receive
`commandpaletteinput`, `currentTiddler` and `selectedText`, and share the existing
command execution and prompted-variable implementation.

## ITKG implementation

`components/Search.tid` embeds the upstream widget directly in WikiText.
`Actions/Search/` contains the task, project and intention creation actions.
The former TypeScript search adapter has been removed.

Candidate scope includes configured task/project/intention/calendar tag trees,
configured weekly-entry tags, the ITKG weekly-entry marker and entries with
weekly planning fields. Generic journal tags remain separate from this scope.
The creation actions use `$action-createtiddler`, preserve task defaults, send
`tm-auto-save-wiki` and navigate through the layout's existing event handling.

The toolbar keeps its responsive layout: the return button sits to the left on
wide screens and occupies the row above search on narrow screens. Weekly
tables retain HyperTable's adaptive width mode.

## Build the upstream plugin into the Demo

With both repositories checked out alongside each other:

```sh
cd ../tw-command-palette
pnpm install
pnpm exec tiddlywiki-plugin-dev build --library --output dist/library
cd ../intention-tower-knowledge-graph
pnpm demo:autocomplete ../tw-command-palette
pnpm dev
```

The import script wraps the generated library plugin in TiddlyWiki's JSON
tiddler-array format at `wiki/tiddlers/system/$__plugins_linonetwo_autocomplete.json`.
The committed artifact lets the Demo run directly from this repository.

## Review and validation

- Upstream tests cover scoped filters, literal queries, limits, embedded
  variables, WikiText actions, live candidates, attribute refresh and independent
  instances, alongside the existing palette regression suite.
- ITKG browser tests cover the three creation actions, keyboard and mouse
  selection, scope isolation, localized labels, responsive toolbar layout,
  adaptive table width, body editing and semantic sorting.
- `getColumns(fields)` performs one table setup per batch, reads the current
  language once and shares one date formatter. TiddlyWiki caches module exports
  when `modules.execute()` is called.
- An empty `$:/language` uses the standard core English locale. Table settings
  discard empty field names before constructing columns.
