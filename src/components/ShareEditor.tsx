"use client";

import type { SplitwiseMember } from "@/types";
import { memberDisplayName } from "@/lib/utils";
import {
  formatShareRatio,
  getUserShareWeights,
  type UserShareMap,
} from "@/lib/user-shares";
import { Input } from "@/components/ui/input";

interface ShareEditorProps {
  members: SplitwiseMember[];
  selectedUserIds: string[];
  userShares: UserShareMap;
  onChange: (userShares: UserShareMap) => void;
  disabled?: boolean;
}

export function ShareEditor({
  members,
  selectedUserIds,
  userShares,
  onChange,
  disabled = false,
}: ShareEditorProps) {
  const selectedMembers = members.filter((member) =>
    selectedUserIds.includes(member.id.toString())
  );

  if (selectedMembers.length === 0) return null;

  const weights = getUserShareWeights(selectedUserIds, userShares);
  const ratioLabel = formatShareRatio(weights);

  const updateShare = (userId: string, rawValue: string) => {
    const parsed = Number.parseInt(rawValue, 10);
    const nextValue = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
    onChange({
      ...userShares,
      [userId]: nextValue,
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span className="text-xs font-medium text-muted-foreground shrink-0">Shares</span>
      {selectedMembers.map((member) => {
        const userId = member.id.toString();
        const label = memberDisplayName(member.first_name, member.last_name);
        const value = userShares[userId] ?? 1;

        return (
          <label
            key={member.id}
            className="inline-flex items-center gap-1.5 text-xs text-foreground"
          >
            <span className="max-w-[88px] truncate">{label}</span>
            <Input
              type="number"
              min={1}
              max={99}
              value={value}
              disabled={disabled}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
              onChange={(e) => updateShare(userId, e.target.value)}
              className="h-7 w-12 px-1 text-center text-xs"
              aria-label={`${label} shares`}
            />
          </label>
        );
      })}
      {selectedMembers.length > 1 && (
        <span className="text-xs text-muted-foreground">{ratioLabel}</span>
      )}
    </div>
  );
}
