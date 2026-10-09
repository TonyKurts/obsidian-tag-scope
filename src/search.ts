import { App, getAllTags, prepareFuzzySearch, SearchMatchPart } from "obsidian";
import { getDirName } from "./utils";
import type { Note, TagSuggestion, FilteredNote, FuzzySearchHandler, FuzzySearchResult, TagFilter } from "./types";

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

function prepareSplitFuzzySearch(query: string): FuzzySearchHandler[] {
		return query
			.split(/\s+/)
			.map(word => prepareFuzzySearch(word));
	}

function splitFuzzySearch(
	searchers: FuzzySearchHandler[],
	...texts: string[]
): FuzzySearchResult {
	const results = searchers.map(search => {
		return texts.map(text => {
			return search(text);
		});
	});

	const textsCount = texts.length;
	const totalMathes: SearchMatchPart[][] = [];
	let totalScore: number = 0;

	for (let textIndex = 0; textIndex < textsCount; textIndex++) {
		const matches: SearchMatchPart[] = [];
		const scores: number[] = [];

		for (const result of results) {
			if (result.every(word => word == null)) return null;
			
			const resultByText = result[textIndex];
			
			if (resultByText) {
				matches.push(...resultByText.matches);
				scores.push(resultByText.score);
			}
		}

		totalMathes.push(matches);
		totalScore += Math.max(...scores);
	}

	return {
		matches: totalMathes,
		score: totalScore
	}
}

export function getTagSuggestions(
	notes: Note[],
	selected: TagFilter[],
	query: string
): TagSuggestion[] {
	if (query.startsWith("!")) {
		query = query.slice(1);
	}

	const searches = prepareSplitFuzzySearch(query);
	const suggestions = new Map<
		string,
		{
			count: number;
			score: number;
			matches: SearchMatchPart[];
		}
	>();

	notes.forEach(note => {
		// The same tag should only be counted once per note
		const noteTags = new Set<string>();

		// For #project/plugin also add #project
		note.tags.forEach(tag => {
			const parts = tag.split("/");
			for (let depth = 1; depth <= parts.length; depth++) {
				noteTags.add(parts.slice(0, depth).join("/"));
			}
		});

		noteTags.forEach(tag => {
			if (selected.some(
				({name}) =>
					tag === name ||
					name.startsWith(`${tag}/`)
			)) return;

			const search = splitFuzzySearch(searches, tag);
			if (!search) return;
			
			const previous = suggestions.get(tag);

			// How many times this tag appears among the selected notes
			suggestions.set(
				tag, {
					count: (previous?.count ?? 0) + 1,
					score: Math.max(previous?.score ?? 0, search.score),
					matches: previous?.matches ?? search.matches[0] ?? []
				}
			);
		});
	});

	const entries = [...suggestions.entries()];
	return entries
		.filter(([parent, meta]) => {
			// Collect only immediate children, excluding deeper descendants
			const children = entries.filter(([tag]) =>
				tag.startsWith(`${parent}/`) &&
				!tag.slice(parent.length + 1). includes("/")
			);

			// Keep a parent when it has multiple immediate child tags
			const hasSeveralChildren = children.length > 1;

			// Also keep it when its count differs from the combined counts of its children
			const hasDifferentCount =
				meta.count !==
				children.reduce(
					(acc, [, childMeta]) => acc + childMeta.count, 0
				);

			// Retain the parent if either condition makes it useful as a suggestion
			return hasSeveralChildren || hasDifferentCount;
		})
		.sort(
			([tagA, valueA], [tagB, valueB]) => 
				valueB.score - valueA.score ||
				tagA.localeCompare(tagB)
		)
		.map(([name, value]) => ({
			name,
			count: value.count,
			matches: value.matches
		}));
}
