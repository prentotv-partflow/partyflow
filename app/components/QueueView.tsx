"use client";

import { GroupedRequestCard } from "@/app/types/queue";

type Props = {
  pending: GroupedRequestCard[];
  preparing: GroupedRequestCard[];
  ready: GroupedRequestCard[];
  onStartPreparing: (requestIds: string[]) => void;
  onMarkReady: (requestIds: string[]) => void;
  updatingIds?: string[];
};

type ColumnType = "pending" | "preparing" | "ready";

const badgeMap: Record<ColumnType, string> = {
  pending: "bg-yellow-500/20 text-yellow-300",
  preparing: "bg-blue-500/20 text-blue-300",
  ready: "bg-green-500/20 text-green-300",
};

const accentBarMap: Record<ColumnType, string> = {
  pending: "bg-yellow-500/70",
  preparing: "bg-blue-500/70",
  ready: "bg-green-500/70",
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
    items: GroupedRequestCard[],
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
                ? "No active groups"
                : `${items.length} ${items.length === 1 ? "group" : "groups"}`}
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
            items.map((group) => {
              const isUpdating = group.requestIds.some((id) =>
                updatingIds.includes(id)
              );

              const latestGuests = group.requests
                .slice(-3)
                .map((request) => request.guestName || "Guest");

              return (
                <div
                  key={group.groupKey}
                  className={`rounded-2xl border border-white/5 bg-[#0A0C12] p-4 transition duration-200 hover:border-white/10 ${glowMap[type]}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-lg font-semibold text-white">
                        {group.itemName}
                      </p>

                      <p className="mt-1 text-sm text-gray-400">
                        {group.totalQuantity} total • {group.orderCount}{" "}
                        {group.orderCount === 1 ? "order" : "orders"}
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
                      className={`h-1.5 rounded-full ${accentBarMap[type]}`}
                    />
                  </div>

                  <div className="mt-3 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-2">
                    <p className="text-[11px] uppercase tracking-wide text-white/35">
                      Recent guests
                    </p>
                    <p className="mt-1 text-sm text-gray-300">
                      {latestGuests.join(", ")}
                    </p>
                  </div>

                  <div className="mt-4 flex gap-2">
                    {type === "pending" && (
                      <button
                        onClick={() => onStartPreparing(group.requestIds)}
                        disabled={isUpdating}
                        className="flex-1 rounded-full bg-yellow-500 px-4 py-2.5 text-sm font-medium text-black transition hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
                      >
                        {isUpdating ? "Updating..." : "Start Preparing"}
                      </button>
                    )}

                    {type === "preparing" && (
                      <button
                        onClick={() => onMarkReady(group.requestIds)}
                        disabled={isUpdating}
                        className="flex-1 rounded-full bg-[#508CFF] px-4 py-2.5 text-sm font-medium text-white transition hover:opacity-90 active:scale-95 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
                      >
                        {isUpdating ? "Updating..." : "Mark Ready"}
                      </button>
                    )}

                    {type === "ready" && (
                      <div className="flex-1 rounded-full bg-green-500/10 px-4 py-2.5 text-center text-sm font-medium text-green-300">
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