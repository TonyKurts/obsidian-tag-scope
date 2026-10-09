import type { TFile, SearchMatchPart, SearchResult } from "obsidian";

export interface TagSuggestion {
    name: string;
    count: number;
    matches: SearchMatchPart[];
};

export interface Note {
    file: TFile;
    tags: string[];
};

export interface TagFilter {
    name: string,
    exclude: boolean
}

export interface FilteredNote extends Note {
    nameMatches: SearchMatchPart[];
    pathMatches: SearchMatchPart[];
    score: number;
};

export type FuzzySearchHandler = (text: string) => SearchResult | null;
export type FuzzySearchResult = {
    matches: SearchMatchPart[][],
    score: number
} | null;