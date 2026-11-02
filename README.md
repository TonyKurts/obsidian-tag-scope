# Tag Scope for Obsidian

Tag Scope helps you find notes by narrowing your vault with tags, then refining the results by note name, path, alias, or a frontmatter title.

![Tag Scope Obsidian Plugin Demo](./assets/demo.webp)

## Features

- **Progressive tag filtering.** Include several tags to narrow the results. Selecting a parent tag also matches notes with tags nested beneath it, such as selecting `work` to match `work/projects`. Exclude tags to remove matching notes from the current result set.
- **Relevant tag suggestions (faceted search).** Suggestions come from the notes currently in the results and show how many of those notes use each tag. Nested tag suggestions are grouped to avoid showing unnecessary parent levels. Fuzzy matching highlights matching text.
- **Search by note name and path.** Search results prioritize notes with fewer tags, then better fuzzy matches; path and title break ties.
- **Alias support.** Search by frontmatter aliases as well as note names. Results identify when the displayed title comes from an alias.
- **Frontmatter titles.** Choose a frontmatter property, such as `title`, to use its string value as the note title in results and searches.
- **Tag and note exclusions.** Hide selected tags and their nested tags from search and suggestions while keeping the notes visible, or exclude notes that have selected tags.
- **Vault-aware search.** Obsidian's ignored files and folders are respected.
- **Result counts.** See the number of matching notes and available tags for the current search.
- **File actions.** Open a note using the configured behavior, use the alternate opening behavior, or reveal the note in Obsidian's File Explorer.
- **Insert links to notes.** Use the link insertion command from an editor to search for a note and insert a link into the current file. Selected editor text is used as the link alias when available.
- **Mobile layout.** The search modal adapts to phone and tablet layouts.

To start a search, run **Open search** from the command palette or select **Open search by tags** in the ribbon. To insert a link, place the cursor in an editor and run **Insert link**.

## Keyboard shortcuts and interactions

### Navigation

| Shortcut or interaction | Action |
| --- | --- |
| `Tab` | Switch between the tag and note search fields. |
| `↑/↓` | Move through search results. |
| `Enter/Click` a result | Open it using the configured default behavior; Insert a link to that note in the current editor. |
| `Ctrl/Cmd + Enter/Click` a result | Use the alternate opening behavior; Also insert the link. |
| `Alt + Enter/Click` a result | Reveal the note in File Explorer, when the File Explorer is open. |
| `Click` a tag shown a result | Add that tag as an included filter. |
| `Ctrl/Cmd + Click` a tag shown on a result | Add that tag as an excluded filter. |
| `Enter/Click` a tag suggestion | Add the selected tag as an included filter. |
| `Ctrl/Cmd + Enter/Click` a tag suggestion | Add the selected suggestion as an excluded filter. |
| Start a tag query with `!` | Add the selected suggestion as an excluded filter. |
| `Ctrl/Cmd + Click` a selected tag | Invert it between included and excluded. |
| `Click` a selected tag | Remove it from the search. |
| `Backspace` twice while the tag field is empty | Remove the last selected tag. |
| Select the mode indicator at the bottom of the modal | Return to normal search mode. |

- Selected tags, search results and their tags have context menus.
- If text is selected in the editor when link insertion mode opens, that text is used as the link alias.

## Settings

- **Tag suggestion sort order.** Choose how equally relevant tag suggestions are ordered: by name or by usage count.
- **Default note opening behavior.** Choose whether a result opens in the current tab or a new tab. The alternate action uses the other behavior.
- **Note title property.** Enter a frontmatter property name, such as `title`, to use its string value as the note title. Leave it empty to use the filename.
- **Exclude tags from search.** Enter one tag per line. These tags and their nested tags are omitted from search and tag suggestions, but notes containing them remain visible.
- **Exclude notes from search by tag.** Enter one tag per line. Notes with these tags or their nested tags are omitted from search results.
