"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import type { SplitwiseGroup } from "@/types";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

interface GroupSelectorProps {
  groups: SplitwiseGroup[];
  value: string | null;
  onChange: (groupId: string | null) => void;
  disabled?: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function GroupSelector({
  groups,
  value,
  onChange,
  disabled = false,
  isOpen: controlledOpen,
  onOpenChange,
}: GroupSelectorProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const isOpen = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const selectedGroup = groups.find((g) => g.id.toString() === value);

  const filtered = useMemo(() => {
    if (!search) return groups;
    const q = search.toLowerCase();
    return groups.filter((g) => g.name.toLowerCase().includes(q));
  }, [groups, search]);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, setOpen]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!isOpen)}
        className={cn(
          "flex h-8 w-full items-center justify-between rounded-md border border-border bg-card px-2 text-xs",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <span className="truncate">
          {selectedGroup?.name ?? "Select group..."}
        </span>
        <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
      </button>

      {isOpen && !disabled && (
        <div className="absolute z-[100] mt-1 w-full rounded-md border border-border bg-card shadow-xl">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                placeholder="Search groups..."
                className="h-7 pl-7 text-xs"
                autoFocus
              />
            </div>
          </div>
          <ul className="max-h-48 overflow-auto py-1">
            {filtered.length === 0 ? (
              <li className="px-3 py-2 text-xs text-muted-foreground">No groups found</li>
            ) : (
              filtered.map((group) => (
                <li key={group.id}>
                  <button
                    type="button"
                    className={cn(
                      "w-full px-3 py-1.5 text-left text-xs hover:bg-accent",
                      value === group.id.toString() && "bg-muted font-medium"
                    )}
                    onClick={() => {
                      onChange(group.id.toString());
                      setOpen(false);
                      setSearch("");
                    }}
                  >
                    {group.name}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
