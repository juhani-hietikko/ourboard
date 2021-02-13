import { foldActions } from "./action-folding";
import { boardReducer } from "./board-reducer";
import { AppEvent, BoardHistoryEntry, BoardWithHistory, EventFromServer, isPersistableBoardItemEvent } from "./domain";

export function boardHistoryReducer(board: BoardWithHistory, appEvent: EventFromServer): [BoardWithHistory, AppEvent | null] {
  const [updatedBoard, undoAction] = boardReducer(board.board, appEvent)
  const history = updatedBoard !== board.board ? addToHistory(board.history, appEvent) : board.history
  const updatedBoardWithHistory = { board: updatedBoard, history }
  return [updatedBoardWithHistory, undoAction]
}

function addToHistory(history: BoardHistoryEntry[], appEvent: EventFromServer): BoardHistoryEntry[] {
  if (!isPersistableBoardItemEvent(appEvent)) return history
  if (history.length === 0) return [appEvent]
  const latest = history[history.length - 1]
  const folded = foldActions(latest, appEvent) as null | BoardHistoryEntry
  if (folded) {
    return [...history.slice(0, history.length - 1), folded]
  }
  return [...history, appEvent]
}