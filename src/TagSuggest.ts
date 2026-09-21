import { App, AbstractInputSuggest } from "obsidian";
import { TagSuggestion } from "./types";
import { highlightMatches } from "./utils";

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
        const nameEl = wrapper.createSpan({ cls: "tag-scope-suggestion-name" });
        
        // Highlight part of the name for ease of working with fuzzy search
        highlightMatches(nameEl, value.name, value.matches);

        // Frequency of occurrence of this tag among a sample of notes
        wrapper.createSpan({
            cls: "tag-scope-suggestion-count",
            text: value.count.toLocaleString()
        })
    }
}