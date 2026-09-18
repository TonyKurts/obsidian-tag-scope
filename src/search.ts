import { App, getAllTags } from "obsidian";
import type { Note, TagSuggestion } from "./types";

export function getAllNotes(app: App): Note[] {
	return app.vault.getMarkdownFiles().map((file) => {
		const cache = app.metadataCache.getFileCache(file);
		const tags = cache ? (getAllTags(cache) ?? []) : [];
		return {
			file,
			tags: [...new Set(tags)],
		};
	});
}

export function getTagSuggestions(
	notes: Note[],
	selected: string[],
): TagSuggestion[] {}
