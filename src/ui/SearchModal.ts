import type { FilteredNote, Note, TagFilter } from "../types";
import { App, Modal, setIcon } from "obsidian";
import { getAllNotes, filterNotes } from "../search/noteSearch";
import { getTagSuggestions, isTagSelected } from "../search/tagSearch";
import { openNote, className } from "../utils";
import { TagSuggest } from "./TagSuggest";
import { createDebounce } from "../debounce";
import { SearchResultsView } from "./SearchResultsView";
import { SelectedTagsView } from "./SelectedTagsView";
import { parseSettingsTags, TagScopeSettings } from "../settings";

export class SearchModal extends Modal {
	private notes: Note[] = [];
	private filtered: FilteredNote[] = [];
	private selectedTags: TagFilter[] = [];
	private selectedIndex = 0;
	private enableMouseSelection = false;

	private readonly debouncedRefresh = createDebounce(
		() => this.refreshResults()
	);

	// HTML
	private closeBtnEl!: HTMLElement;
	private tagFieldEl!: HTMLElement;
	private tagInputEl!: HTMLInputElement;
	private fileInputEl!: HTMLInputElement;
	private noteCounterEl!: HTMLElement;
	private tagCounterEl!: HTMLElement;

	// Components
	private tagSuggest!: TagSuggest;
	private searchResultsView!: SearchResultsView;
	private selectedTagsView!: SelectedTagsView;

	constructor(
		app: App,
		private settings: TagScopeSettings
	) {
		super(app);
		this.createLayout();
		this.registerEvents();
		this.registerKeybindings();
	}

	private get currentNote(): Note | undefined {
		return this.filtered[this.selectedIndex];
	}

	private createLayout() {
		// General modal settings
		this.modalEl.empty();
		this.modalEl.removeClass("modal");
		this.modalEl.addClass("prompt");

		// File input
		const fileFieldEl = this.modalEl.createDiv("prompt-input-container");
		this.fileInputEl = fileFieldEl.createEl("input", {
			type: "text",
			cls: [
				className("file-input"),
				"prompt-input"
			],
			placeholder: "Find by filename or path...",
			attr: {
				autocapitalize: "off",
				spellcheck: false,
				enterkeyhint: "done"
			}
		});

		// Modal close button
		this.closeBtnEl = fileFieldEl.createDiv("search-input-clear-button");

		// Tag input
		this.tagFieldEl = this.modalEl.createDiv(className("tag-field"));
		this.selectedTagsView = new SelectedTagsView(
			this.tagFieldEl.createDiv(className("selected-tags")),
			{
				onInvert: (tag) => { this.invertTag(tag); },
				onRemove: (index) => { this.removeTag(index); },
			}
		);

		this.tagInputEl = this.tagFieldEl.createEl("input", {
			type: "text",
			cls: className("tag-input"),
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
			(query) => getTagSuggestions(
				this.filtered,
				this.selectedTags,
				query,
				this.settings.tagSuggestionSortOrder
			),
			(tag, exclude) => this.addTag(tag, exclude)
		);

		this.searchResultsView = new SearchResultsView(
			this.modalEl.createDiv("prompt-results"),
			{
				onRowMouseEnter: (index) => {
					if (this.enableMouseSelection) this.selectRow(index, false);
				},
				// Enable mouse selection on move
				onRowMouseMove: (index) => {
					if (!this.enableMouseSelection) {
						this.enableMouseSelection = true;
						this.selectRow(index, false);
					}
				},
				onOpenNote: (note, alternate) => {
					let newTab =
						this.settings.openNoteDefaultBehaviour === "newTab" ?
						true : false;
						
					this.openNote(note, alternate ? !newTab : newTab);
				},
				onTagAdd: (tag, exclude) => { this.addTag(tag, exclude); },
			}
		);

		// Instructions & Info
		const infoEl = this.modalEl.createDiv(className("info"));

		// Note counter
		let infoItemEl = infoEl.createDiv(className("info-item"));
		setIcon(infoItemEl, "files");
		this.noteCounterEl = infoItemEl.createSpan();

		// Tag counter
		infoItemEl = infoEl.createDiv(className("info-item"));
		setIcon(infoItemEl, "tags");
		this.tagCounterEl = infoItemEl.createSpan();
	}

	private registerEvents() {
		// Close on button
		this.closeBtnEl.addEventListener("click", () => { this.close(); });

		// Search on fileinput
		this.fileInputEl.addEventListener("input", () => {
			void this.debouncedRefresh.call();
		});

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
		this.tagFieldEl.addEventListener("click", (event) => {
			if (event.target !== this.tagInputEl) { this.tagInputEl.focus(); }
		});

		// Double `Backspace` on an empty tagInputEl removes
		// the last selected tag
		let lastEmptyBackspaceAt = 0;
		this.tagInputEl.addEventListener("keydown", (event) => {
			if (
				event.key !== "Backspace" ||
				this.tagInputEl.value !== ""
			) {
				lastEmptyBackspaceAt = 0;
				return;
			}

			const now = Date.now();
			const delay = 500;

			if (now - lastEmptyBackspaceAt <= delay) {
				event.preventDefault();
				lastEmptyBackspaceAt = 0;
				this.removeTag();
				return;
			}

			lastEmptyBackspaceAt = now;
		});
	}

	private registerKeybindings() {
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
			if (this.currentNote) {
				this.openNote(this.currentNote, false);
			}
			return false;
		});

