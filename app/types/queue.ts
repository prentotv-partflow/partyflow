export type MenuItem = {
  id: string;
  name: string;
  qty: number;
  price?: number;
};

export type Status = "pending" | "preparing" | "ready" | "completed";

export type FirestoreTimestampLike = {
  seconds?: number;
  nanoseconds?: number;
  toMillis?: () => number;
} | null;

export type QueueAgeLevel = "normal" | "waiting" | "attention";

export type Request = {
  id: string;
  eventId?: string;
  guestId: string;
  guestName?: string;
  itemName: string;
  quantity: number;
  status: Status;
  orderNumber?: number;
  orderGroupId?: string;
  createdAt?: FirestoreTimestampLike;
  pendingAt?: FirestoreTimestampLike;
  preparingAt?: FirestoreTimestampLike;
  readyAt?: FirestoreTimestampLike;
  completedAt?: FirestoreTimestampLike;
};

export type GroupedRequestCard = {
  groupKey: string;
  itemName: string;
  status: Status;
  totalQuantity: number;
  orderCount: number;
  requestIds: string[];
  requests: Request[];
  latestCreatedAt?: FirestoreTimestampLike;

  // Queue aging metadata for pending host groups
  queueAgeMinutes?: number;
  queueAgeLevel?: QueueAgeLevel;
  queueAgeLabel?: string;
};

export type ReadyGuestCard = {
  groupKey: string;
  guestName: string;
  status: "ready";
  totalQuantity: number;
  orderCount: number;
  requestIds: string[];
  requests: Request[];
  latestCreatedAt?: FirestoreTimestampLike;
};