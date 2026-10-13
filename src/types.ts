import type { TFile, SearchMatchPart } from "obsidian";

export interface Note {
    file: TFile;
    tags: string[];
    aliases: string[];
};

export interface FilteredNote extends Note {
    matches: {
        name: SearchMatchPart[],
        path: SearchMatchPart[]
    },
    score: number;
};

export interface TagFilter {
    name: string,
    exclude: boolean
}

export interface TagSuggestion {
    name: string;
    count: number;
    matches: SearchMatchPart[];
    score: number;
};