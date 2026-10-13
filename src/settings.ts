import type TagScopePlugin from "./main";
import { App, PluginSettingTab, SettingDefinitionItem } from "obsidian";

export const PLUGIN_ID = "tag-scope";

export type TagSuggestionSortOrder = "name" | "counter";
export type OpenNoteDefaultBehaviour = "currentTab" | "newTab";

export interface TagScopeSettings {
	tagSuggestionSortOrder: TagSuggestionSortOrder;
	openNoteDefaultBehaviour: OpenNoteDefaultBehaviour;
}

export const DEFAULT_SETTINGS: TagScopeSettings = {
	tagSuggestionSortOrder: "name",
	openNoteDefaultBehaviour: "currentTab",
};

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
		];
	}
}