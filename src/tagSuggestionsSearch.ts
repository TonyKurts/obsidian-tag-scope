import type { Note, TagSuggestion, TagFilter } from "./types";
import { prepareSplitFuzzySearch, splitFuzzySearch } from "./fuzzySearch";
import { TagSuggestionSortOrder } from "./settings";
import { getTagSuggestionSortingRules } from "./sorting";

// Returns a tag and all its parent tags.
// For example, "project/plugin" becomes ["project", "project/plugin"].
function getTagAncestors(tag: string): string[] {
	const parts = tag.split("/");
	return parts.map((_, index) => parts.slice(0, index + 1).join("/"));
}

// A candidate tag is covered when it is selected directly
// or when a more specific nested tag is already selected.
function isCoveredBySelectedTag(tag: string, selected: TagFilter[]): boolean {
	return selected.some(({ name }) =>
		tag === name || name.startsWith(`${tag}/`)
	);
}

// Keeps a parent suggestion when it has multiple immediate children
// or its count differs from the combined counts of those children.
function hasUsefulParentCount(
	parentCount: number,
	children: TagSuggestion[],
): boolean {
	return children.length > 1 ||
		parentCount !== children.reduce((total, child) => total + child.count, 0);
}

export function getTagSuggestions(
	notes: Note[],
	selected: TagFilter[],
	query: string,
	sortOrder: TagSuggestionSortOrder
): TagSuggestion[] {
	const searches = prepareSplitFuzzySearch(query);
	const counts = new Map<string, number>();

	// Count each candidate tag once per note, including its parent tags.
	for (const note of notes) {
		const tagsInNote = new Set(note.tags.flatMap(getTagAncestors));

		for (const tag of tagsInNote) {
			if (isCoveredBySelectedTag(tag, selected)) continue;
			counts.set(tag, (counts.get(tag) ?? 0) + 1);
		}
	}

	// Search each unique tag once
	const suggestions: TagSuggestion[] = [];
	for (const [tag, count] of counts) {
		const search = splitFuzzySearch(searches, tag);
		if (!search) continue;

		suggestions.push({
			name: tag,
			count,
			score: search.score,
			matches: search.matches[0] ?? [],
		});
	}

	return suggestions
		.filter(parentTag => {
			// Considetr only immediate children, not deeper descendants.
			const children = suggestions
				.filter(childTag =>
					childTag.name.startsWith(`${parentTag.name}/`) &&
					!childTag.name.slice(parentTag.name.length + 1).includes("/")
				)

			return hasUsefulParentCount(parentTag.count, children);
		})
		.sort((a, b) => {
			const rules = getTagSuggestionSortingRules(a, b, sortOrder);
			return rules.score || rules.popularity || rules.name;
		});
}