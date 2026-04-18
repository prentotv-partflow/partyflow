"use client";

import { Request } from "@/app/types/queue";

type Props = {
  pending: Request[];
  preparing: Request[];
  ready: Request[];
  onStartPreparing: (id: string) => void;
  onMarkReady: (id: string) => void;
  updatingIds?: string[];
};

type ColumnType = "pending" | "preparing" | "ready";

const colorMap: Record<ColumnType, string> = {
  pending: "text-yellow-400",
  preparing: "text-blue-400",
  ready: "text-green-400",
};

const borderMap: Record<ColumnType, string> = {
  pending: "border-yellow-400",
  preparing: "border-blue-400",
  ready: "border-green-400",
};

export default function QueueView({
  pending,
  preparing,
  ready,
  onStartPreparing,
  onMarkReady,
  updatingIds = [],
}: Props) {
  const renderColumn = (
    title: string,
    items: Request[],
    type: ColumnType
  ) => {
    return (
      <div className="flex max-h-[70vh] flex-col rounded-3xl border border-white/5 bg-[#191C24] p-3">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-white/80">{title}</h2>
          <span className={`text-xs ${colorMap[type]}`}>{items.length}</span>
        </div>

        <div className="flex flex-col gap-2 overflow-y-auto pr-1">
          {items.length === 0 ? (
            <p className="py-6 text-center text-xs text-white/40">No orders</p>
          ) : (
            items.map((req) => {
              const isUpdating = updatingIds.includes(req.id);

              return (
                <div
                  key={req.id}
                  className={`rounded-2xl border-l-4 bg-[#0A0C12] p-3 transition-all duration-300 hover:scale-[1.01] ${borderMap[type]}`}
                >
                  <p className="font-medium text-white">
                    {req.itemName}
                    {req.quantity ? ` x${req.quantity}` : ""}
                  </p>

                  <p className="mt-1 text-sm text-white/60">{req.guestName}</p>

                  {type !== "ready" && (
                    <button
                      onClick={() =>
                        type === "pending"
                          ? onStartPreparing(req.id)
                          : onMarkReady(req.id)
                      }
                      disabled={isUpdating}
                      className={`mt-3 w-full rounded-full py-2 text-sm text-white transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 ${
                        type === "pending"
                          ? "bg-[#FF3D9A]"
                          : "bg-[#7A3FFF]"
                      }`}
                    >
                      {isUpdating
                        ? "Updating..."
                        : type === "pending"
                        ? "Start Preparing"
                        : "Mark Ready"}
                    </button>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  const isEmpty =
    pending.length === 0 &&
    preparing.length === 0 &&
    ready.length === 0;

  if (isEmpty) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-white/40">
        <p>No orders yet</p>
        <p className="mt-1 text-xs">Waiting for guests...</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 px-4 pb-6 md:grid-cols-3">
      {renderColumn("Pending", pending, "pending")}
      {renderColumn("Preparing", preparing, "preparing")}
      {renderColumn("Ready", ready, "ready")}
    </div>
  );
}