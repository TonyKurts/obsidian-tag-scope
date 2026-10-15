import { type Note, type TagSuggestion, type TagFilter, type Tag, makeTag } from "../types";
import { prepareSplitFuzzySearch, splitFuzzySearch } from "./fuzzySearch";
import { TagSuggestionSortOrder } from "../settings";
import { getTagSuggestionSortingRules } from "./sorting";

export function isTagIncluded(
	tag: Tag,
	collection: Tag[]
): boolean {
	return collection.some(owned => tag.key === owned.key);
}

// A candidate tag is covered when it is selected directly,
// or based on mode: when a more specific nested sub-tag is selected (subtags),
// or when a broader parent tag is already selected (parents).
export function isCoveredByTags(
	tag: Tag,
	collection: Tag[],
	includeSubtags = true
): boolean {
	return collection.some(owned => {
		return includeSubtags
            ? (tag.key === owned.key || owned.key.startsWith(`${tag.key}/`)) 
            : (tag.key === owned.key || tag.key.startsWith(`${owned.key}/`));
	});
}

// Returns a tag and all its parent tags.
// For example, "project/plugin" becomes ["project", "project/plugin"].
function getTagAncestors(tag: Tag): Tag[] {
	const parts = tag.display.split("/");
	return parts
		.map((_, index) => 
			makeTag(parts.slice(0, index + 1).join("/"))
		).filter(tag => tag !== null);
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
	const counts = new Map<string, { tag: Tag, count: number }>();

	// Count each candidate tag once per note, including its parent tags.
	for (const note of notes) {
		// Collect all parent in flat array
		const allAncestors = note.tags.flatMap(getTagAncestors);
		
		// Unique via Map using a unique field
		const uniqueNoteTags = new Map<string, Tag>();
		allAncestors.map(tag => uniqueNoteTags.set(tag.key, tag));
		const noteTags = [...uniqueNoteTags.values()];

		for (const noteTag of noteTags) {
			if (isCoveredByTags(noteTag, selected)) continue;
			const current = counts.get(noteTag.key);
			counts.set(noteTag.key, {
				tag: current?.tag ?? noteTag,
				count: (current?.count ?? 0) + 1,
			})
		}
	}

	// Search each unique tag once
	const suggestions: TagSuggestion[] = [];
	for (const { tag, count } of counts.values()) {
		const search = splitFuzzySearch(searches, { name: tag.key });
		if (!search) continue;

		suggestions.push({
			...tag,
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
					childTag.key.startsWith(`${parentTag.key}/`) &&
					!childTag.key.slice(parentTag.key.length + 1).includes("/")
				)

			return hasUsefulParentCount(parentTag.count, children);
		})
		.sort((a, b) => {
			const rules = getTagSuggestionSortingRules(a, b, sortOrder);
			return rules.score || rules.popularity || rules.name;
		});
}