		// Open (new tab)
		this.scope.register(["Mod"], "Enter", () => {
			if (this.currentNote) {
				this.openNote(this.currentNote, true);
			}
			return false;
		});
	}

	private invertTag(tag: TagFilter) {
		tag.exclude = !tag.exclude;
		this.updateTagsView();
		this.refreshResults();
	}

	private addTag(tag: string, exclude = false) {
		if (isTagSelected(tag, this.selectedTags)) return;
		
		this.selectedTags.push({
			name: tag,
			exclude
		});

		this.updateTagsView();
		this.refreshResults();
	}

	// Delete a tag from search by index.
	// If no index is specified, the last tag is removed
	private removeTag(index?: number) {
		if (this.selectedTags.length === 0) return;
		if (index == null) this.selectedTags.pop();
		else this.selectedTags.splice(index, 1);
		this.updateTagsView();
		this.refreshResults();
	}

	private updateTagsView() {
		this.tagSuggest.close();
		this.tagSuggest.setValue("");
		this.selectedTagsView.render(this.selectedTags);
		this.tagFieldEl.scrollTop = this.tagFieldEl.scrollHeight;
	}

	// Set highlight to selected row
	private selectRow(index: number, scroll = true) {
		const length = this.filtered.length;
		if (length === 0) return;
		this.selectedIndex = Math.max(0, Math.min(index, length - 1));
		this.searchResultsView.selectRow(this.selectedIndex, scroll);
	}
	
	// Move selection to delta rows
	private moveSelection(delta = 0): void {
		const length = this.filtered.length;
		if (!length) return;
		this.selectRow(
			(this.selectedIndex + delta + length) % length
		);
	}

    private openNote(note: Note, newTab: boolean = false) {
        void openNote(this.app, note.file, newTab);
        this.close();
    }

	private refreshResults() {
		this.selectedIndex = 0;
		this.enableMouseSelection = false;

        this.filtered = filterNotes(
			this.notes,
			this.selectedTags,
			this.fileInputEl.value
		);

		this.searchResultsView.render(this.filtered, this.selectedTags);
		this.updateCounters();
		this.moveSelection();
	}

	private updateCounters(): void {
		const availableTags = new Set(
			this.filtered.flatMap(note => 
				note.tags.filter(tag => !isTagSelected(tag, this.selectedTags))
			)
		);

		this.tagCounterEl.innerText = availableTags.size.toLocaleString();
		this.noteCounterEl.innerText = this.filtered.length.toLocaleString();
	}

	private reloadData() {
		this.notes = getAllNotes(
			this.app,
			parseSettingsTags(this.settings.excludedTags),
			parseSettingsTags(this.settings.excludedNoteTags)
		);
	}

	onOpen() {
		this.selectedTags = [];
		this.fileInputEl.value = "";
		this.reloadData();
		this.updateTagsView();
		this.refreshResults();
	}

    onClose() {
        this.debouncedRefresh.cancel();
  		this.tagSuggest.close();
    }
}
