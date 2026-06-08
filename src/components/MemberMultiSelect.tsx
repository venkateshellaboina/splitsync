"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Search } from "lucide-react";
import type { SplitwiseMember } from "@/types";
import { cn, memberDisplayName } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";

interface MemberMultiSelectProps {
  members: SplitwiseMember[];
  selectedUserIds: string[];
  onChange: (userIds: string[]) => void;
  disabled?: boolean;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function MemberMultiSelect({
  members,
  selectedUserIds,
  onChange,
  disabled = false,
  isOpen: controlledOpen,
  onOpenChange,
}: MemberMultiSelectProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [search, setSearch] = useState("");
  const isOpen = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  useEffect(() => {
    if (!isOpen) setSearch("");
  }, [isOpen]);

  const filteredMembers = useMemo(() => {
    if (!search.trim()) return members;
    const query = search.trim().toLowerCase();
    return members.filter((member) => {
      const name = memberDisplayName(
        member.first_name,
        member.last_name
      ).toLowerCase();
      return (
        name.includes(query) ||
        member.first_name.toLowerCase().includes(query) ||
        (member.last_name?.toLowerCase().includes(query) ?? false) ||
        member.email.toLowerCase().includes(query)
      );
    });
  }, [members, search]);

  const label = useMemo(() => {
    if (selectedUserIds.length === 0) return "Select members...";
    if (selectedUserIds.length === members.length) return "All members";
    return `${selectedUserIds.length} member${selectedUserIds.length !== 1 ? "s" : ""}`;
  }, [selectedUserIds, members]);

  const toggleMember = (id: number) => {
    const idStr = id.toString();
    if (selectedUserIds.includes(idStr)) {
      onChange(selectedUserIds.filter((uid) => uid !== idStr));
    } else {
      onChange([...selectedUserIds, idStr]);
    }
  };

  const selectAll = () => {
    const visibleIds = filteredMembers.map((m) => m.id.toString());
    if (!search.trim()) {
      onChange(visibleIds);
      return;
    }
    onChange([...new Set([...selectedUserIds, ...visibleIds])]);
  };

  const deselectAll = () => {
    if (!search.trim()) {
      onChange([]);
      return;
    }
    const visibleIds = new Set(filteredMembers.map((m) => m.id.toString()));
    onChange(selectedUserIds.filter((id) => !visibleIds.has(id)));
  };

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled || members.length === 0}
        onClick={() => setOpen(!isOpen)}
        className={cn(
          "flex h-8 w-full items-center justify-between rounded-md border border-border bg-card px-2 text-xs",
          (disabled || members.length === 0) && "opacity-50 cursor-not-allowed"
        )}
      >
        <span className="truncate">{label}</span>
        <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
      </button>

      {isOpen && !disabled && members.length > 0 && (
        <div className="absolute z-[100] mt-1 w-full min-w-[200px] rounded-md border border-border bg-card shadow-xl">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.stopPropagation()}
                placeholder="Search people..."
                className="h-7 pl-7 text-xs"
                autoFocus
              />
            </div>
          </div>
          <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-1.5">
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground hover:underline"
              onClick={selectAll}
            >
              {search.trim() ? "Select shown" : "Select all"}
            </button>
            <button
              type="button"
              className="text-xs text-muted-foreground hover:text-foreground hover:underline"
              onClick={deselectAll}
            >
              {search.trim() ? "Deselect shown" : "Deselect all"}
            </button>
          </div>
          <ul className="max-h-48 overflow-auto py-1">
            {filteredMembers.length === 0 ? (
              <li className="px-3 py-2 text-xs text-muted-foreground">No people found</li>
            ) : (
              filteredMembers.map((member) => {
                const idStr = member.id.toString();
                const checked = selectedUserIds.includes(idStr);
                return (
                  <li key={member.id}>
                    <label className="flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent cursor-pointer">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggleMember(member.id)}
                      />
                      <span>
                        {memberDisplayName(member.first_name, member.last_name)}
                      </span>
                    </label>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
