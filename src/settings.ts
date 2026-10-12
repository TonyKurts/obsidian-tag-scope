import { App, PluginSettingTab, SettingDefinitionItem } from "obsidian";
import TagScopePlugin from "./main";

export const PLUGIN_ID = "tag-scope";

export type TagSuggestionSortOrder = "alphabetical" | "popularity";

export interface TagScopeSettings {
	tagSuggestionSortOrder: TagSuggestionSortOrder;
}

export const DEFAULT_SETTINGS: TagScopeSettings = {
	tagSuggestionSortOrder: "alphabetical",
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
					defaultValue: "alphabetical",
					options: {
						alphabetical: "Alphabetical",
						popularity: "Popularity",
					},
				},
			},
		];
	}
}