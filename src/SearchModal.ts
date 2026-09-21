import { App, Modal, setIcon } from "obsidian";
import { getAllNotes, filterNotes, getTagSuggestions } from "./search";
import { openNote, getDirName, createTagEl } from "./utils";
import { TagSuggest } from "./TagSuggest";
import type { Note } from "./types";

export class SearchModal extends Modal {
	private notes: Note[] = [];
	private filtered: Note[] = [];
	private availableTags: Set<string> = new Set();
	private selectedTags: string[] = [];
	private selectedIndex: number = 0;

	private enableMouseSelection: boolean = false; 

	// HTML
	private tagInputEl!: HTMLInputElement;
	private fileInputEl!: HTMLInputElement;
	private selectedTagsEl!: HTMLElement;
	private resultsEl!: HTMLElement;
	private noteCounterEl!: HTMLElement;
	private tagCounterEl!: HTMLElement;

	// Components
	private tagSuggest!: TagSuggest;

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
		
		this.tagInputEl = tagFieldEl.createEl("input", {
			type: "text",
			cls: this.prefix("tag-input"),
			placeholder: "Narrow by tags...",
			attr: {
				autocapitalize: "off",
				spellcheck: false,
				enterkeyhint: "done"
			}
		});

		this.tagSuggest = new TagSuggest(
			this.app,
			this.tagInputEl,
			(query) =>
				getTagSuggestions(
					this.filtered,
					this.selectedTags,
					query
				),
			(tag) => this.addTag(tag)
		);

		// File input
		const fileFieldEl = this.modalEl.createDiv("prompt-input-container");
		this.fileInputEl = fileFieldEl.createEl("input", {
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

		// Instructions & Info
		const infoEl = this.modalEl.createDiv(this.prefix("info"));

		// Tag counter
		let infoItemEl = infoEl.createDiv(this.prefix("info-item"));
		setIcon(infoItemEl, "tags");
		this.tagCounterEl = infoItemEl.createSpan();

		// Note counter
		infoItemEl = infoEl.createDiv(this.prefix("info-item"));
		setIcon(infoItemEl, "files");
		this.noteCounterEl = infoItemEl.createSpan();

		// 
		// Keybindings & Events
		//

		// Cycle input fields focus
		const inputEls = [this.tagInputEl, this.fileInputEl];
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
			if (event.target !== this.tagInputEl) {
				this.tagInputEl.focus();
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

	private addTag(tag: string): void {
		if (this.selectedTags.includes(tag)) return;
		
		this.selectedTags.push(tag);
		this.tagSuggest.close();

		this.renderSelectedTags();
		this.refreshResults();
	}

	// Delete a tag from search by index.
	// If no index is specified, the last tag is removed
	private removeTag(index?: number) {
		if (this.selectedTags.length === 0) return;
		
		if (index == null) this.selectedTags.pop();
		else this.selectedTags.splice(index, 1);

		this.renderSelectedTags();
		this.refreshResults();
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
		// Remove previous selected tags
		this.selectedTags = [];
		this.renderSelectedTags();

		this.reloadData();

		window.requestAnimationFrame(() => {
			this.fileInputEl.focus();
		});
	}

    onClose() {
        // FIXME: Clean up
    }

    private openNote(note: Note, newTab: boolean = false) {
        void openNote(this.app, note.file, newTab);
        this.close();
    }

	private renderSelectedTags(): void {
		this.selectedTagsEl.empty();
		this.selectedTags.forEach((tag, index) => {
			const tagEl = createTagEl(tag, "x", this.prefix("tag"));
			
			tagEl.addEventListener("click", (event) => {
				// FIXME: Add logic to turn the added tag
				// 		  into the opposite NOT rule
				event.stopPropagation();
				this.removeTag(index);
			});

			this.selectedTagsEl.appendChild(tagEl);
		});
	}

	private refreshResults() {
		this.resultsEl.empty();
		this.selectedIndex = 0;
		this.tagSuggest.setValue("");
		this.availableTags.clear();

        this.filtered = filterNotes(
			this.notes,
			this.selectedTags
		);

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
            rowEl.createDiv({
				cls: this.prefix("result-name"),
				text: note.file.basename
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
			const tagsEl = rowEl.createDiv(this.prefix("result-tags"));
			
			note.tags
				.filter(tag => !this.selectedTags.includes(tag))
				.forEach(tag => {
					this.availableTags.add(tag);
					const tagEl = createTagEl(tag, "plus", this.prefix("tag"));
					tagEl.addEventListener("click", (event) => {
						event.stopPropagation();
						this.addTag(tag);
					});
					tagsEl.appendChild(tagEl);
				});
        });

		this.updateCounters();
		this.moveSelection();
	}

	private updateCounters(): void {
		this.noteCounterEl.innerText = this.filtered.length.toLocaleString();
		this.tagCounterEl.innerText = this.availableTags.size.toLocaleString();
	}

	private reloadData() {
		this.notes = getAllNotes(this.app);
		this.refreshResults();
	}
}
