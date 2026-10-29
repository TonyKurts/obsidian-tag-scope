import { type Note, type TagSuggestion, type TagFilter, type Tag, makeTag } from "../types";
import { prepareSplitFuzzySearch, splitFuzzySearch } from "./fuzzySearch";
import { TagSuggestionSortOrder } from "../settings";
import { getTagSuggestionSortingRules } from "./sorting";
import { uniqueByKey } from "../utils";

export function isTagIncluded(
	tag: Tag,
	items: Tag[]
): boolean {
	return items.some(item => tag.key === item.key);
}

// Checks whether the list contains the tag itself or any tag nested beneath it.
// For example, `color` matches `color` and `color/green`, but not `colorful`.
// Use this when a parent tag should also match notes tagged with its subtags.
export function hasTagOrSubtag(tag: Tag, tags: Tag[]): boolean {
	return tags.some(item =>
		item.key === tag.key ||
		item.key.startsWith(`${tag.key}/`)
	);
}

// Checks whether the tag itself matches, or is nested beneath, any tag in the list.
// For example, `color/green` matches `color` and `color/green`, but not `colorful`.
// Use this when a listed parent tag should cover all tags in its sub-tree.
export function isTagOrSubtagOfAny(tag: Tag, tags: Tag[]): boolean {
	return tags.some(item =>
		tag.key === item.key ||
		tag.key.startsWith(`${item.key}/`)
	);
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
		const noteTags = uniqueByKey(
			note.tags.flatMap(getTagAncestors)
		);

		for (const noteTag of noteTags) {
			if (hasTagOrSubtag(noteTag, selected)) continue;
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