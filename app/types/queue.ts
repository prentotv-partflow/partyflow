export type Status = "pending" | "preparing" | "ready";

export type Request = {
  id: string;
  guestName: string;
  itemName: string;
  quantity?: number;
  status: Status;
  createdAt?: any;
};