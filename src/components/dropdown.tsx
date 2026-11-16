"use client";

import { useEffect, useRef, useState } from "react";

export type DropdownOption<T extends string> = { value: T; label: string; dot?: string };

// A dark, styled dropdown (the browser's own <select> list can't be styled).
// Click or Enter/Space opens it; arrows move; Enter picks; Escape or a click outside closes.
export function Dropdown<T extends string>(props: {
  label: string;
  value: T;
  options: DropdownOption<T>[];
  onChange: (value: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const current = props.options.find((o) => o.value === props.value) ?? props.options[0];

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  function pick(value: T) {
    props.onChange(value);
    setOpen(false);
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === "Escape") return setOpen(false);
    if (!open && (e.key === "Enter" || e.key === " " || e.key === "ArrowDown")) {
      e.preventDefault();
      setActive(Math.max(0, props.options.indexOf(current)));
      return setOpen(true);
    }
    if (!open) return;
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const step = e.key === "ArrowDown" ? 1 : -1;
      setActive((i) => (i + step + props.options.length) % props.options.length);
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      pick(props.options[active].value);
    }
  }

  return (
    <div ref={box} className="relative text-sm" onKeyDown={onKey}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={props.label}
        onClick={() => {
          setActive(Math.max(0, props.options.indexOf(current)));
          setOpen((o) => !o);
        }}
        className={`flex min-h-10 min-w-40 items-center gap-2 rounded-xl border bg-surface px-3 text-left font-medium transition ${
          open ? "border-foreground" : "border-line hover:border-muted"
        }`}
      >
        {current.dot && <span className={`size-2 shrink-0 rounded-full ${current.dot}`} />}
        <span className="flex-1">{current.label}</span>
        <svg viewBox="0 0 16 16" className={`size-4 text-muted transition ${open ? "rotate-180" : ""}`} aria-hidden>
          <path d="M4 6l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      </button>
      {open && (
        <ul
          role="listbox"
          aria-label={props.label}
          className="absolute top-full left-0 z-20 mt-1 min-w-full overflow-hidden rounded-xl border border-line bg-surface p-1 shadow-xl shadow-black/50"
        >
          {props.options.map((o, i) => (
            <li
              key={o.value}
              role="option"
              aria-selected={o.value === props.value}
              onMouseEnter={() => setActive(i)}
              onClick={() => pick(o.value)}
              className={`flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 whitespace-nowrap ${
                i === active ? "bg-background" : ""
              } ${o.value === props.value ? "text-foreground" : "text-muted"}`}
            >
              {o.dot && <span className={`size-2 shrink-0 rounded-full ${o.dot}`} />}
              <span className="flex-1">{o.label}</span>
              {o.value === props.value && <span className="text-accent">✓</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
