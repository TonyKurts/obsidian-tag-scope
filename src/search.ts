import { App, getAllTags, prepareFuzzySearch, SearchMatchPart } from "obsidian";
import { getTagLength } from "./utils";
import type { Note, TagSuggestion } from "./types";

export function getAllNotes(app: App): Note[] {
	return app.vault.getMarkdownFiles().map((file) => {
		const cache = app.metadataCache.getFileCache(file);
		
		let tags = cache ? (getAllTags(cache) ?? []) : [];
		tags = tags.map(tag => tag.replace("#", ""));

		// Tags sorting
		tags.sort((tagA, tagB) => 
			getTagLength(tagA) - getTagLength(tagB) ||
			tagA.localeCompare(tagB)
		);
		
		return {
			file,
			tags: [...new Set(tags)],
		};
	}).sort((noteA, noteB) =>
		noteA.tags.length - noteB.tags.length ||
		noteB.file.basename.localeCompare(noteA.file.basename)
	);
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
	);
}

export function getTagSuggestions(
	notes: Note[],
	selected: string[],
	query: string
): TagSuggestion[] {
	const normalize = (value: string): string =>
		value.trim().toLocaleLowerCase();

	const needle = normalize(query);
	const fuzzySearch = prepareFuzzySearch(needle);
	const suggestions = new Map<
		string,
		{
			count: number;
			score: number;
			matches: SearchMatchPart[];
		}
	>();

	notes.forEach(note => {
		note.tags.forEach(tag => {
			tag = normalize(tag);

			if (selected.some(
				selectedTag =>
					tag === selectedTag ||
					selectedTag.startsWith(`${tag}/`)
			)) return;

			const match = fuzzySearch(tag);
			if (!match) return;

			const previous = suggestions.get(tag);

			// How many times this tag appears among the selected notes
			suggestions.set(
				tag, {
					count: (previous?.count ?? 0) + 1,
					score: Math.max(previous?.score ?? 0, match.score),
					matches: previous?.matches ?? match.matches
				}
			);
		});
	});

	return [...suggestions.entries()]
		.sort(
			([tagA, valueA], [tagB, valueB]) => 
				valueB.score - valueA.score ||
				getTagLength(tagA) - getTagLength(tagB) ||
				tagA.localeCompare(tagB) ||
				valueB.count - valueA.count 
		)
		.map(([name, value]) => ({
			name,
			count: value.count,
			matches: value.matches
		}));
}
