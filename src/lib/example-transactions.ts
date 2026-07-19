import type {
  NormalizedTransaction,
  SplitwiseCurrentUser,
  SplitwiseGroup,
} from "@/types";

const ALEX_ID = "-101";
const SYDNEY_ID = "-102";
const ANA_ID = "-103";
const JORDAN_ID = "-201";
const MORGAN_ID = "-202";

export const EXAMPLE_GROUPS: SplitwiseGroup[] = [
  {
    id: -1,
    name: "Roommates",
    updated_at: new Date().toISOString(),
    members: [
      { id: -101, first_name: "Alex", last_name: null, email: "alex@example.com" },
      { id: -102, first_name: "Sydney", last_name: null, email: "sydney@example.com" },
      { id: -103, first_name: "Ana", last_name: null, email: "ana@example.com" },
    ],
  },
  {
    id: -2,
    name: "Book Club",
    updated_at: new Date().toISOString(),
    members: [
      { id: -201, first_name: "Jordan", last_name: null, email: "jordan@example.com" },
      { id: -202, first_name: "Morgan", last_name: null, email: "morgan@example.com" },
    ],
  },
];

export const EXAMPLE_CURRENT_USER: SplitwiseCurrentUser = {
  id: -101,
  first_name: "Alex",
  last_name: null,
  email: "alex@example.com",
};

const ROOMMATES_GROUP_ID = "-1";
const BOOK_CLUB_GROUP_ID = "-2";

export const EXAMPLE_TRANSACTIONS: NormalizedTransaction[] = [
  {
    id: "example-1",
    date: "2026-07-10",
    description: "TRADER JOE'S #142",
    rawDescription: "TRADER JOE'S #142",
    amount: 86.42,
    isRefund: false,
    status: "SUCCESS",
    selectedGroupId: ROOMMATES_GROUP_ID,
    selectedUserIds: [ALEX_ID, SYDNEY_ID],
    cardLabel: "Chase",
    selected: true,
  },
  {
    id: "example-2",
    date: "2026-07-08",
    description: "CON EDISON UTILITY",
    rawDescription: "CON EDISON UTILITY",
    amount: 142.1,
    isRefund: false,
    status: "READY",
    selectedGroupId: ROOMMATES_GROUP_ID,
    selectedUserIds: [ALEX_ID, SYDNEY_ID, ANA_ID],
    syncDescriptionOverride: "2026-07-08 — July electric bill",
    cardLabel: "Chase",
    selected: true,
  },
  {
    id: "example-3",
    date: "2026-07-06",
    description: "CHIPOTLE 0389",
    rawDescription: "CHIPOTLE 0389",
    amount: 28.75,
    isRefund: false,
    status: "UNASSIGNED",
    selectedGroupId: null,
    selectedUserIds: [],
    cardLabel: "Amex",
  },
  {
    id: "example-4",
    date: "2026-07-04",
    description: "AMAZON.COM REFUND",
    rawDescription: "AMAZON.COM REFUND",
    amount: 34.99,
    isRefund: true,
    status: "UNASSIGNED",
    selectedGroupId: null,
    selectedUserIds: [],
    cardLabel: "Amex",
  },
  {
    id: "example-5",
    date: "2026-07-02",
    description: "SPOTIFY PREMIUM",
    rawDescription: "SPOTIFY PREMIUM",
    amount: 16.99,
    isRefund: false,
    status: "IGNORED",
    selectedGroupId: ROOMMATES_GROUP_ID,
    selectedUserIds: [ALEX_ID, SYDNEY_ID],
    cardLabel: "Discover",
    selected: true,
  },
  {
    id: "example-6",
    date: "2026-06-29",
    description: "WHOLE FOODS MARKET",
    rawDescription: "WHOLE FOODS MARKET",
    amount: 112.3,
    isRefund: false,
    status: "READY",
    selectedGroupId: ROOMMATES_GROUP_ID,
    selectedUserIds: [ALEX_ID, SYDNEY_ID],
    userShares: { [ALEX_ID]: 2, [SYDNEY_ID]: 1 },
    cardLabel: "Discover",
    selected: true,
  },
  {
    id: "example-7",
    date: "2026-06-27",
    description: "UBER EATS",
    rawDescription: "UBER EATS",
    amount: 22.1,
    isRefund: false,
    status: "ERROR",
    selectedGroupId: ROOMMATES_GROUP_ID,
    selectedUserIds: [ALEX_ID, ANA_ID],
    errorMessage: "Splitwise rate limit — try again in a few seconds",
    cardLabel: "Citi",
    selected: true,
  },
  {
    id: "example-8",
    date: "2026-06-25",
    description: "BARNES & NOBLE",
    rawDescription: "BARNES & NOBLE",
    amount: 34.0,
    isRefund: false,
    status: "READY",
    selectedGroupId: BOOK_CLUB_GROUP_ID,
    selectedUserIds: [JORDAN_ID, MORGAN_ID],
    cardLabel: "Citi",
    selected: true,
  },
  {
    id: "example-9",
    date: "2026-06-22",
    description: "NETFLIX",
    rawDescription: "NETFLIX",
    amount: 15.49,
    isRefund: false,
    status: "READY",
    selectedGroupId: ROOMMATES_GROUP_ID,
    selectedUserIds: [ALEX_ID, SYDNEY_ID, ANA_ID],
    cardLabel: "Capital One",
    selected: true,
  },
];
