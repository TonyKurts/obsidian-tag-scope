import type TagScopePlugin from "./main";
import { App, PluginSettingTab, SettingDefinitionItem } from "obsidian";

export const PLUGIN_ID = "tag-scope";

export type TagSuggestionSortOrder = "name" | "counter";
export type OpenNoteDefaultBehaviour = "currentTab" | "newTab";

export interface TagScopeSettings {
	tagSuggestionSortOrder: TagSuggestionSortOrder;
	openNoteDefaultBehaviour: OpenNoteDefaultBehaviour;
	excludedTags: string;
	excludedNoteTags: string;
}

export const DEFAULT_SETTINGS: TagScopeSettings = {
	tagSuggestionSortOrder: "name",
	openNoteDefaultBehaviour: "currentTab",
	excludedTags: "",
	excludedNoteTags: "",
};

export function parseSettingsTags(value: string): string[] {
	return [
		...new Set(
			value
				.toLocaleLowerCase()
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
					placeholder: "work\nstatus/canceled",
				},
			},
			{
				name: "Exclude notes from search by tag",
				desc: "Enter one tag per line. Notes with these tags or their nested tags will not appear in search results.",
				control: {
					type: "textarea",
					key: "excludedNoteTags",
					rows: 5,
					placeholder: "private\ntype/deleted",
				},
			},
		];
	}
}