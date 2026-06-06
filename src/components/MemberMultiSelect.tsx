"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { SplitwiseMember } from "@/types";
import { cn, memberDisplayName } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";

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
  const isOpen = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

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
    onChange(members.map((m) => m.id.toString()));
  };

  const deselectAll = () => {
    onChange([]);
  };

  return (
    <div className="relative">
      <button
        type="button"
        disabled={disabled || members.length === 0}
        onClick={() => setOpen(!isOpen)}
        className={cn(
          "flex h-8 w-full items-center justify-between rounded-md border border-zinc-200 bg-white px-2 text-xs",
          (disabled || members.length === 0) && "opacity-50 cursor-not-allowed"
        )}
      >
        <span className="truncate">{label}</span>
        <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
      </button>

      {isOpen && !disabled && members.length > 0 && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-zinc-200 bg-white shadow-lg">
          <div className="flex items-center justify-between gap-2 border-b px-3 py-1.5">
            <button
              type="button"
              className="text-xs text-zinc-600 hover:text-zinc-900 hover:underline"
              onClick={selectAll}
            >
              Select all
            </button>
            <button
              type="button"
              className="text-xs text-zinc-600 hover:text-zinc-900 hover:underline"
              onClick={deselectAll}
            >
              Deselect all
            </button>
          </div>
          <ul className="max-h-48 overflow-auto py-1">
            {members.map((member) => {
              const idStr = member.id.toString();
              const checked = selectedUserIds.includes(idStr);
              return (
                <li key={member.id}>
                  <label className="flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-zinc-100 cursor-pointer">
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
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
