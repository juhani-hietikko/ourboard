import * as uuid from "uuid";

export type Id = string
export type ISOTimeStamp = string

export type BoardInfo = {
    id: Id,
    name: string,
}

export type Board = BoardInfo & {
    width: number;
    height: number;
    items: Item[]
}

export type BoardStub = Pick<Board, "id" | "name">

export function isFullyFormedBoard(b: Board | BoardStub): b is Board {
    return !!b.id && !!b.name && ["width", "height", "items"].every(prop => prop in b)
}

export const defaultBoardSize = { width: 100, height: 80 }

export interface CursorPosition {
    x: number;
    y: number;
}

export type UserCursorPosition = CursorPosition & {
    userId: Id,
}

export type BoardCursorPositions = Record<Id, UserCursorPosition>;

export type Color = string;

export type ItemBounds = { x: number; y: number, width: number, height: number }

export const ITEM_TYPES = {
    NOTE: "note",
    TEXT: "text",
    IMAGE: "image",
    CONTAINER: "container"
} as const
export type ItemType = typeof ITEM_TYPES[keyof typeof ITEM_TYPES]

export type Note = { id: string; type: typeof ITEM_TYPES.NOTE; text: string; color: Color, containerId?: string } & ItemBounds;
export type Text = { id: string; type: typeof ITEM_TYPES.TEXT; text: string, containerId?: string } & ItemBounds;
export type Image = { id: string; type: typeof ITEM_TYPES.IMAGE; assetId: string; src?: string, containerId?: string } & ItemBounds;
export type Container = { id: string; type: typeof ITEM_TYPES.CONTAINER; text: string; } & ItemBounds;
export type Containee = Note | Text | Image

export type TextItem = Note | Text | Container
export type Item = TextItem | Image
export type ItemLocks = Record<Id, Id> 

export type AppEvent = BoardItemEvent | AddBoard | JoinBoard | AckJoinBoard | JoinedBoard | InitBoard | CursorMove | SetNickname | CursorPositions | AssetPutUrlRequest | AssetPutUrlResponse | GotBoardLocks | Undo | Redo;
export type PersistableBoardItemEvent = AddItem | UpdateItem | MoveItem | DeleteItem | BringItemToFront
export type BoardItemEvent = PersistableBoardItemEvent | LockItem | UnlockItem
export type AddItem = { action: "item.add", boardId: Id, items: Item[] };
export type UpdateItem = { action: "item.update", boardId: Id, items: Item[] };
export type MoveItem = { action: "item.move", boardId: Id, items: {id: Id, x: number, y: number}[] };
export type BringItemToFront = { action: "item.front", boardId: Id, itemIds: Id[] };
export type DeleteItem = { action: "item.delete", boardId: Id, itemIds: Id[] };
export type LockItem = { action: "item.lock", boardId: Id, itemId: Id }
export type UnlockItem = { action: "item.unlock", boardId: Id, itemId: Id }
export type GotBoardLocks = { action: "board.locks", boardId: Id, locks: ItemLocks }
export type AddBoard = { action: "board.add", payload: Board | BoardStub }
export type JoinBoard = { action: "board.join", boardId: Id }
export type AckJoinBoard = { action: "board.join.ack", boardId: Id } & UserSessionInfo
export type JoinedBoard = { action: "board.joined", boardId: Id } & UserSessionInfo
export type InitBoard = { action: "board.init", board: Board }
export type CursorMove = { action: "cursor.move", position: CursorPosition, boardId: Id }
export type SetNickname = { action: "nickname.set", nickname: string, userId: string }
export type AssetPutUrlRequest = { "action": "asset.put.request", assetId: string }
export type AssetPutUrlResponse = { "action": "asset.put.response", assetId: string, signedUrl: string }
export type Undo = { action: "undo" }
export type Redo = { action: "redo" }

export type UserSessionInfo = { userId: string, nickname: string }

export const CURSOR_POSITIONS_ACTION_TYPE = "c" as const;
export type CursorPositions = { action: typeof CURSOR_POSITIONS_ACTION_TYPE, p: Record<Id, UserCursorPosition> }


export const exampleBoard: Board = {
    id: "default",
    name: "Test Board",
    items: [
        newNote("Hello", "pink", 10, 5),
        newNote("World", "cyan", 20, 10),
        newNote("Welcome", "cyan", 5, 14)
    ],
    ...defaultBoardSize
}

export function createBoard(name: string): Board {
    const id = uuid.v4()
    return { id: uuid.v4(), name, items: [], ...defaultBoardSize } 
}

export function newNote(text: string, color: Color = "yellow", x: number = 20, y: number = 20, width: number = 5, height: number = 5): Note {
    return { id: uuid.v4(), type: "note", text, color, x, y, width, height }    
}

export function newText(text: string, x: number = 20, y: number = 20, width: number = 5, height: number = 2): Text {
    return { id: uuid.v4(), type: "text", text, x, y, width, height }    
}

export function newContainer(x: number = 20, y: number = 20, width: number = 30, height: number = 20): Container {
    return { id: uuid.v4(), type: "container", text: "Unnamed area", x, y, width, height }    
}

export function newImage(assetId: string, x: number = 20, y: number = 20, width: number = 5, height: number = 5): Image {
    return { id: uuid.v4(), type: "image", assetId, x, y, width, height }
}

export function getCurrentTime(): ISOTimeStamp {
    return new Date().toISOString()
}

export const isBoardItemEvent = (a: AppEvent): a is BoardItemEvent => a.action.startsWith("item.")

export const isPersistableBoardItemEvent = (bie: BoardItemEvent): bie is PersistableBoardItemEvent => !["item.lock", "item.unlock"].includes(bie.action)

export function migrateBoard(board: Board) {
    const items: Item[] = []
    for (const item of board.items) {
        if (items.find(i => i.id === item.id)) {
            console.warn("Duplicate item", item, "found on table", board.name)
        } else {
            items.push(migrateItem(item, items, board.items))
        }
    }
    return { ...defaultBoardSize, ...board, items }
    
    function migrateItem(item: Item, migratedItems: Item[], boardItems: Item[]): Item {
        const { width, height, type, ...rest } = item

        // Force type, width and height for all items
        let fixedItem = { type: type || "note", width: width || 5, height: height || 5, ...rest } as Item
        if (fixedItem.type === "container") {
            let container = fixedItem as Container & { items?: string[]}
            // Force container to have text
            container.text = container.text || ""
            // If container had items property, migrate each corresponding item to have containerId of that container instead
            if (container.items) {
                const ids = container.items
                delete container.items
                ids.forEach(i => {
                    const containedItem = migratedItems.find(mi => mi.id === i) || boardItems.find(bi => bi.id === i)
                    containedItem && containedItem.type !== "container" && (containedItem.containerId = container.id)
                })
            }
        }

        return fixedItem
    }
}