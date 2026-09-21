import { App, getAllTags, prepareFuzzySearch, SearchMatchPart } from "obsidian";
import { getDirName, getTagDepth } from "./utils";
import type { Note, TagSuggestion, FilteredNote } from "./types";

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
		const searches = query
			.split(/\s+/)
			.map(word => prepareFuzzySearch(word));

		return notes.map((note): FilteredNote | null => {
			const nameMatches: SearchMatchPart[] = [];
			const pathMatches: SearchMatchPart[] = [];
			let score = 0;
			let exclude = false;

			searches.forEach(search => {
				const nameMatch = search(note.file.basename);
				const pathMatch = search(getDirName(note.file.path));
				const scores: number[] = [];

				if (!nameMatch && !pathMatch) {
					exclude = true;
					return;
				};
				
				if (nameMatch) {
					nameMatches.push(...nameMatch.matches);
					scores.push(nameMatch.score);
				}

				if (pathMatch) {
					pathMatches.push(...pathMatch.matches);
					scores.push(pathMatch.score);
				}

				score += Math.max(...scores);
			});

			nameMatches.sort((a, b) => a[0] - b[0]);
  			pathMatches.sort((a, b) => a[0] - b[0]);

			return exclude ? null : {...note, nameMatches, pathMatches, score };
		})
		.filter(note => note !== null)
		.sort((noteA, noteB) => noteB.score - noteA.score);
	}
}

export function getTagSuggestions(
	notes: Note[],
	selected: string[],
	query: string
): TagSuggestion[] {
	const fuzzySearch = prepareFuzzySearch(query.trim());
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
