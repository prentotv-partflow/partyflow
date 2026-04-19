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

const badgeMap: Record<ColumnType, string> = {
  pending: "bg-yellow-500/20 text-yellow-300",
  preparing: "bg-blue-500/20 text-blue-300",
  ready: "bg-green-500/20 text-green-300",
};

const borderMap: Record<ColumnType, string> = {
  pending: "border-yellow-400/70",
  preparing: "border-blue-400/70",
  ready: "border-green-400/70",
};

const glowMap: Record<ColumnType, string> = {
  pending: "shadow-[0_0_0_1px_rgba(250,204,21,0.08)]",
  preparing: "shadow-[0_0_0_1px_rgba(96,165,250,0.08)]",
  ready: "shadow-[0_0_0_1px_rgba(74,222,128,0.08)]",
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
    const isPendingColumn = type === "pending";
    const hasItems = items.length > 0;

    return (
      <div className="flex max-h-[70vh] flex-col rounded-3xl border border-white/5 bg-[#191C24] p-4">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-white">{title}</h2>
              {isPendingColumn && hasItems && (
                <span className="rounded-full border border-yellow-400/20 bg-yellow-500/10 px-2 py-0.5 text-[10px] font-medium text-yellow-300">
                  Needs attention
                </span>
              )}
            </div>

            <p className="mt-1 text-xs text-white/40">
              {items.length === 0
                ? "No active orders"
                : `${items.length} ${items.length === 1 ? "order" : "orders"}`}
            </p>
          </div>

          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${badgeMap[type]}`}
          >
            {items.length}
          </span>
        </div>

        <div className="flex flex-col gap-3 overflow-y-auto pr-1">
          {items.length === 0 ? (
            <div className="rounded-2xl border border-white/5 bg-[#0A0C12] px-4 py-8 text-center">
              <p className="text-sm text-white/40">No orders</p>
              <p className="mt-1 text-xs text-white/25">
                Waiting for activity...
              </p>
            </div>
          ) : (
            items.map((req) => {
              const isUpdating = updatingIds.includes(req.id);

              return (
                <div
                  key={req.id}
                  className={`rounded-2xl border border-white/5 bg-[#0A0C12] p-4 transition duration-200 hover:border-white/10 ${glowMap[type]}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-lg font-semibold text-white">
                        {req.itemName}
                        {req.quantity ? ` x${req.quantity}` : ""}
                      </p>

                      <p className="mt-1 text-sm text-gray-400">
                        {req.guestName || "Guest"}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium capitalize ${badgeMap[type]}`}
                    >
                      {type}
                    </span>
                  </div>

                  <div className="mt-3">
                    <div
                      className={`h-1.5 rounded-full ${
                        type === "pending"
                          ? "bg-yellow-500/70"
                          : type === "preparing"
                          ? "bg-blue-500/70"
                          : "bg-green-500/70"
                      }`}
                    />
                  </div>

                  <div className="mt-4">
                    {type !== "ready" ? (
                      <button
                        onClick={() =>
                          type === "pending"
                            ? onStartPreparing(req.id)
                            : onMarkReady(req.id)
                        }
                        disabled={isUpdating}
                        className={`w-full rounded-full py-2.5 text-sm font-medium text-white transition active:scale-95 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500 ${
                          type === "pending"
                            ? "bg-[#FF3D9A] hover:opacity-90"
                            : "bg-[#7A3FFF] hover:opacity-90"
                        }`}
                      >
                        {isUpdating
                          ? "Updating..."
                          : type === "pending"
                          ? "Start Preparing"
                          : "Mark Ready"}
                      </button>
                    ) : (
                      <div className="rounded-full bg-green-500/10 px-3 py-2 text-center text-sm font-medium text-green-300">
                        Ready for pickup
                      </div>
                    )}
                  </div>
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
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-base font-medium text-white/50">No orders yet</p>
        <p className="mt-1 text-sm text-white/30">Waiting for guests...</p>
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