import type { Note, FilteredNote, TagFilter } from "../types";
import { App, getAllTags, parseFrontMatterAliases } from "obsidian";
import { getDirName } from "../utils";
import { prepareSplitFuzzySearch, splitFuzzySearch } from "./fuzzySearch";
import { getNoteSortingRules } from "./sorting";

export function getAllNotes(app: App): Note[] {
	return app.vault.getMarkdownFiles().map((file) => {
		const cache = app.metadataCache.getFileCache(file);
		
		// Tags
		let tags = cache ? (getAllTags(cache) ?? []) : [];
		tags = [...new Set(tags)];
		tags = tags.map(tag => tag.replace("#", ""));
		tags.sort((tagA, tagB) => tagA.localeCompare(tagB));

		// Aliases
		const aliases = parseFrontMatterAliases(cache?.frontmatter) ?? [];
		return { file, tags, aliases };
	}).sort((a, b) => {
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
			matches: {
				name: [],
				path: []
			},
			score: 0,
		}));
	}

	// Filter by query
	const searches = prepareSplitFuzzySearch(query);
	return notes
		.flatMap(note => {
			const search = splitFuzzySearch(
				searches,
				{
					name: note.file.basename,
					path: getDirName(note.file.path)
				}
			);

			if (!search) return [];

			return [{
				...note,
				matches: {
					name: search.matches.name ?? [],
					path: search.matches.path ?? []
				},
				score: search.score,
			}];
		})
		.sort((a, b) => {
			const rules = getNoteSortingRules(a, b);
			let score = a.score - b.score;
			return rules.tagsCount || score  || rules.path || rules.name;
		});
}