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
    title: string;
    usesFrontmatterTitle: boolean;
    tags: Tag[];
    aliases: string[];
};

export interface FilteredNote extends Note {
    displayPath: string,
    usesAlias: boolean;
    score: number;
    matches: {
        title: SearchMatchPart[];
        displayPath: SearchMatchPart[];
    },
};

export function makeTag(value: string): Tag | null {
    value = value.replaceAll("#", "").trim();
    value = value.replace(/^\/+|\/+$/g, '');

    if (value) {
        return {
            display: value,
            key: value.toLowerCase(),
        }
    } else return null;
}