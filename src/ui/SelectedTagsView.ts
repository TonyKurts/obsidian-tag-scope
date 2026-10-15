import { Menu } from "obsidian";
import { TagFilter } from "../types";
import { className } from "../utils";
import { TagPillComponent } from "./TagPillComponent";

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
            const tagPillComponent = new TagPillComponent(
				tag,
				"x",
				[
					className("tag"),
					tag.exclude ? className("tag-exclude") : ""
				]
				
			);

            tagPillComponent.el.addEventListener("click", event => {
				event.stopPropagation();
				if (event.ctrlKey || event.metaKey) this.actions.onInvert(tag);
				else this.actions.onRemove(index);
			});

            // Show context menu on right click
			tagPillComponent.el.addEventListener("contextmenu", event => {
				event.preventDefault();
				event.stopPropagation();

				new Menu()
					.addItem(item => {
						item
							.setTitle("Invert")
							.setIcon("arrow-left-right")
							.onClick(() => { this.actions.onInvert(tag); })
					})
					.showAtMouseEvent(event);
			});

            this.container.appendChild(tagPillComponent.el);
        });


    }
}