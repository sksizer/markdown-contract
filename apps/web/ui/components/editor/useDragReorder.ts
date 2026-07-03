/**
 * useDragReorder — HTML5-native drag-handle reordering for ONE flat list
 * (no library). One instance per reorderable list; the instance's own state
 * is what constrains drags to their own level: `over`/`dropOn` ignore any
 * drag this instance didn't start (they neither indicate nor stop
 * propagation, so an ancestor list's instance can handle its own drag when
 * pointer events bubble up out of a nested level).
 *
 * Wiring per row:
 *   - grip handle:  <DragHandle @dragstart="d.start(i, $event)" @dragend="d.end()" />
 *   - row root:     :class="d.rowClass(i)"  @dragover="d.over(i, $event)"
 *                   @drop="d.dropOn($event)"
 * The row states (`dnd-row--lift`, insertion line) are styled once, globally,
 * in DragHandle.vue. Dropping commits ONE `move(from, to)` — splice semantics
 * (remove at `from`, insert at `to`) matching moveSeqItem / moveMapItem.
 */
import { type Ref, ref } from "vue";

export interface DragReorder {
  /** index being dragged in THIS list, null when idle */
  dragging: Ref<number | null>;
  /** wire to the row's grip handle */
  start(index: number, event: DragEvent): void;
  end(): void;
  /** wire to the row's root element */
  over(index: number, event: DragEvent): void;
  dropOn(event: DragEvent): void;
  /** row-root classes: base target + lift + insertion-line states */
  rowClass(index: number): Record<string, boolean>;
}

export function useDragReorder(
  count: () => number,
  move: (from: number, to: number) => void,
): DragReorder {
  const dragging = ref<number | null>(null);
  /** insertion slot under the pointer: 0..count (between-rows position) */
  const insert = ref<number | null>(null);

  function start(index: number, event: DragEvent): void {
    dragging.value = index;
    insert.value = null;
    const dt = event.dataTransfer;
    if (dt) {
      dt.effectAllowed = "move";
      // Firefox refuses to start a drag without data.
      dt.setData("text/plain", String(index));
      const row = (event.target as HTMLElement | null)?.closest(".dnd-row");
      if (row instanceof HTMLElement) dt.setDragImage(row, 16, 16);
    }
  }

  function end(): void {
    dragging.value = null;
    insert.value = null;
  }

  function over(index: number, event: DragEvent): void {
    if (dragging.value === null) return; // not this list's drag — let an ancestor list see it
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    insert.value = event.clientY < rect.top + rect.height / 2 ? index : index + 1;
  }

  function dropOn(event: DragEvent): void {
    if (dragging.value === null) return;
    event.preventDefault();
    event.stopPropagation();
    const from = dragging.value;
    const slot = insert.value;
    end();
    if (slot === null) return;
    const to = slot > from ? slot - 1 : slot;
    if (to !== from && to >= 0 && to < count()) move(from, to);
  }

  function rowClass(index: number): Record<string, boolean> {
    const active = dragging.value !== null;
    return {
      "dnd-row": true,
      "dnd-row--lift": dragging.value === index,
      "dnd-row--before": active && insert.value === index,
      "dnd-row--after": active && insert.value === count() && index === count() - 1,
    };
  }

  return { dragging, start, end, over, dropOn, rowClass };
}
