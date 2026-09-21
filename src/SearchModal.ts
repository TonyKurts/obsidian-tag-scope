import { App, Modal } from "obsidian";
import { getAllNotes } from "./search";
import { openNote, getDirName, createTagEl } from "./utils";
import type { Note } from "./types";

export class SearchModal extends Modal {
	private notes: Note[] = [];
	private filtered: Note[] = [];
	private selectedTags: string[] = [];
	private selectedIndex: number = 0;

	private enableMouseSelection: boolean = false; 

	// HTML
	private selectedTagsEl!: HTMLElement;
	private resultsEl!: HTMLElement;

	constructor(
		app: App,
		private readonly prefix: (value: string) => string,
	) {
		super(app);
		
		// General modal settings
		this.modalEl.empty();
		this.modalEl.removeClass("modal");
		this.modalEl.addClass("prompt");

		// Tag input
		const tagFieldEl = this.modalEl.createDiv(this.prefix("tag-field"));
		
		this.selectedTagsEl = tagFieldEl.createDiv(this.prefix("selected-tags"));

		const tagInputEl = tagFieldEl.createEl("input", {
			type: "text",
			cls: this.prefix("tag-input"),
			placeholder: "Narrow by tags...",
			attr: {
				autocapitalize: "off",
				spellcheck: false,
				enterkeyhint: "done"
			}
		});

		// File input
		const fileFieldEl = this.modalEl.createDiv("prompt-input-container");
		const fileInputEl = fileFieldEl.createEl("input", {
			type: "text",
			cls: [
				this.prefix("file-input"),
				"prompt-input"
			],
			placeholder: "Find by filename or path...",
			attr: {
				autocapitalize: "off",
				spellcheck: false,
				enterkeyhint: "done"
			}
		});

		// Results: filtered notes
		this.resultsEl = this.modalEl.createDiv("prompt-results");

		// 
		// Keybindings & Events
		//

		// Cycle input fields focus
		const inputEls = [tagInputEl, fileInputEl];
		inputEls.forEach((inputEl, index) => {
			inputEl.addEventListener("keydown", (event) => {
				if (event.key != "Tab") return;
				event.preventDefault();

				const nextIndex = (index + 1) % inputEls.length;
				inputEls[nextIndex]?.focus();
			});
		});

		// Focus on tagInputEl when click on tagFieldEl
		tagFieldEl.addEventListener("click", (event) => {
			if (event.target !== tagInputEl) {
				tagInputEl.focus();
			}
		});

		// Move down
		this.scope.register([], "ArrowDown", () => {
			this.enableMouseSelection = false;
			this.moveSelection(1);
			return false;
		});
		
		// Move up
		this.scope.register([], "ArrowUp", () => {
			this.enableMouseSelection = false;
			this.moveSelection(-1);
			return false;
		});
		
		// Open (current tab)
		this.scope.register([], "Enter", () => {
			this.openNote(this.currentNote, false);
			return false;
		});

		// Open (new tab)
		this.scope.register(["Ctrl"], "Enter", () => {
			this.openNote(this.currentNote, true);
			return false;
		});

		// Open (new tab) / macOS
		this.scope.register(["Meta"], "Enter", () => {
			this.openNote(this.currentNote, true);
			return false;
		});
	}

	private get rows(): Element[] {
		return Array.from(this.resultsEl.children);
	}

	private get currentNote(): Note {
		return this.filtered[this.selectedIndex]!;
	}

	private selectTag(tag: string): void {
		this.selectedTags.push(tag);
		this.selectedTagsEl.appendChild(
			createTagEl(tag, "x", this.prefix("tag"))
		);
		// FIXME: Apply filter
	}

	// Set highlight to selected row
	private selectRow(index: number, scroll = true): void {
		const rows = this.rows;
		if (rows.length === 0) return;
		
		// Set correct index
		this.selectedIndex = Math.max(0, Math.min(index, rows.length - 1));
		
		// Highlight selected row and turn off the rest
		rows.forEach((row, index) => {
			row.classList.toggle(
				"is-selected",
				index === this.selectedIndex
			);
		});

		// Scroll container to selected row
		if (scroll) {
			rows[this.selectedIndex]?.scrollIntoView({
				block: "nearest",
			});
		}
	}
	
	// Move selection to delta rows
	private moveSelection(delta = 0): void {
		const rows = this.rows;
		if (rows.length === 0) return;
		this.selectRow(
			(this.selectedIndex + delta + rows.length) % rows.length
		);
	}

	onOpen() {
		// Remove previous tags
		this.selectedTags = [];
		this.selectedTagsEl.empty();

		this.reloadData();
	}

    onClose() {
        // FIXME: Clean up
    }

    private openNote(note: Note, newTab: boolean = false) {
        void openNote(this.app, note.file, newTab);
        this.close();
    }

	private refreshResults() {
		this.resultsEl.empty();
		this.selectedIndex = 0;

        // FIXME: No filtering of notes (filtered == notes)
        this.filtered = [...this.notes];
        this.filtered.forEach((note, index) => {
            const rowEl = this.resultsEl.createDiv({
				cls: [
					this.prefix("result"),
					"suggestion-item",
					"mod-complex"
				]
			});

			// Move (mouse)
			rowEl.addEventListener("mouseenter", () => {
				if (!this.enableMouseSelection) return;
				this.selectRow(index, false);
			});

			// Enable mouse selection on move
			rowEl.addEventListener("mousemove", () => {
				if (this.enableMouseSelection) return;
				this.enableMouseSelection = true;
				this.selectRow(index, false);
			});

			// Open (mouse)
			rowEl.addEventListener("click", (event) => {
				const openInNewTab = event.ctrlKey || event.metaKey;
				this.openNote(note, openInNewTab);
			});

			// Note name
            rowEl.createDiv({ text: note.file.basename });

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
					tagEl.addEventListener("click", (event) => {
						event.stopPropagation();
						this.selectTag(tag);
					});
					tagsEl.appendChild(tagEl);
				});
        });

		this.moveSelection();
	}

	private reloadData() {
		this.notes = getAllNotes(this.app);
		this.refreshResults();
	}
}
