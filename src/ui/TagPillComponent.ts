import { setIcon } from "obsidian";
import { getClasses, highlightMatches } from "../utils";
import { Tag } from "../types";

export class TagPillComponent {   
    readonly el: HTMLElement;
    readonly nameEl: HTMLSpanElement;
    
    constructor(
        readonly tag: Tag,
        icon: string,
        classes?: string | string[]
    ) {
        // Container
        this.el = createDiv({
            cls: [
                ...getClasses(classes),
                "multi-select-pill",
            ]
        });

        // Name
        this.nameEl = this.el
            .createDiv("multi-select-pill-content")
            .createSpan({ text: tag.display });

        // Icon
        setIcon(
            this.el.createDiv("multi-select-pill-remove-button"),
            icon
        );
    }

    highlightName(part: string) {
        if (!this.tag.key.startsWith(part)) return;
        this.nameEl.empty();
        highlightMatches(this.nameEl, this.tag.display, [[0, part.length]]);
    }
}