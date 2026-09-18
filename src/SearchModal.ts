import { App, Modal, TFile } from "obsidian";
import { getAllNotes } from "./search";
import { openNote } from "./utils";
import type { Note } from "./types";

export class SearchModal extends Modal {
	private notes: Note[] = [];
	private filtered: Note[] = [];

	// HTML
	private resultsEl!: HTMLElement;

	constructor(
		app: App,
		private readonly prefix: (value: string) => string,
	) {
		super(app);

		this.setTitle("Search by tags");
		this.modalEl.addClass(this.prefix("modal"));

		// const tagFieldEl = this.contentEl.createDiv(this.prefix("field"));
		// tagFieldEl.createEl("label", {
		//     cls: this.prefix("label"),
		// 	text: "Tags",
		// 	attr: { for: this.prefix("tag-input") },
		// });

		// const tagControlEl = tagFieldEl.createDiv(this.prefix("tag-control"));
		// const tagChipsEl = tagControlEl.createSpan(this.prefix("tag-chips"));
		// const tagInputEl = tagControlEl.createEl("input", {
		// 	type: "text",
		// 	placeholder: "Add a tag...",
		// 	attr: {
		// 		id: this.prefix("tag-input"),
		// 	},
		// });

		// Results: filtered notes
		this.resultsEl = this.contentEl.createDiv(this.prefix("results"));
		this.refreshResults();
	}

	onOpen() {
		this.reloadData();
	}

    onClose() {
        // FIXME: Clean up
    }

    private openNote(file: TFile, newTab: boolean = false) {
        void openNote(this.app, file, newTab);
        this.close();
    }

	private reloadData() {
		this.notes = getAllNotes(this.app);
		this.refreshResults();
	}

	private refreshResults() {
		this.resultsEl.empty();

        // FIXME: No filtering of notes (filtered == notes)
        this.filtered = [...this.notes];
        this.filtered.forEach(note => {
            const rowEl = this.resultsEl.createDiv(this.prefix("result"));
            rowEl.addEventListener("click", () => {
                // FIXME: New tab or current tab depending on keybinds
                this.openNote(note.file);
            });
            
            const nameEl = rowEl.createDiv({
                cls: this.prefix("result-name"),
                text: note.file.basename
            });
        });

        this.resultsEl.scrollTop = 0;
	}
}
