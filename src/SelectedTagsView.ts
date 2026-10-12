import { Menu } from "obsidian";
import { TagFilter } from "./types";
import { TagEl } from "./TagEl";

interface SelectedTagsActions {
	onRemove(index: number): void;
	onInvert(tag: TagFilter): void;
}

export class SelectedTagsView {
    constructor(
        private readonly container: HTMLElement,
        private readonly actions: SelectedTagsActions,
    ) {}
    
    render(tags: TagFilter[]) {
        this.container.empty();
        tags.forEach((tag, index) => {
            const tagEl = new TagEl(
				tag.name,
				"x",
				[
					"tag-scope-tag",
					tag.exclude ? "tag-scope-tag-exclude" : ""
				]
				
			);

            tagEl.el.addEventListener("click", event => {
				event.stopPropagation();
				if (event.ctrlKey) this.actions.onInvert(tag);
				else this.actions.onRemove(index);
			});

            // Show context menu on right click
			tagEl.el.addEventListener("contextmenu", event => {
				event.preventDefault();
				event.stopPropagation();

				new Menu()
					.addItem(item => {
						item
							.setTitle("Invert")
							.setIcon("arrow-left-right")
							.onClick(() => { this.actions.onInvert(tag); })
					})
					.addItem(item => {
						item
							.setTitle("Remove")
							.setIcon("x")
							.onClick(() => { this.actions.onRemove(index); })
					})
					.showAtMouseEvent(event);
			});

            this.container.appendChild(tagEl.el);
        });


    }
}