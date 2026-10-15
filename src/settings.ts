import type TagScopePlugin from "./main";
import { App, PluginSettingTab, SettingDefinitionItem } from "obsidian";
import { makeTag, Tag } from "./types";

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

export function parseSettingsTags(value: string): Tag[] {
	return [
		...new Set(
			value
				.split(/\r?\n/)
				.map(tag => makeTag(tag))
		)
	].filter(tag => tag !== null);
}

export class TagScopeSettingsTab extends PluginSettingTab {
    plugin: TagScopePlugin;

    constructor(app: App, plugin: TagScopePlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }
	
	async setControlValue(key: string, value: unknown): Promise<void> {
		await super.setControlValue(key, value);
		if (
			key === "excludedTags" ||
			key === "excludedNoteTags"
		) {
			this.plugin.restoreSearchModal();
		}
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