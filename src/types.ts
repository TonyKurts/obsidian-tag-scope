import type { TFile, SearchMatchPart } from "obsidian";

export interface Tag {
    display: string;
    key: string;
}

export interface TagFilter extends Tag {
    exclude: boolean;
}

export interface TagSuggestion extends Tag {
    count: number;
    matches: SearchMatchPart[];
    score: number;
};

export interface Note {
    file: TFile;
    tags: Tag[];
    aliases: string[];
};

export interface FilteredNote extends Note {
    name: string;
    aliasUsed: boolean;
    score: number;
    matches: {
        name: SearchMatchPart[];
        path: SearchMatchPart[];
    },
};

export function makeTag(value: string): Tag | null {
    value = value.replaceAll("#", "").trim();

    if (value) {
        return {
            display: value,
            key: value.toLowerCase(),
        }
    } else return null;
}