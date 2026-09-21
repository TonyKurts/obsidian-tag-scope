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

export function filterNotes(notes: Note[], tags: string[]): Note[] {
	// FIXME: Add fuzzy-search by filename / title / path
	if (tags.length === 0) return notes;

	// Keep notes that contain every selected tag,
  	// including nested tags under the selected tag.
	return notes.filter(note =>
		tags.every(tag => 
			note.tags.some(noteTag =>
				noteTag === tag ||
				noteTag.startsWith(`${tag}/`)
			)
		)
	)
}

export function getTagSuggestions(
	notes: Note[],
	selected: string[],
): TagSuggestion[] {}
