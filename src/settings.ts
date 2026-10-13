import type TagScopePlugin from "./main";
import { App, PluginSettingTab, SettingDefinitionItem } from "obsidian";

export const PLUGIN_ID = "tag-scope";

export type TagSuggestionSortOrder = "name" | "counter";
export type OpenNoteDefaultBehaviour = "currentTab" | "newTab";

export interface TagScopeSettings {
	tagSuggestionSortOrder: TagSuggestionSortOrder;
	openNoteDefaultBehaviour: OpenNoteDefaultBehaviour;
	excludedTags: string;
}

export const DEFAULT_SETTINGS: TagScopeSettings = {
	tagSuggestionSortOrder: "name",
	openNoteDefaultBehaviour: "currentTab",
	excludedTags: "",
};

export function parseExcludedTags(value: string): string[] {
	return [
		...new Set(
			value
				.split(/\r?\n/)
				.map(tag => tag.trim().replace(/^#/, "").trim())
				.filter(Boolean)
		),
	];
}

export class TagScopeSettingsTab extends PluginSettingTab {
    plugin: TagScopePlugin;

    constructor(app: App, plugin: TagScopePlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

	getSettingDefinitions(): SettingDefinitionItem[] {
		return [
			{
				name: "Tag suggestion sort order",
				desc: "How tag suggestions are sorted in the input suggestion popup.",
				control: {
					type: "dropdown",
					key: "tagSuggestionSortOrder",
					options: {
						name: "Name",
						counter: "Counter",
					},
				},
			},
			{
				name: "Default note opening behavior",
				desc: "How notes open when clicked in search results. Hold Ctrl on Windows/Linux or Cmd on macOS to use the alternate behavior.",
				control: {
					type: "dropdown",
					key: "openNoteDefaultBehaviour",
					options: {
						currentTab: "Current tab",
						newTab: "New tab"
					},
				},
			},
			{
				name: "Exclude tags from search",
				desc: "Enter one tag per line. These tags and their nested tags won't appear in search results, but notes containing them will remain visible.",
				control: {
					type: "textarea",
					key: "excludedTags",
					rows: 5,
					placeholder: "work\narchive\nstatus/canceled",
				},
			},
		];
	}
}