import { App, Modal, TFile } from "obsidian";
import { getAllNotes } from "./search";
import { openNote, getDirName, createTagEl } from "./utils";
import type { Note } from "./types";

export class SearchModal extends Modal {
	private notes: Note[] = [];
	private filtered: Note[] = [];
	private selectedTags: string[] = [];

	// HTML
	private resultsEl!: HTMLElement;
	private notesCountEl!: HTMLElement;

	constructor(
		app: App,
		private readonly prefix: (value: string) => string,
	) {
		super(app);
		
		// General modal settings
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

		// Filename input
		const fileFieldEl = this.contentEl.createDiv(this.prefix("field"));
		fileFieldEl.createEl("label", { 
			cls: this.prefix("label"),
			text: "File",
			attr: { for: this.prefix("file-input") } 
		});
		fileFieldEl.createEl("input", {
			type: "text",
			placeholder: "Search by name or path...",
			attr: {
				id: this.prefix("file-input")
			}
		});

		// Notes count
		this.notesCountEl = this.contentEl.createDiv(this.prefix("notes-count"));

		// Results: filtered notes
		this.resultsEl = this.contentEl.createDiv({
			cls: [this.prefix("results"), "prompt-results"]
		});
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
            const rowEl = this.resultsEl.createDiv({
				cls: [
					this.prefix("result"),
					"suggestion-item",
					"mod-complex"
				]
			});
			// FIXME: Now clicking on an entire line opens a note.
			// 		  Need to check how this will work if
			// 		  the click occurs on the tag chip within the row
            rowEl.addEventListener("click", () => {
                // FIXME: New tab or current tab depending on keybinds
                this.openNote(note.file);
            });
			
			// Note name
            rowEl.createDiv({
                cls: this.prefix("result-name"),
                text: note.file.basename,
            });

			// Note path
			// 
			// FIXME: It is relevant for the user to see only the path
			// 		  without the file name, for accuracy, but only if
			// 		  file name = file name, and the use frontmatter
			//        as file header setting is not used
			rowEl.createDiv({
				cls: this.prefix("result-path"),
				text: getDirName(note.file.path),
			});

			// Note tags. Display only those tags that have not yet been
			// selected in the search
			// 
			// FIXME: Apply tag sorting rule
			const tagsEl = rowEl.createDiv(this.prefix("result-tags"));
			
			note.tags
				.filter(tag => !this.selectedTags.includes(tag))
				.sort()
				.forEach(tag => {
					const tagEl = createTagEl(tag, "plus", this.prefix("tag"));
					tagEl.addEventListener("click", (e) => {
						e.stopPropagation();
						// FIXME: Add tag adding event to search on click
					});
					tagsEl.appendChild(tagEl);
				});
        });

        this.resultsEl.scrollTop = 0;
	}
}
