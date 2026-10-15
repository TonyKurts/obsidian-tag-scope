import type { FilteredNote, Note, Tag, TagFilter } from "../types";
import { Menu, setIcon } from "obsidian";
import { highlightMatches, getDirName, className } from "../utils";
import { isTagIncluded } from "../search/tagSearch";
import { TagPillComponent } from "./TagPillComponent";

interface SearchResultsActions {
    onRowMouseEnter(index: number): void;
    onRowMouseMove(index: number): void;
    onOpenNote(note: Note, alternate: boolean): void;
    onTagAdd(tag: Tag, exclude: boolean): void;
}

export class SearchResultsView {
    private rowEls: HTMLElement[] = [];

    constructor(
        private readonly container: HTMLElement,
        private readonly actions: SearchResultsActions
    ) {}

    selectRow(index: number, scroll = true) {
        // Highlight selected row and turn off the rest
        this.rowEls.forEach((rowEl, rowIndex) => {
            rowEl.classList.toggle("is-selected", rowIndex === index);
        });

        // Scroll container to selected row
		if (scroll) {
			this.rowEls[index]?.scrollIntoView({ block: "nearest" });
		}
    }

    render(notes: FilteredNote[], selectedTags: TagFilter[]) {
        this.rowEls = [];
        this.container.empty();

        // Not found label
        if (notes.length === 0) {
            this.container.createDiv({
                cls: "suggestion-empty",
                text: "No notes found.",
            });
        }

        // Filtered notes list
        notes.forEach((note, index) => {
            const rowEl = this.container.createDiv({
                cls: [className("result"), "suggestion-item", "mod-complex"],
            });
            this.rowEls.push(rowEl);

            // On mouse move
            rowEl.addEventListener("mousemove", () => {
                this.actions.onRowMouseMove(index);
            });

            // On mouse enter
            rowEl.addEventListener("mouseenter", () => {
                this.actions.onRowMouseEnter(index);
            });

            // On mouse click (current tab/new tab)
            rowEl.addEventListener("click", event => {
                this.actions.onOpenNote(
                    note,
                    event.ctrlKey || event.metaKey
                );
            });


            const wrapperEl = rowEl.createDiv(className("result-wrapper"));
            const contentEl = wrapperEl.createDiv("suggestion-content");

            // Note name
            const nameEl = contentEl.createDiv(className("result-name"));
            highlightMatches(nameEl, note.name, note.matches.name);

            // Note path
            //
            // FIXME: It is relevant for the user to see only the path
            // 		  without the file name, for accuracy, but only if
            // 		  file name = file name, and the use frontmatter
            //        as file header setting is not used
            let path = note.file.path;
            if (!note.aliasUsed) path = getDirName(note.file.path);
            const pathEl = contentEl.createDiv(className("result-path"));
            highlightMatches(pathEl, path, note.matches.path);

            // Suggestion AUX for cases
            // when alias is used instead of a file name
            if (note.aliasUsed) {
                const suggestionAuxEl = wrapperEl.createDiv("suggestion-aux");
                const aliasFlairEl = suggestionAuxEl.createSpan({
                    cls: "suggestion-flair",
                    attr: { "aria-label": "Alias" },
                });
            
                setIcon(aliasFlairEl, "forward");
            }

            // Note tags
            //
            // Display only those tags
            // that have not yet beenselected in the search
            const tagsEl = rowEl.createDiv(className("result-tags"));
            note.tags
                .filter(noteTag => !isTagIncluded(noteTag, selectedTags))
                .forEach(noteTag => {
                    const tagPillComponent = new TagPillComponent(noteTag, "plus", className("tag"));

                    // On click (include/exclude)
                    tagPillComponent.el.addEventListener("click", event => {
                        event.stopPropagation();
                        this.actions.onTagAdd(noteTag, event.ctrlKey || event.metaKey);
                    });

                    // Context menu on right click
                    tagPillComponent.el.addEventListener("contextmenu", event => {
                        event.preventDefault();
                        event.stopPropagation();

                        new Menu()
                            .addItem(item => {
                                item.setTitle("Include")
                                    .setIcon("squares-intersect")
                                    .onClick(() => {
                                        this.actions.onTagAdd(noteTag, false);
                                    });
                            })
                            .addItem(item => {
                                item.setTitle("Exclude")
                                    .setIcon("squares-exclude")
                                    .onClick(() => {
                                        this.actions.onTagAdd(noteTag, true);
                                    });
                            })
                            .showAtMouseEvent(event);
                    });

                    // If among the selected tags there is a more general tag than the one
                    // that appears in the note, then the tag in the note receives
                    // additional highlighting to indicate a potential refinement
                    selectedTags.forEach(tag => {
                        tagPillComponent.highlightName(tag.key);
                    });
                    
                    tagsEl.appendChild(tagPillComponent.el);
                });
        });
    }
}
