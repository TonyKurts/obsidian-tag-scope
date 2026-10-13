import type { Note, FilteredNote, TagFilter } from "../types";
import { App, getAllTags, parseFrontMatterAliases } from "obsidian";
import { getDirName, getObsidianIgnoreFilters } from "../utils";
import { prepareSplitFuzzySearch, splitFuzzySearch } from "./fuzzySearch";
import { isCoveredByTags } from "./tagSearch";
import { getNoteSortingRules } from "./sorting";

export function getAllNotes(
	app: App,
	excludedTags: string[],
	excludedNoteTags: string[]
): Note[] {
	const ignoreFilters = getObsidianIgnoreFilters(app);
	return app.vault.getMarkdownFiles()
		.filter(file => 
			!ignoreFilters.some(
				ignoreFilter => file.path.startsWith(ignoreFilter)
			)
		).map(file => {
			const cache = app.metadataCache.getFileCache(file);

			// Tags
			let tags = cache ? (getAllTags(cache) ?? []) : [];
			tags = [...new Set(tags)]
				.map(tag => tag.replace("#", ""))
				.filter(tag => !isCoveredByTags(tag, excludedTags, false))
				.sort((tagA, tagB) => tagA.localeCompare(tagB));

			// Exclude note by tag
			if (tags.some(tag => isCoveredByTags(tag, excludedNoteTags, false))) {
				return null;
			}

			// Aliases
			let aliases = parseFrontMatterAliases(cache?.frontmatter) ?? [];
			aliases = [...new Set(aliases)]
				.filter(alias => alias.trim() && alias !== file.basename)

			return { file, tags, aliases };
		}).filter(note =>
			note !== null
		).sort((a, b) => {
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
			name: note.file.basename,
			aliasUsed: false,
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
			const path = getDirName(note.file.path);
			let bestName: string | null = note.file.basename;
			let aliasUsed = false;
			
			let bestSearch = splitFuzzySearch(searches, {
				name: bestName,
				path,
			});

			if (!bestSearch) {
				bestName = null;

				for (const alias of note.aliases) {
					const search = splitFuzzySearch(searches, {
						name: alias,
						path
					});

					if (!search) continue;
					if (!bestSearch || search.score < bestSearch.score) {
						bestName = alias;
						bestSearch = search;
						aliasUsed = true;
					}
				}
			}

			if (!bestSearch || !bestName) return [];

			return [{
				...note,
				name: bestName,
				aliasUsed,
				matches: {
					name: bestSearch.matches.name ?? [],
					path: bestSearch.matches.path ?? []
				},
				score: bestSearch.score,
			}];
		})
		.sort((a, b) => {
			const rules = getNoteSortingRules(a, b);
			let score = a.score - b.score;
			return rules.tagsCount || score  || rules.path || rules.name;
		});
}