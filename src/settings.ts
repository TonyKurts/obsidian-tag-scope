import type TagScopePlugin from "./main";
import { App, PluginSettingTab, SettingDefinitionItem } from "obsidian";

export const PLUGIN_ID = "tag-scope";

export type TagSuggestionSortOrder = "name" | "counter";

export interface TagScopeSettings {
	tagSuggestionSortOrder: TagSuggestionSortOrder;
}

export const DEFAULT_SETTINGS: TagScopeSettings = {
	tagSuggestionSortOrder: "name",
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
				name: "Tag suggestion sort order by",
				desc: "How tag suggestions are sorted in the input suggestion popup.",
				control: {
					type: "dropdown",
					key: "tagSuggestionSortOrder",
					defaultValue: "name",
					options: {
						name: "Name",
						counter: "Counter",
					},
				},
			},
		];
	}
}