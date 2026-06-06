"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type {
  AutomationRules,
  NormalizedTransaction,
  SplitwiseCurrentUser,
  SplitwiseGroup,
} from "@/types";
import { applyDefaultRules } from "@/lib/default-rules";
import {
  getAutomationRules,
  getStoredToken,
  setStoredToken,
} from "@/lib/storage";

interface AppContextValue {
  token: string;
  setToken: (token: string) => void;
  groups: SplitwiseGroup[];
  currentUser: SplitwiseCurrentUser | null;
  transactions: NormalizedTransaction[];
  setTransactions: React.Dispatch<
    React.SetStateAction<NormalizedTransaction[]>
  >;
  rules: AutomationRules;
  setRules: React.Dispatch<React.SetStateAction<AutomationRules>>;
  isLoadingGroups: boolean;
  groupsError: string | null;
  refreshGroups: () => Promise<void>;
  updateTransaction: (
    id: string,
    updates: Partial<NormalizedTransaction>
  ) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState(
    () => (typeof window !== "undefined" ? getStoredToken() ?? "" : "")
  );
  const [groups, setGroups] = useState<SplitwiseGroup[]>([]);
  const [currentUser, setCurrentUser] = useState<SplitwiseCurrentUser | null>(
    null
  );
  const [transactions, setTransactions] = useState<NormalizedTransaction[]>([]);
  const [rules, setRules] = useState<AutomationRules>(() =>
    typeof window !== "undefined" ? getAutomationRules() : {}
  );
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [groupsError, setGroupsError] = useState<string | null>(null);

  const setToken = useCallback((value: string) => {
    setTokenState(value);
    setStoredToken(value);
  }, []);

  const refreshGroups = useCallback(async () => {
    const storedToken = getStoredToken();
    if (!storedToken) {
      setGroupsError("No Splitwise token configured");
      return;
    }

    setIsLoadingGroups(true);
    setGroupsError(null);

    try {
      const res = await fetch("/api/splitwise/groups", {
        headers: { Authorization: `Bearer ${storedToken}` },
      });

      const data = await res.json();

      if (!res.ok) {
        setGroupsError(data.error ?? "Failed to fetch groups");
        return;
      }

      setGroups(data.groups ?? []);
      setCurrentUser(data.currentUser ?? null);
    } catch (err) {
      setGroupsError(
        err instanceof Error ? err.message : "Failed to fetch groups"
      );
    } finally {
      setIsLoadingGroups(false);
    }
  }, []);

  useEffect(() => {
    if (!token) return;
    const timer = setTimeout(() => {
      void refreshGroups();
    }, 0);
    return () => clearTimeout(timer);
  }, [token, refreshGroups]);

  useEffect(() => {
    if (groups.length === 0) return;
    setTransactions((prev) => {
      const updated = applyDefaultRules(prev, groups);
      const changed = updated.some(
        (tx, i) =>
          tx.selectedGroupId !== prev[i]?.selectedGroupId ||
          tx.status !== prev[i]?.status
      );
      return changed ? updated : prev;
    });
  }, [groups]);

  const updateTransaction = useCallback(
    (id: string, updates: Partial<NormalizedTransaction>) => {
      setTransactions((prev) =>
        prev.map((tx) => (tx.id === id ? { ...tx, ...updates } : tx))
      );
    },
    []
  );

  const value = useMemo(
    () => ({
      token,
      setToken,
      groups,
      currentUser,
      transactions,
      setTransactions,
      rules,
      setRules,
      isLoadingGroups,
      groupsError,
      refreshGroups,
      updateTransaction,
    }),
    [
      token,
      setToken,
      groups,
      currentUser,
      transactions,
      rules,
      isLoadingGroups,
      groupsError,
      refreshGroups,
      updateTransaction,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
