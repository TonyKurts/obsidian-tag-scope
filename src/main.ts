import { Plugin } from "obsidian";
import { SearchModal } from "./SearchModal";

export default class TagScopePlugin extends Plugin {
    private searchModal: SearchModal | null = null;

    onload() {
        this.searchModal = new SearchModal(this.app);

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
}