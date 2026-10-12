import { Plugin } from "obsidian";
import { SearchModal } from "./ui/SearchModal";
import { DEFAULT_SETTINGS, TagScopeSettings, TagScopeSettingsTab } from "./settings";

export default class TagScopePlugin extends Plugin {
    settings: TagScopeSettings = { ...DEFAULT_SETTINGS };
    private searchModal: SearchModal | null = null;

    async onload() {
        await this.loadSettings();
        this.addSettingTab(new TagScopeSettingsTab(this.app, this));
        
        this.searchModal = new SearchModal(this.app, this.settings);

        this.addCommand({
            id: "open-search",
            name: "Open search",
            callback: () => { this.searchModal?.open(); }
        });

        this.addRibbonIcon(
            "squares-intersect",
            "Open search by tags",
            () => { this.searchModal?.open(); }
        );
    }

    onunload() {
        this.searchModal?.close();
        this.searchModal = null;
    }

    async loadSettings() {
        this.settings = Object.assign(
            {},
            DEFAULT_SETTINGS,
            await this.loadData() as TagScopeSettings ?? {},
        );
    }
    
    async saveSettings() {
        await this.saveData(this.settings);
    }
}