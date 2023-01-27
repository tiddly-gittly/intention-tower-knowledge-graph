# Wikitext plugin template for TiddlyWiki5

This template will help you automatically package zipped multiple-file plugin for nodejs wiki, and single file JSON plugin for HTML wiki.

## What need to change after apply the template

### Basic

1. update `title`, `author` and `description` in the [src/plugin.info](src/plugin.info).
2. write your plugin tiddlers in the [src/](src/) directory.
3. tid files just put in the src directory, they will be copy to the plugin automatically.
   1. You can use folder to organize the files, like `src/filters/` to place the filter tiddlers, and that structure will be preserved in the nodejs multiple-file plugin
   2. In the JSON plugin, the structure will strictly follow the tiddler title.
4. update demo site tiddlers in the [demo/](demo/) directory.
5. update this readme.md

### Examples

## Development

See [tiddly-gittly/Tiddlywiki-WikiText-Plugin-Template](https://github.com/tiddly-gittly/Tiddlywiki-WikiText-Plugin-Template) for detail.

There are some scripts you can run to boost your development.

After `npm i`:

- `npm run dev` to auto pack the plugin and run a demo site. Your change in the src directory will automatically refresh the site.
- `npm run dev-html` to see demo site with packed plugin after you finish your development, this can be your final check, this runs slower than `npm run dev`

### After the plugin is complete

#### Publish

Enable github action in your repo (in your github repo - setting - action - general) if it is not allowed, and when you tagging a new version `vx.x.x` in a git commit and push, it will automatically publish to the github release.

#### Demo

You will get a Github Pages demo site automatically after publish. If it is 404, you may need to manually enable Github Pages in your github repo:

Settings - Pages (on left side) - Build and deployment- Source - choose `"Github Actions"`

Next time you trigger a publish, the site will be updated. You can see the site link in Settings - Pages
