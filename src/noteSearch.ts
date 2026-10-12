import type { Note, FilteredNote, TagFilter } from "./types";
import { App, getAllTags } from "obsidian";
import { getDirName } from "./utils";
import { prepareSplitFuzzySearch, splitFuzzySearch } from "./fuzzySearch";
import { getNoteSortingRules } from "./sorting";

export function getAllNotes(app: App): Note[] {
	return app.vault.getMarkdownFiles().map((file) => {
		const cache = app.metadataCache.getFileCache(file);
		
		let tags = cache ? (getAllTags(cache) ?? []) : [];
		tags = tags.map(tag => tag.replace("#", ""));
		tags.sort((tagA, tagB) => tagA.localeCompare(tagB));
		
		return {
			file,
			tags: [...new Set(tags)],
		};
	}).sort((a, b) => { // Global notes sorting
		const rules = getNoteSortingRules(a, b);
		return rules.tagsCount || rules.path || rules.name;
	});
}

function matchesTagFilters(note: Note, filters: TagFilter[]): boolean {
	// Ensure the note satisfies EVERY tag criteria in the filter list
	return filters.every(({ name, exclude }) => {
		// Check if the note has the specified tag
		// or any of its nested sub-tags (e.g., "work/projects")
		const hasTag = note.tags.some(noteTag =>
			noteTag === name || noteTag.startsWith(`${name}/`)
		);

		// Include filters require a match; exclude filters reject one
		return exclude ? !hasTag : hasTag;
	});
}

export function filterNotes(
	notes: Note[],
	tags: TagFilter[],
	query: string
): FilteredNote[] {
	// Filter by tags
	notes = tags.length
		? notes.filter(note => matchesTagFilters(note, tags))
		: notes;

	query = query.trim();
	if (!query) {
		return notes.map(note => ({
			...note,
			nameMatches: [],
			pathMatches: [],
			score: 0,
		}));
	}

	// Filter by query
	const searches = prepareSplitFuzzySearch(query);
	return notes
		.flatMap(note => {
			const search = splitFuzzySearch(
				searches,
				note.file.basename,
				getDirName(note.file.path),
			);

			if (!search) return [];

			return [{
				...note,
				nameMatches: search.matches[0] ?? [],
				pathMatches: search.matches[1] ?? [],
				score: search.score,
			}];
		})
		.sort((a, b) => {
			const rules = getNoteSortingRules(a, b);
			let score = a.score - b.score;
			return rules.tagsCount || score  || rules.path || rules.name;
		});
}