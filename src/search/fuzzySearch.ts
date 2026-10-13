import { SearchResult, prepareFuzzySearch, SearchMatchPart } from "obsidian";

type FuzzySearchHandler = (text: string) => SearchResult | null;

export type SplitFuzzySearchResult = {
	matches: Record<string, SearchMatchPart[]>;
	score: number;
} | null;

export function prepareSplitFuzzySearch(query: string): FuzzySearchHandler[] {
	let words = [...new Set(query.trim().split(/\s+/).filter(Boolean))];
    return words.map(word => prepareFuzzySearch(word));
}

export function splitFuzzySearch(
	searchers: FuzzySearchHandler[],
	texts: Record<string, string>
): SplitFuzzySearchResult {
	const resultsByText: Record<string, (SearchResult | null)[]> = {};
	const matchedWords = searchers.map(() => false);

	// Search every query word in every text field and keep the results for reuse
	for (const [textName, text] of Object.entries(texts)) {
		const textResults = searchers.map(search => search(text));

		resultsByText[textName] = textResults;

		textResults.forEach((result, wordIndex) => {
			if (result) matchedWords[wordIndex] = true;
		});
	}

	// Every query word must match in at least one text field
	if (matchedWords.some(matched => !matched)) return null;
	
	const matches: Record<string, SearchMatchPart[]> = {};
	let score = 0;

	// Collect highlights and preserve the existing score calculation.
	for (const [textName, textResults] of Object.entries(resultsByText)) {
		matches[textName] = [];

		for (const result of textResults) {
			if (!result) continue;

			matches[textName].push(...result.matches);

			if (result.score !== Number.NEGATIVE_INFINITY) {
				score -= result.score;
			}
		}
	}
	
	return { matches, score };
}