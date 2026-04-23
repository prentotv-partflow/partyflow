export type Status =
  | "pending"
  | "preparing"
  | "ready"
  | "completed";

export type FirestoreTimestampLike = {
  seconds?: number;
  nanoseconds?: number;
  toMillis?: () => number;
} | null;

export type Request = {
  id: string;
  guestName: string;
  itemName: string;
  quantity?: number;
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