import { App, getAllTags, prepareFuzzySearch, SearchMatchPart } from "obsidian";
import { getDirName, getTagDepth } from "./utils";
import type { Note, TagSuggestion, FilteredNote, FuzzySearchHandler, FuzzySearchResult } from "./types";

export function getAllNotes(app: App): Note[] {
	return app.vault.getMarkdownFiles().map((file) => {
		const cache = app.metadataCache.getFileCache(file);
		
		let tags = cache ? (getAllTags(cache) ?? []) : [];
		tags = tags.map(tag => tag.replace("#", ""));

		// Sorting tags within notes
		tags.sort((tagA, tagB) => 
			getTagDepth(tagA) - getTagDepth(tagB) ||
			tagA.localeCompare(tagB)
		);
		
		return {
			file,
			tags: [...new Set(tags)],
		};
	}).sort((noteA, noteB) => // Global notes sorting
		noteA.tags.length - noteB.tags.length ||
		noteB.file.basename.localeCompare(noteA.file.basename)
	);
}

export function filterNotes(
	notes: Note[],
	tags: string[],
	query: string
): FilteredNote[] {
	// Filter by tags
	// 
	// Keep notes that contain every selected tag,
  	// including nested tags under the selected tag.
	if (tags.length) {
		notes = notes.filter(note =>
			tags.every(tag => 
				note.tags.some(noteTag =>
					noteTag === tag ||
					noteTag.startsWith(`${tag}/`)
				)
			)
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
	selected: string[],
	query: string
): TagSuggestion[] {
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
		note.tags.forEach(tag => {
			if (selected.some(
				selectedTag =>
					tag === selectedTag ||
					selectedTag.startsWith(`${tag}/`)
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

	return [...suggestions.entries()]
		.sort(
			([tagA, valueA], [tagB, valueB]) => 
				valueB.score - valueA.score ||
				getTagDepth(tagA) - getTagDepth(tagB) ||
				tagA.localeCompare(tagB) ||
				valueB.count - valueA.count 
		)
		.map(([name, value]) => ({
			name,
			count: value.count,
			matches: value.matches
		}));
}
