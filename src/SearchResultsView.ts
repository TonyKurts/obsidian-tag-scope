import type { FilteredNote, Note, TagFilter } from "./types";
import { Menu } from "obsidian";
import { highlightMatches, getDirName, isTagSelected, className } from "./utils";
import { TagPillComponent } from "./TagPillComponent";

interface SearchResultsActions {
    onRowMouseEnter(index: number): void;
    onRowMouseMove(index: number): void;
    onOpenNote(note: Note, newTab: boolean): void;
    onTagAdd(tag: string, exclude: boolean): void;
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

            // Note name
            const nameEl = rowEl.createDiv(className("result-name"));
            highlightMatches(nameEl, note.file.basename, note.nameMatches);

            // Note path
            //
            // FIXME: It is relevant for the user to see only the path
            // 		  without the file name, for accuracy, but only if
            // 		  file name = file name, and the use frontmatter
            //        as file header setting is not used
            const path = getDirName(note.file.path);
            const pathEl = rowEl.createDiv(className("result-path"));
            highlightMatches(pathEl, path, note.pathMatches);

            // Note tags
            //
            // Display only those tags
            // that have not yet beenselected in the search
            const tagsEl = rowEl.createDiv(className("result-tags"));
            note.tags
                .filter(noteTag => !isTagSelected(noteTag, selectedTags))
                .forEach(noteTag => {
                    const tagPillComponent = new TagPillComponent(noteTag, "plus", className("tag"));

                    // On click (include/exclude)
                    tagPillComponent.el.addEventListener("click", event => {
                        event.stopPropagation();
                        this.actions.onTagAdd(noteTag, event.ctrlKey);
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
                        tagPillComponent.highlightName(tag.name);
                    });
                    
                    tagsEl.appendChild(tagPillComponent.el);
                });
        });
    }
}
