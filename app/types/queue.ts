export type Status = "pending" | "preparing" | "ready";

export type Request = {
  id: string;
  guestName: string;
  itemName: string;
  quantity?: number;
  status: Status;
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