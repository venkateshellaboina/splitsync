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
  EmailSettings,
  NormalizedTransaction,
  SplitwiseCurrentUser,
  SplitwiseGroup,
  SplitwiseMember,
  UploadedCsvFile,
} from "@/types";
import { applyDefaultRules } from "@/lib/default-rules";
import {
  getAutomationRules,
  getStoredEmailSettings,
  getStoredToken,
  setStoredEmailSettings,
  setStoredToken,
} from "@/lib/storage";
import { detectProviderFromEmail, PROVIDER_PRESETS } from "@/lib/email-provider";

interface AppContextValue {
  token: string;
  setToken: (token: string) => void;
  groups: SplitwiseGroup[];
  currentUser: SplitwiseCurrentUser | null;
  /** Splitwise friends — used to populate members for "Non-group expenses". */
  friends: SplitwiseMember[];
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
  hasUploadedCsv: boolean;
  setHasUploadedCsv: (value: boolean) => void;
  uploadedFiles: UploadedCsvFile[];
  setUploadedFiles: React.Dispatch<React.SetStateAction<UploadedCsvFile[]>>;
  removeUploadedFile: (id: string) => void;
  emailSettings: EmailSettings | null;
  setEmailSettings: (settings: EmailSettings) => void;
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
  const [friends, setFriends] = useState<SplitwiseMember[]>([]);
  const [transactions, setTransactions] = useState<NormalizedTransaction[]>([]);
  const [rules, setRules] = useState<AutomationRules>(() =>
    typeof window !== "undefined" ? getAutomationRules() : {}
  );
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [groupsError, setGroupsError] = useState<string | null>(null);
  const [hasUploadedCsv, setHasUploadedCsv] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedCsvFile[]>([]);
  const [emailSettings, setEmailSettingsState] = useState<EmailSettings | null>(
    () => (typeof window !== "undefined" ? getStoredEmailSettings() : null)
  );

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
      const [groupsRes, friendsRes] = await Promise.all([
        fetch("/api/splitwise/groups", {
          headers: { Authorization: `Bearer ${storedToken}` },
        }),
        fetch("/api/splitwise/friends", {
          headers: { Authorization: `Bearer ${storedToken}` },
        }),
      ]);

      const data = await groupsRes.json();

      if (!groupsRes.ok) {
        setGroupsError(data.error ?? "Failed to fetch groups");
        return;
      }

      setGroups(data.groups ?? []);
      setCurrentUser(data.currentUser ?? null);

      if (friendsRes.ok) {
        const friendsData = await friendsRes.json();
        setFriends(friendsData.friends ?? []);
      }
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

  const setEmailSettings = useCallback((settings: EmailSettings) => {
    setEmailSettingsState(settings);
    setStoredEmailSettings(settings);
  }, []);

  // Default the Email Reminders email/provider from the Splitwise account's
  // email the first time it loads, unless the user has already saved
  // settings. Adjusted during render (guarded, so it only reacts once per
  // distinct email) rather than in an effect.
  const [autoFilledFor, setAutoFilledFor] = useState<string | null>(null);
  if (currentUser?.email && !emailSettings && autoFilledFor !== currentUser.email) {
    setAutoFilledFor(currentUser.email);
    const provider = detectProviderFromEmail(currentUser.email);
    const preset = PROVIDER_PRESETS[provider];
    setEmailSettingsState({
      provider,
      email: currentUser.email,
      appPassword: "",
      host: preset?.host ?? "",
      port: preset?.port ?? 587,
    });
  }

  const updateTransaction = useCallback(
    (id: string, updates: Partial<NormalizedTransaction>) => {
      setTransactions((prev) =>
        prev.map((tx) => (tx.id === id ? { ...tx, ...updates } : tx))
      );
    },
    []
  );

  const removeUploadedFile = useCallback((id: string) => {
    setUploadedFiles((prev) => prev.filter((f) => f.id !== id));
    setTransactions((prev) => prev.filter((tx) => tx.sourceFileId !== id));
  }, []);

  const value = useMemo(
    () => ({
      token,
      setToken,
      groups,
      currentUser,
      friends,
      transactions,
      setTransactions,
      rules,
      setRules,
      isLoadingGroups,
      groupsError,
      refreshGroups,
      updateTransaction,
      hasUploadedCsv,
      setHasUploadedCsv,
      uploadedFiles,
      setUploadedFiles,
      removeUploadedFile,
      emailSettings,
      setEmailSettings,
    }),
    [
      token,
      setToken,
      groups,
      currentUser,
      friends,
      transactions,
      rules,
      isLoadingGroups,
      groupsError,
      refreshGroups,
      updateTransaction,
      hasUploadedCsv,
      uploadedFiles,
      removeUploadedFile,
      emailSettings,
      setEmailSettings,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
