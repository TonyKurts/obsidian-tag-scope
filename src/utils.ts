import { App, TFile, Notice } from "obsidian";

export async function openNote(
    app: App,
    file: TFile,
    newTab: boolean
): Promise<void> {
    try {
        const leaf = app.workspace.getLeaf(newTab);
        await leaf.openFile(file);
    } catch (e) {
        new Notice(`Could not open the note "${file.basename}"`);
  		console.error("Failed to open note:", e);
    }
}