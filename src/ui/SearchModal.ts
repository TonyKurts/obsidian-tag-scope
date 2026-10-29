import type { FilteredNote, Note, Tag, TagFilter } from "../types";
import { App, Modal, setIcon, Editor, Platform } from "obsidian";
import { getAllNotes, filterNotes } from "../search/noteSearch";
import { getTagSuggestions, isTagIncluded } from "../search/tagSearch";
import { openNote, className, uniqueByKey, canRevealFileInNav, revealFileInNav } from "../utils";
import { TagSuggest } from "./TagSuggest";
import { createDebounce } from "../debounce";
import { SearchResultsView } from "./SearchResultsView";
import { SelectedTagsView } from "./SelectedTagsView";
import { parseSettingsTags, TagScopeSettings } from "../settings";

type SearchModalMode = 
	| { type: "search" }
	| { type: "insert-link"; editor: Editor; sourcePath: string };

export class SearchModal extends Modal {
	private notes: Note[] = [];
	private filtered: FilteredNote[] = [];
	private selectedTags: TagFilter[] = [];
	private selectedIndex = 0;
	private enableMouseSelection = false;
	private mode!: SearchModalMode;

	private readonly debouncedRefresh = createDebounce(
		() => this.refreshResults()
	);

	readonly debouncedRestore = createDebounce(
		() => this.restore()
	)

	// HTML
	private closeBtnEl!: HTMLElement;
	private tagFieldEl!: HTMLElement;
	private tagInputEl!: HTMLInputElement;
	private fileInputEl!: HTMLInputElement;
	private noteCounterEl!: HTMLSpanElement;
	private tagCounterEl!: HTMLSpanElement;
	private modeStatusEl!: HTMLSpanElement;

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

	private get selectedNote(): Note | undefined {
		return this.filtered[this.selectedIndex];
	}

	private createLayout() {
		// General modal settings
		this.modalEl.empty();
		this.modalEl.removeClass("modal");
		this.modalEl.addClass("prompt");
		this.modalEl.classList.toggle("is-mobile", Platform.isMobile);
		this.modalEl.classList.toggle("is-phone", Platform.isPhone);

		const fieldsEl = this.modalEl.createDiv(className("fields"));

		// File input
		const fileFieldEl = fieldsEl.createDiv({
			cls: [
				className("input-container"),
				className("file-field")
			]
		});
		this.fileInputEl = fileFieldEl.createEl("input", {
			type: "text",
			cls: [
				className("input"),
				className("file-input")
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
		this.tagFieldEl = fieldsEl.createDiv({
			cls: [
				className("input-container"),
				className("tag-field")
			]
		});

		this.selectedTagsView = new SelectedTagsView(
			this.tagFieldEl.createDiv(className("selected-tags")),
			{
				onInvert: (tag) => { this.invertTag(tag); },
				onRemove: (index) => { this.removeTag(index); },
			}
		);

		this.tagInputEl = this.tagFieldEl.createEl("input", {
			type: "text",
			cls: [
				className("input"),
				className("tag-input")
			],
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
				
				onNoteSelect: (note, alternate) => {
					this.selectNote(note, alternate);
				},

				canNoteAlternateSelect: () => this.mode.type === "search",

				onTagSelect: (tag, alternate) => {
					this.addTag(tag, alternate);
				},

				canRevealFileInNav: () => {
					return canRevealFileInNav(this.app);
				},

				onRevealFileInNav: (note) => {
					void revealFileInNav(this.app, note.file);
					this.close();
				},
			}
		);

		// Instructions & Info
		const infoEl = this.modalEl.createDiv(className("info"));
		const infoLeftEl = infoEl.createDiv(className("info-left"));
		const infoRightEl = infoEl.createDiv(className("info-right"));

		// Mode
		let infoItemEl = infoLeftEl.createDiv(className("info-item"));
		this.modeStatusEl = infoItemEl.createSpan();

		// Note counter
		infoItemEl = infoRightEl.createDiv(className("info-item"));
		setIcon(infoItemEl, "files");
		this.noteCounterEl = infoItemEl.createSpan();

		// Tag counter
		infoItemEl = infoRightEl.createDiv(className("info-item"));
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

		// Restore default mode on mode info click
		this.modeStatusEl.addEventListener("click", () => {
			this.setDefaultMode();
			this.updateModeStatus();
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
			if (this.selectedNote) {
				this.selectNote(this.selectedNote, false);
			}
			return false;
		});

		// Open (new tab)
		this.scope.register(["Mod"], "Enter", () => {
			if (this.selectedNote) {
				this.selectNote(this.selectedNote, true);
			}
			return false;
		});

		// Reveal file in navigation
		this.scope.register(["Alt"], "Enter", () => {
			if (canRevealFileInNav(this.app) && this.selectedNote?.file) {
				void revealFileInNav(this.app, this.selectedNote.file);
				this.close();
			}
			return false;
		});
	}

	private invertTag(tag: TagFilter) {
		tag.exclude = !tag.exclude;
		this.updateTagsView();
		this.refreshResults();
	}

	private addTag(tag: Tag, exclude = false) {
		if (isTagIncluded(tag, this.selectedTags)) return;
		
		this.selectedTags.push({
			...tag,
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

    private openNote(note: Note, alternate = false) {
		let newTabByDefault =
			this.settings.openNoteDefaultBehaviour === "newTab" ? true : false;

        void openNote(
			this.app,
			note.file,
			alternate ? !newTabByDefault : newTabByDefault
		);

        this.close();
    }

	private selectNote(note: Note, alternate = false) {
		if (this.mode.type === "insert-link") {
			this.insertLink(note);
			return;
		}

		this.openNote(note, alternate);		
	}

	private insertLink(note: Note) {
		if (this.mode.type !== "insert-link") return;

		const { editor, sourcePath } = this.mode;
		const selection = editor.getSelection().trim();
		const alias = selection ? selection : note.title;

		const link = this.app.fileManager.generateMarkdownLink(
			note.file,
			sourcePath,
			undefined,
			alias
		);

		editor.replaceSelection(link);
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

	private updateModeStatus() {
		this.modeStatusEl.innerText =
			this.mode.type === "insert-link" ? "Mode: Link insertion" : "";
	}

	private updateCounters() {
		const availableTags = uniqueByKey(
			this.filtered.flatMap(note => 
				note.tags.filter(tag => !isTagIncluded(tag, this.selectedTags))
			)
		);

		this.tagCounterEl.innerText = availableTags.length.toLocaleString();
		this.noteCounterEl.innerText = this.filtered.length.toLocaleString();
	}

	private reloadData() {
		this.notes = getAllNotes(
			this.app,
			this.settings.noteTitleProperty,
			parseSettingsTags(this.settings.excludedTags),
			parseSettingsTags(this.settings.excludedNoteTags)
		);
	}

	private restore() {
		this.selectedTags = [];
		this.fileInputEl.value = "";
		
		this.updateModeStatus();
		this.updateTagsView();
		this.reloadData();
		this.refreshResults();
	}

	private setDefaultMode() {
		this.mode = { type: "search" };
	}

	openSearch() {
		this.setDefaultMode();
		this.open();
	}

	openForLinkInsertion(editor: Editor, sourcePath: string) {
		this.mode = { type: "insert-link", editor, sourcePath };
		this.open();
	}

	onOpen() {
		this.restore();
	}

    onClose() {
        this.debouncedRefresh.cancel();
  		this.tagSuggest.close();
    }
}
