"use client";

import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

// Drag to reorder. A short mouse move (or a press-and-hold on a phone)
// starts a drag, so a plain click still opens the item.
export function SortableArea(props: {
  ids: string[];
  layout: "grid" | "list";
  disabled?: boolean;
  onReorder: (ids: string[]) => void;
  children: React.ReactNode;
}) {
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  function end({ active, over }: DragEndEvent) {
    if (!over || active.id === over.id) return;
    const from = props.ids.indexOf(String(active.id));
    const to = props.ids.indexOf(String(over.id));
    if (from >= 0 && to >= 0) props.onReorder(arrayMove(props.ids, from, to));
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={end}>
      <SortableContext
        items={props.ids}
        disabled={props.disabled}
        strategy={props.layout === "grid" ? rectSortingStrategy : verticalListSortingStrategy}
      >
        {props.children}
      </SortableContext>
    </DndContext>
  );
}

// One draggable <li>. Only `handle` starts a drag; `children` (e.g. an open
// edit form) sits under it and can be typed in freely. Put it inside a SortableArea.
export function SortableItem(props: {
  id: string;
  className?: string;
  handle: React.ReactNode;
  children?: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.id });
  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={`${props.className ?? ""} ${isDragging ? "relative z-10 opacity-80 shadow-lg" : ""}`}
    >
      <div {...attributes} {...listeners} className="rounded-xl">
        {props.handle}
      </div>
      {props.children}
    </li>
  );
}

// Send a new order to the server: ids[0] becomes 1, ids[1] becomes 2, …
export async function saveOrder(kind: "sections" | "checks" | "rooms" | "rounds" | "groups", ids: string[]) {
  const res = await fetch("/api/admin/order", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ kind, ids }),
  });
  return (await res.json().catch(() => ({ ok: false, error: "Could not save order" }))) as {
    ok: boolean;
    error?: string;
  };
}
