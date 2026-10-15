import { TagSuggestionSortOrder } from "../settings";
import { Note, TagSuggestion } from "../types";
import { getDirName } from "../utils";

export function getNoteSortingRules(a: Note, b: Note) {
    return {
        tagsCount: a.tags.length - b.tags.length,
        path: getDirName(a.file.path).localeCompare(getDirName(b.file.path)),
        title: a.title.localeCompare(b.title)
    }
}

export function getTagSuggestionSortingRules(
    a: TagSuggestion,
    b: TagSuggestion,
    sortOrder: TagSuggestionSortOrder
) {
    return {
        score: a.score - b.score,
        popularity: sortOrder === "counter" ? b.count - a.count : 0,
        name: a.key.localeCompare(b.key),
    }
}