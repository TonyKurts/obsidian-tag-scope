import type { TFile, SearchMatchPart } from "obsidian";

export interface TagSuggestion {
    name: string,
    count: number,
    matches: SearchMatchPart[],
};

export interface Note {
    file: TFile,
    tags: string[],
};