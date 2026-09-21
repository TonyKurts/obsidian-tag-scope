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

export function filterNotes(
	notes: Note[],
	tags: string[]): Note[] {
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
	query: string
): TagSuggestion[] {
	const normalize = (tag: string): string => {
		return tag
			.trim()
			.toLocaleLowerCase();
	}

	const needle = normalize(query);
	const counts = new Map<string, number>();

	notes.forEach(note => {
		// The same tag should only be counted once per note
		const noteTags = new Set<string>();

		note.tags.forEach(tag => {
			const parts = tag.split("/");

			// For #project/plugin also add #project
			for (let depth = 1; depth <= parts.length; depth++) {
				noteTags.add(parts.slice(0, depth).join("/"));
			}
		});

		noteTags.forEach(tag => {
			tag = normalize(tag);
			if (!tag.includes(needle)) return;

			if (selected.some(
				selectedTag =>
					tag === selectedTag ||
					selectedTag.startsWith(`${tag}/`)
			)) return;

			// How many times this tag appears among the selected notes
			counts.set(tag, (counts.get(tag) ?? 0) + 1);
		});
	});

	return [...counts.entries()]
		.sort(
			([tagA, countA], [tagB, countB]) => 
				tagA.localeCompare(tagB) ||
				countB - countA 
		)
		.map(([name, count]) => ({ name, count }));
}
