import { App, TFile, Notice, setIcon } from "obsidian";

export async function openNote(
    app: App,
    file: TFile,
    newTab: boolean,
): Promise<void> {
    try {
        const leaf = app.workspace.getLeaf(newTab);
        await leaf.openFile(file);
    } catch (e) {
        new Notice(`Could not open the note "${file.basename}"`);
        console.error("Failed to open note:", e);
    }
}

export function getDirName(path: string): string {
    const lastSlashIndex = Math.max(
        path.lastIndexOf("/"),
        path.lastIndexOf("\\"),
    );

    return lastSlashIndex !== -1 ? path.substring(0, lastSlashIndex + 1) : "";
}

function getClasses(classes?: string | string[]): string[] {
    if (!classes) return [];
    return Array.isArray(classes) ?
        classes :
        classes.split(" ");
}

export function createTagEl(
    text: string,
    icon: string,
    classes?: string | string[],
): HTMLElement {
    // Container
    const el = createDiv({
        cls: [
            ...getClasses(classes),
            "multi-select-pill",
        ]
    });

    // Name
    el.createDiv("multi-select-pill-content")
        .createSpan({ text });

    // Icon
    setIcon(
        el.createDiv("multi-select-pill-remove-button"),
        icon
    );
    
    return el;
}