import { h, HarmajaOutput } from "harmaja"
import * as _ from "lodash"
import * as L from "lonna"
import { Board, Color, isShapedItem, Item, NoteShape, ShapedItem } from "../../../../common/src/domain"
import { ShapeDiamondIcon, ShapeRectIcon, ShapeRoundIcon, ShapeSquareIcon } from "../../components/Icons"
import { black, selectedColor } from "../../components/UIColors"
import { Dispatch } from "../../store/board-store"

type Props = {
    focusedItems: L.Property<Item[]>
    board: L.Property<Board>
    dispatch: Dispatch
}

export function shapesMenu({ board, focusedItems, dispatch }: Props) {
    type ShapeSymbol = { id: NoteShape; svg: (c: Color) => HarmajaOutput }
    const shapes: ShapeSymbol[] = [
        {
            id: "square",
            svg: ShapeSquareIcon,
        },
        {
            id: "round",
            svg: ShapeRoundIcon,
        },
        {
            id: "rect",
            svg: ShapeRectIcon,
        },
        {
            id: "diamond",
            svg: ShapeDiamondIcon,
        },
    ]

    const shapedItems = L.view(focusedItems, (items) => items.filter(isShapedItem))
    const anyShaped = L.view(shapedItems, (items) => items.length > 0)
    const currentShape = L.view(shapedItems, (items) =>
        _.uniq(items.map((item) => item.shape)).length > 1 ? undefined : items[0]?.shape,
    )

    return L.view(anyShaped, (anyShaped) => {
        return !anyShaped
            ? []
            : [
                  <div className="shapes icon-group">
                      {shapes.map((shape) => {
                          return (
                              <span className="icon" onClick={changeShape(shape.id)}>
                                  {L.view(
                                      currentShape,
                                      (s) => s === shape.id,
                                      (selected) => shape.svg(selected ? selectedColor : black),
                                  )}
                              </span>
                          )
                      })}
                  </div>,
              ]
    })

    function changeShape(newShape: NoteShape) {
        return () => {
            const b = board.get()
            const items = shapedItems.get()
            const updated = items.map((item) => {
                const maxDim = Math.max(item.width, item.height)
                const dimensions =
                    newShape === "rect"
                        ? { width: maxDim * 1.2, height: maxDim / 1.2 }
                        : { width: maxDim, height: maxDim }
                return { ...item, shape: newShape, ...dimensions }
            }) as ShapedItem[]
            dispatch({ action: "item.update", boardId: b.id, items: updated })
        }
    }
}