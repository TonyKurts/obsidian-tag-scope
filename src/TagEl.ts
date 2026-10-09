import { setIcon, prepareSimpleSearch } from "obsidian";
import { getClasses, highlightMatches } from "./utils";

export class TagEl {   
    readonly name: string;
    readonly el: HTMLElement;
    readonly nameEl: HTMLSpanElement;
    
    constructor(
        name: string,
        icon: string,
        classes?: string | string[]
    ) {
        this.name = name;

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
            .createSpan({ text: name });

        // Icon
        setIcon(
            this.el.createDiv("multi-select-pill-remove-button"),
            icon
        );
    }

    highlightMatch(query: string): void {
        const search = prepareSimpleSearch(query);
        const result = search(this.name);
        
        if (result) {
            this.nameEl.empty();
            highlightMatches(
                this.nameEl,
                this.name,
                result.matches
            );
        }
    }
}