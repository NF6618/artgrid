import { ArtGridNode } from './types';

export class HistoryManager {
  private undoStack: ArtGridNode[][] = [];
  private redoStack: ArtGridNode[][] = [];
  private maxHistory: number = 50;

  public pushState(nodes: ArtGridNode[]) {
    // Deep clone nodes to prevent mutations
    const snapshot = JSON.parse(JSON.stringify(nodes));
    this.undoStack.push(snapshot);
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }
    this.redoStack = []; // Clear redo stack on new action
  }

  public undo(currentNodes: ArtGridNode[]): ArtGridNode[] | null {
    if (this.undoStack.length === 0) return null;

    const previousSnapshot = this.undoStack.pop()!;
    this.redoStack.push(JSON.parse(JSON.stringify(currentNodes)));
    return previousSnapshot;
  }

  public redo(currentNodes: ArtGridNode[]): ArtGridNode[] | null {
    if (this.redoStack.length === 0) return null;

    const nextSnapshot = this.redoStack.pop()!;
    this.undoStack.push(JSON.parse(JSON.stringify(currentNodes)));
    return nextSnapshot;
  }

  public canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  public canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  public clear() {
    this.undoStack = [];
    this.redoStack = [];
  }
}
