import type { Note, FilteredNote, TagFilter } from "./types";
import { App, getAllTags } from "obsidian";
import { getDirName } from "./utils";
import { prepareSplitFuzzySearch, splitFuzzySearch } from "./fuzzySearch";

export function getAllNotes(app: App): Note[] {
	return app.vault.getMarkdownFiles().map((file) => {
		const cache = app.metadataCache.getFileCache(file);
		
		let tags = cache ? (getAllTags(cache) ?? []) : [];
		tags = tags.map(tag => tag.replace("#", ""));
		tags.sort((tagA, tagB) => tagA.localeCompare(tagB) );
		
		return {
			file,
			tags: [...new Set(tags)],
		};
	}).sort((noteA, noteB) => // Global notes sorting
		noteA.tags.length - noteB.tags.length ||
		getDirName(noteA.file.path).localeCompare(getDirName(noteB.file.path)) ||
		noteA.file.basename.localeCompare(noteB.file.basename)
	);
}

export function filterNotes(
	notes: Note[],
	tags: TagFilter[],
	query: string
): FilteredNote[] {
	// Filter by tags
	if (tags.length) {
		notes = notes.filter(note =>
			// Ensure the note satisfies EVERY tag criteria in the filter list
			tags.every(({name, exclude}) => {
				// Check if the note has the specified tag
				// or any of its nested sub-tags (e.g., "work/projects")
				const hasTag = note.tags.some(noteTag =>
					noteTag === name ||
					noteTag.startsWith(`${name}/`)
				);

				// Include filters require a match; exclude filters reject one
				return exclude ? !hasTag : hasTag;
			})
		);
	}

	// Filter by query
	query = query.trim();
	if (!query) {
		return notes.map((note): FilteredNote => {
			return {
				...note,
				nameMatches: [],
				pathMatches: [],
				score: 0
			};
		});
	} else {		
		const searches = prepareSplitFuzzySearch(query);
		return notes.map((note): FilteredNote | null => {
			const search = splitFuzzySearch(
				searches,
				note.file.basename,
				getDirName(note.file.path)
			);
			
			return search ? {
				...note,
				nameMatches: search.matches[0] ?? [],
				pathMatches: search.matches[1] ?? [],
				score: search.score
			} : null;
		})
		.filter(note => note !== null)
		.sort((noteA, noteB) => noteB.score - noteA.score);
	}
}