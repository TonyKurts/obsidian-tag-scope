import type { TFile, SearchMatchPart } from "obsidian";

export interface Note {
    file: TFile;
    tags: string[];
    aliases: string[];
};

export interface FilteredNote extends Note {
    name: string;
    isNameAlias: boolean;
    score: number;
    matches: {
        name: SearchMatchPart[];
        path: SearchMatchPart[];
    },
};

export interface TagFilter {
    name: string;
    exclude: boolean;
}

export interface TagSuggestion {
    name: string;
    count: number;
    matches: SearchMatchPart[];
    score: number;
};