import { App, TFile, Notice } from "obsidian";

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
