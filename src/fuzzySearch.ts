import { SearchResult, prepareFuzzySearch, SearchMatchPart } from "obsidian";

type FuzzySearchHandler = (text: string) => SearchResult | null;

type FuzzySearchResult = {
    matches: SearchMatchPart[][],
    score: number
} | null;

export function prepareSplitFuzzySearch(query: string): FuzzySearchHandler[] {
    return query
        .split(/\s+/)
        .map(word => prepareFuzzySearch(word));
}

export function splitFuzzySearch(
	searchers: FuzzySearchHandler[],
	...texts: string[]
): FuzzySearchResult {
	const matchesByText = texts.map((): SearchMatchPart[] => []);
	const bestScoreByText = texts.map(() => 0);

	for (const search of searchers) {
		const results = texts.map(text => search(text));

		// Every query word must match at least one of the provided texts.
		if (results.every(result => result === null)) {
			return null;
		}

		results.forEach((result, textIndex) => {
			if (!result) return;
        
			// Collect ranges for highlighting this text
			const matches = matchesByText[textIndex];
	        const bestScore = bestScoreByText[textIndex];
            if (!matches || bestScore === undefined) return;

            matches.push(...result.matches);
            // Keep the best score for this text across all query words
	        bestScoreByText[textIndex] = Math.max(bestScore, result.score);
		});
	}

	return {
		matches: matchesByText,
		// Add the best score from each text, such as the file name and path
		score: bestScoreByText.reduce((total, score) => total + score, 0),
	};
}