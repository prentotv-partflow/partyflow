export type Status =
  | "pending"
  | "preparing"
  | "ready"
  | "completed";

export type Request = {
  id: string;
  guestName: string;
  itemName: string;
  quantity?: number;
  status: Status;
  orderNumber?: number;
  orderGroupId?: string;
  createdAt?: any;
};

export type GroupedRequestCard = {
  groupKey: string;
  itemName: string;
  status: Status;
  totalQuantity: number;
  orderCount: number;
  requestIds: string[];
  requests: Request[];
  latestCreatedAt?: any;
};

export type ReadyGuestCard = {
  groupKey: string;
  guestName: string;
  status: "ready";
  totalQuantity: number;
  orderCount: number;
  requestIds: string[];
  requests: Request[];
  latestCreatedAt?: any;
};