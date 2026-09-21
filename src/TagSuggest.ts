import { App, AbstractInputSuggest } from "obsidian";
import { TagSuggestion } from "./types";

export class TagSuggest extends AbstractInputSuggest<TagSuggestion> {
    constructor(
        app: App,
        textInputEl: HTMLInputElement | HTMLDivElement,
        private readonly getItems: (query: string) => TagSuggestion[],
        private readonly onTagSelected: (tag: string) => void
    ) {
        super(app, textInputEl);
        this.onSelect((value) => {
            this.onTagSelected(value.name);
        });
    }

    protected getSuggestions(query: string): TagSuggestion[] {
        return this.getItems(query);
    }

    renderSuggestion(value: TagSuggestion, el: HTMLElement): void {
        const wrapper = el.createDiv("tag-scope-suggestion");
        
        wrapper.createSpan({
            cls: "tag-scope-suggestion-name",
            text: value.name
        });

        wrapper.createSpan({
            cls: "tag-scope-suggestion-count",
            text: value.count.toLocaleString()
        })
    }
}