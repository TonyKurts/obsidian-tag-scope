import type { Note, TagSuggestion, TagFilter } from "../types";
import { prepareSplitFuzzySearch, splitFuzzySearch } from "./fuzzySearch";
import { TagSuggestionSortOrder } from "../settings";
import { getTagSuggestionSortingRules } from "./sorting";

export function isTagSelected(
	tag: string,
	selected: TagFilter[]
): boolean {
	return selected.some(selected => selected.name === tag);
}

// Returns a tag and all its parent tags.
// For example, "project/plugin" becomes ["project", "project/plugin"].
function getTagAncestors(tag: string): string[] {
	const parts = tag.split("/");
	return parts.map((_, index) => parts.slice(0, index + 1).join("/"));
}

// A candidate tag is covered when it is selected directly,
// or based on mode: when a more specific nested sub-tag is selected (subtags),
// or when a broader parent tag is already selected (parents).
export function isCoveredByTags(
	tag: string,
	selected: (TagFilter | string)[],
	includeSubtags = true
): boolean {
	return selected.some(selectedTag => {
		const name = typeof selectedTag === "string" ? selectedTag : selectedTag.name;
		return includeSubtags
            ? (tag === name || name.startsWith(`${tag}/`)) 
            : (tag === name || tag.startsWith(`${name}/`));
	});
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
			if (isCoveredByTags(tag, selected)) continue;
			counts.set(tag, (counts.get(tag) ?? 0) + 1);
		}
	}

	// Search each unique tag once
	const suggestions: TagSuggestion[] = [];
	for (const [tag, count] of counts) {
		const search = splitFuzzySearch(searches, { name: tag });
		if (!search) continue;

		suggestions.push({
			name: tag,
			count,
			score: search.score,
			matches: search.matches.name ?? [],
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