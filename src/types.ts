import type { TFile } from "obsidian";

export interface TagSuggestion {
    name: string,
    count: number,
};

export interface Note {
    file: TFile,
    tags: string[],
};