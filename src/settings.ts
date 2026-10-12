import { App, PluginSettingTab, SettingDefinitionItem } from "obsidian";
import TagScopePlugin from "./main";

export const PLUGIN_ID = "tag-scope";

export interface TagScopeSettings {
	tagGlobalSortOrder: "asc" | "desc";
}

export const DEFAULT_SETTINGS: TagScopeSettings = {
	tagGlobalSortOrder: "asc",
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
				name: "Global tag sorting",
				desc: "Choose the order used for tags in search suggestions and results.",
				control: {
					type: "dropdown",
					key: "tagGlobalSortOrder",
					defaultValue: "asc",
					options: {
						asc: "A-Z",
						desc: "Z-A",
					},
				},
			},
		];
	}
}