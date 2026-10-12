import { App, AbstractInputSuggest } from "obsidian";
import { TagSuggestion } from "./types";
import { highlightMatches, className } from "./utils";
import { createDebounce } from "./debounce";

export class TagSuggest extends AbstractInputSuggest<TagSuggestion> {
    private excludeMode = false;

    private suggestEl!: HTMLElement;
    private debouncedGetItems = createDebounce(
        (query: string): TagSuggestion[] => { return this.getItems(query); }
    );

    constructor(
        app: App,
        textInputEl: HTMLInputElement | HTMLDivElement,
        private readonly getItems: (query: string) => TagSuggestion[],
        private readonly onTagSelected: (tag: string, exclude: boolean) => void
    ) {
        super(app, textInputEl);

        this.onSelect((value, event) => {
            this.onTagSelected(value.name, this.excludeMode || event.ctrlKey);
        });

        // Ctrl + Enter = Add exclude tag
        this.scope.register(["Ctrl"], "Enter", () => {
            const selected = this.getSelected();
            if (!selected) return false;
            this.onTagSelected(selected, true);
            return false;
		});
    }

    private getSelected(): string | undefined {
        const selectedEl = this.suggestEl
            .querySelector(".suggestion-item.is-selected") as HTMLElement;
        return selectedEl?.dataset?.tagScopeSuggestionId;
    }

    protected async getSuggestions(query: string): Promise<TagSuggestion[]> {
        this.excludeMode = query.startsWith("!");
        query = this.excludeMode ? query.slice(1) : query;
        return await this.debouncedGetItems.call(query) || [];
    }

    renderSuggestion(value: TagSuggestion, el: HTMLElement): void {
        el.dataset.tagScopeSuggestionId = value.name;
        const wrapper = el.createDiv(className("suggestion"));
        const nameEl = wrapper.createSpan({ cls: className("suggestion-name") });
        
        // Highlight part of the name for ease of working with fuzzy search
        highlightMatches(nameEl, value.name, value.matches);

        // Frequency of occurrence of this tag among a sample of notes
        wrapper.createSpan({
            cls: className("suggestion-count"),
            text: value.count.toLocaleString()
        })
    }
}