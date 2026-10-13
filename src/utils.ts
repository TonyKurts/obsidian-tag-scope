import { App, TFile, Notice, SearchMatchPart } from "obsidian";
import { TagFilter } from "./types";
import { PLUGIN_ID } from "./settings";

export async function openNote(
    app: App,
    file: TFile,
    newTab: boolean,
): Promise<void> {
    try {
        const leaf = app.workspace.getLeaf(newTab);
        await leaf.openFile(file);
    } catch (e) {
        new Notice(`Could not open the note "${file.basename}"`);
        console.error("Failed to open note:", e);
    }
}

export function getDirName(path: string): string {
    const lastSlashIndex = Math.max(
        path.lastIndexOf("/"),
        path.lastIndexOf("\\"),
    );

    return lastSlashIndex !== -1 ? path.substring(0, lastSlashIndex + 1) : "";
}

export function getClasses(classes?: string | string[]): string[] {
    if (!classes) return [];
    return Array.isArray(classes) ?
        classes :
        classes.split(" ");
}

export function className(name: string): string {
    return `${PLUGIN_ID}-${name}`;
}

export function highlightMatches(
    container: HTMLElement,
    text: string,
    matches: SearchMatchPart[]
): void {
    matches.sort((a, b) => a[0] - b[0]);

    let cursor = 0;
    for (const [from, to] of matches) {
        // Skip if the area was previously passed
        if (from < cursor) continue;

        // If the cursor finds before the HIGHLIGHTED text,
        // then it is normal text without selection
        if (from > cursor) {
            container.append(
                document.createTextNode(
                    text.slice(cursor, from)
                )
            );
        }

        // Text FROM and TO must be highlighted
        const highlightEl = createSpan(className("highlight"));
        highlightEl.textContent = text.slice(from, to);
        container.append(highlightEl);

        // It makes sense to work only from the last point TO
        cursor = to;
    }

    // If the text turns out to be larger than what was processed
    // through the cursor, then this is also considered normal text
    if (cursor < text.length) {
        container.append(
            document.createTextNode(
                text.slice(cursor),
            )
        );
    }
}

export function isTagSelected(
    tag: string,
    selectedTags: TagFilter[]
): boolean {
    return selectedTags.some(selectedTag => selectedTag.name === tag);
}

export function getObsidianIgnoreFilters(app: App): string[] {
	const vault = app.vault as App["vault"] & {
		getConfig?: (key: string) => unknown;
	};

	const filters = vault.getConfig?.("userIgnoreFilters");

	return Array.isArray(filters)
		? filters.filter((filter): filter is string => typeof filter === "string")
		: [];
}