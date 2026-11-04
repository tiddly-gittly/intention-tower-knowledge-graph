# Autocomplete Integration Review

## Current upstream API

Reviewed tw-command-palette commit `b3d0535` (autocomplete 0.9.6).

- `widget.ts` reads `id`, `prefix`, `cycleHistoryMode`, `autoFocus`,
  `panelBelowInput` and `destroyWhenNotVis`. The widget can be embedded directly
  in WikiText using `<$auto-complete-search />`.
- Candidate filtering, enabled sources, action filtering, placeholder and the
  detached/mobile presentation are configured inside the implementation.
- `getSubPlugins.ts` loads JavaScript modules tagged `$:/tags/AutoCompletePlugin`.
  Plugin factories receive the widget ID. This is a JavaScript extension point.
- `phaseRouter.ts` selects a fixed set of source IDs for each prefix/mode.
  Arbitrary custom source IDs are excluded by that router.
- Action tiddlers tagged `$:/tags/Actions` already support WikiText actions,
  captions, descriptions and prompted variables. They currently appear through
  command-prefix mode alongside other global commands.
- The title/text ignore filter is global. History and tag sources have separate
  candidate selection paths.

The existing WikiText interface covers embedding and the global command-palette
workflow. An instance-scoped search with three inline creation actions requires
additional upstream configuration. Combining global ignore filters with tagged
actions would also affect the global command palette and retain its prefix flow.

## Current ITKG adapter

`widgets/search.ts` embeds the upstream widget as a child, then calls its Algolia
instance's `update()` method. This replaces sources, source reshaping and state
handling after the widget has initialized. It achieves the requested behaviour
while coupling ITKG to upstream instance properties and initialization order.

Keep this integration approach during the API evaluation, while applying the
core English language correction found in this review. Prefer a declarative
upstream interface for the long-term integration.

## Recommended upstream changes

Add an opt-in `mode="search"` to the existing widget. Keep the current palette
mode as the default.

| Proposed attribute   | Purpose                                                                      |
| -------------------- | ---------------------------------------------------------------------------- |
| `candidateFilter`    | WikiText filter defining this instance's searchable entries.                 |
| `actionFilter`       | WikiText filter defining action tiddlers shown in this instance.             |
| `placeholder`        | Localized input hint.                                                        |
| `openOnFocus`        | Show actions when focusing an empty input, independently of autofocus.       |
| `detachedMediaQuery` | Choose inline or detached/mobile presentation.                               |
| `limit`              | Bound the displayed search results; creation actions have their own section. |

Search mode should:

1. Initialize the desired sources once, before constructing the Algolia instance.
2. Search title, caption, alias and body within `candidateFilter`, using the
   instance's widget context and filter variables for the query.
3. Show only the configured actions and scoped results. Treat `>`, `#`, `[` and
   `?` as literal query text, independent of palette prefix routing.
4. Render configured action captions/descriptions as WikiText and execute their
   action strings with `commandpaletteinput` bound to the full query. Reuse the
   existing command execution machinery and prompted-variable support.
5. Keep action identity separate from the input title, so three creation actions
   remain distinct while using the same title input.
6. Update labels and candidate/action filters when their WikiText attributes or
   relevant configuration changes. Integrate these changes into the upstream
   widget lifecycle, including cleanup and panel positioning.
7. Preserve the existing global palette's sources, prefixes and history.

Proposed ITKG markup after the upstream release:

```html
<$auto-complete-search
  id="itkg"
  mode="search"
  candidateFilter=<<itkg-search-candidates>>
  actionFilter="[all[tiddlers+shadows]tag[$:/tags/ITKG/SearchAction]]"
  placeholder=<<itkg-search-placeholder>>
  autoFocus="no"
  openOnFocus="yes"
  detachedMediaQuery="none"
  limit="30"
/>
```

This is proposed syntax. The listed attributes require an upstream release.
ITKG would provide its candidate filter and three action tiddlers. Creation can
then use `$action-createtiddler` and `$action-navigate` directly in WikiText, and
the TypeScript adapter can be removed.

## Additional review findings

- **Core English setting (fixed):** an empty `$:/language` is the standard core
  English configuration. Reading its tiddler's `name` directly caused table
  setup and search labels to throw. Both now resolve the core English locale
  through the standard language filter, with regression coverage.
- **Live localization:** the current ITKG adapter returns `false` from `refresh()`;
  its placeholder and generated action labels can retain different language
  snapshots during a live language change. Upstream attribute refresh should
  cover this case.
- **Search cost:** the adapter walks the tag graph and checks body text on each
  query, including an empty query, and renders every match. Search mode should
  show actions on empty input, debounce text queries and limit visible matches.
- **Scope semantics:** the adapter includes the generic NewJournal tags. Those
  can also classify entries outside ITKG. Define the intended scope through an
  explicit ITKG filter, including configured ITKG entry tags and entries linked
  through weekly planning fields, with tests for unrelated journal entries.
- **Creation behaviour:** the former WikiText action sent `tm-auto-save-wiki`;
  the adapter writes directly through `wiki.addTiddler()`. Server synchronization
  and standalone HTML saving should both have integration coverage when moving
  creation back to action tiddlers.
- **Module execution:** TiddlyWiki's `boot/boot.js` caches `moduleInfo.exports`.
  Repeated `modules.execute()` calls retrieve the cached exports. The actual
  avoidable work was per-field setup. ITKG now calls `getColumns(fields)` once
  per table build, reads the locale once and shares a single date formatter
  within that batch. Each new batch uses the current language.
- **Empty field configuration:** splitting space-separated field settings could
  produce an empty column. Table templates now discard empty field names.

## Suggested verification for the upstream change

- Compare default palette behaviour before and after the change.
- Mount two instances with different filters and verify independent results,
  actions, query state and history.
- Exercise empty input, Chinese IME, mouse selection, keyboard selection,
  literal prefixes and queries containing brackets/quotes.
- Rename tags, change language/configuration, add/delete candidates and verify
  refreshed results while the widget remains mounted.
- Verify all three creation actions, duplicate titles, server persistence and
  standalone HTML autosave.
- Verify mobile inline mode, wide-screen alignment, panel cleanup and repeated
  layout switching.
