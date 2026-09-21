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
        const nameEl = wrapper.createSpan({
            cls: "tag-scope-suggestion-name"
        })
        
        let cursor = 0;
        for (const [from, to] of value.matches) {
            if (from < cursor) continue;
            
            if (from > cursor) {
                nameEl.append(
                    document.createTextNode(
                        value.name.slice(cursor, from),
                    ),
                );
            }
  
            const strongEl = createEl("strong");
            strongEl.textContent = value.name.slice(from, to);
            nameEl.append(strongEl);
            cursor = to;
        }

        if (cursor < value.name.length) {
            nameEl.append(
                document.createTextNode(
                    value.name.slice(cursor),
                ),
            );
        }

        wrapper.createSpan({
            cls: "tag-scope-suggestion-count",
            text: value.count.toLocaleString()
        })
    }
}