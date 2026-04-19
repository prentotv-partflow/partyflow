"use client";

import { GroupedRequestCard, ReadyGuestCard } from "@/app/types/queue";

type Props = {
  pending: GroupedRequestCard[];
  preparing: GroupedRequestCard[];
  ready: ReadyGuestCard[];
  onStartPreparing: (requestIds: string[]) => void;
  onMarkReady: (requestIds: string[]) => void;
  updatingIds?: string[];
};

type ColumnType = "pending" | "preparing" | "ready";

const badgeMap: Record<ColumnType, string> = {
  pending: "border border-yellow-400/20 bg-yellow-500/10 text-yellow-300",
  preparing: "border border-[#508CFF]/20 bg-[#508CFF]/12 text-[#9FC0FF]",
  ready: "border border-emerald-400/20 bg-emerald-500/10 text-emerald-300",
};

const accentBarMap: Record<ColumnType, string> = {
  pending: "bg-yellow-500/80",
  preparing: "bg-[#508CFF]",
  ready: "bg-emerald-400",
};

const glowMap: Record<ColumnType, string> = {
  pending: "shadow-[0_0_0_1px_rgba(250,204,21,0.06)]",
  preparing: "shadow-[0_0_0_1px_rgba(80,140,255,0.08)]",
  ready: "shadow-[0_0_0_1px_rgba(52,211,153,0.08)]",
};

const columnShellMap: Record<ColumnType, string> = {
  pending: "border-yellow-400/10",
  preparing: "border-[#508CFF]/10",
  ready: "border-emerald-400/10",
};

function getColumnSummary(type: ColumnType, count: number) {
  switch (type) {
    case "pending":
      return count === 0
        ? "No active groups"
        : `${count} ${count === 1 ? "group" : "groups"} waiting`;
    case "preparing":
      return count === 0
        ? "No active groups"
        : `${count} ${count === 1 ? "group" : "groups"} in progress`;
    case "ready":
      return count === 0
        ? "No ready guests"
        : `${count} ${count === 1 ? "guest" : "guests"} ready`;
    default:
      return "";
  }
}

export default function QueueView({
  pending,
  preparing,
  ready,
  onStartPreparing,
  onMarkReady,
  updatingIds = [],
}: Props) {
  const renderItemColumn = (
    title: string,
    items: GroupedRequestCard[],
    type: "pending" | "preparing"
  ) => {
    const isPending = type === "pending";
    const hasItems = items.length > 0;

    return (
      <div
        className={`flex max-h-[72vh] flex-col rounded-3xl border bg-[#191C24] p-4 sm:p-5 ${columnShellMap[type]}`}
      >
        {/* Column Header */}
        <div className="mb-4 flex items-start justify-between gap-3 border-b border-white/6 pb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-white">{title}</h2>

              {isPending && hasItems && (
                <span className="rounded-full border border-yellow-400/20 bg-yellow-500/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-yellow-300">
                  Needs attention
                </span>
              )}

              {!isPending && hasItems && (
                <span className="rounded-full border border-[#508CFF]/20 bg-[#508CFF]/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-[#9FC0FF]">
                  In motion
                </span>
              )}
            </div>

            <p className="mt-1 text-xs text-white/35">
              {getColumnSummary(type, items.length)}
            </p>
          </div>

          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${badgeMap[type]}`}
          >
            {items.length}
          </span>
        </div>

        {/* Scroll Body */}
        <div className="flex flex-col gap-3 overflow-y-auto pr-1">
          {items.length === 0 ? (
            <div className="rounded-2xl border border-white/5 bg-[#0F1218] px-4 py-10 text-center">
              <p className="text-sm font-medium text-white/45">No orders</p>
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

              const extraGuestCount = Math.max(group.requests.length - 3, 0);

              return (
                <div
                  key={group.groupKey}
                  className={`rounded-2xl border border-white/6 bg-[#0F1218] p-4 transition duration-200 hover:border-white/12 ${glowMap[type]}`}
                >
                  {/* Top */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-lg font-semibold text-white">
                        {group.itemName}
                      </p>

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-white/6 px-2.5 py-1 text-xs text-white/75">
                          {group.totalQuantity} total
                        </span>
                        <span className="rounded-full bg-white/6 px-2.5 py-1 text-xs text-white/75">
                          {group.orderCount}{" "}
                          {group.orderCount === 1 ? "order" : "orders"}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium capitalize ${badgeMap[type]}`}
                    >
                      {type}
                    </span>
                  </div>

                  {/* Accent */}
                  <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/5">
                    <div
                      className={`h-full rounded-full ${accentBarMap[type]}`}
                    />
                  </div>

                  {/* Guests */}
                  <div className="mt-4 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-3">
                    <p className="text-[11px] uppercase tracking-wide text-white/30">
                      Recent guests
                    </p>

                    <p className="mt-1 text-sm text-gray-300">
                      {latestGuests.join(", ")}
                      {extraGuestCount > 0
                        ? ` +${extraGuestCount} more`
                        : ""}
                    </p>
                  </div>

                  {/* Action Hint */}
                  <div className="mt-3 rounded-xl border border-white/5 bg-white/[0.02] px-3 py-2.5">
                    <p className="text-xs text-white/45">
                      {type === "pending"
                        ? "Start preparing this grouped batch while preserving request-level status updates."
                        : "Mark this grouped batch ready. Each request still updates by explicit request ID."}
                    </p>
                  </div>

                  {/* CTA */}
                  <div className="mt-4">
                    {type === "pending" ? (
                      <button
                        onClick={() => onStartPreparing(group.requestIds)}
                        disabled={isUpdating}
                        className="w-full rounded-full bg-yellow-500 px-4 py-3 text-sm font-medium text-black transition hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
                      >
                        {isUpdating ? "Updating..." : "Start Preparing"}
                      </button>
                    ) : (
                      <button
                        onClick={() => onMarkReady(group.requestIds)}
                        disabled={isUpdating}
                        className="w-full rounded-full bg-[#508CFF] px-4 py-3 text-sm font-medium text-white transition hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
                      >
                        {isUpdating ? "Updating..." : "Mark Ready"}
                      </button>
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

  const renderReadyColumn = (items: ReadyGuestCard[]) => {
    return (
      <div
        className={`flex max-h-[72vh] flex-col rounded-3xl border bg-[#191C24] p-4 sm:p-5 ${columnShellMap.ready}`}
      >
        {/* Header */}
        <div className="mb-4 flex items-start justify-between gap-3 border-b border-white/6 pb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-white">Ready</h2>

              {items.length > 0 && (
                <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-emerald-300">
                  Pickup view
                </span>
              )}
            </div>

            <p className="mt-1 text-xs text-white/35">
              {getColumnSummary("ready", items.length)}
            </p>
          </div>

          <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${badgeMap.ready}`}
          >
            {items.length}
          </span>
        </div>

        {/* Scroll Body */}
        <div className="flex flex-col gap-3 overflow-y-auto pr-1">
          {items.length === 0 ? (
            <div className="rounded-2xl border border-white/5 bg-[#0F1218] px-4 py-10 text-center">
              <p className="text-sm font-medium text-white/45">
                Nothing ready yet
              </p>
              <p className="mt-1 text-xs text-white/25">
                Ready items appear grouped by guest.
              </p>
            </div>
          ) : (
            items.map((group) => {
              const uniqueItemLines = group.requests.reduce<
                Record<string, number>
              >((acc, request) => {
                const key = request.itemName.trim();
                acc[key] = (acc[key] ?? 0) + (request.quantity ?? 1);
                return acc;
              }, {});

              const itemEntries = Object.entries(uniqueItemLines);

              return (
                <div
                  key={group.groupKey}
                  className={`rounded-2xl border border-white/6 bg-[#0F1218] p-4 transition duration-200 hover:border-white/12 ${glowMap.ready}`}
                >
                  {/* Top */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-lg font-semibold text-white">
                        {group.guestName}
                      </p>

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-white/6 px-2.5 py-1 text-xs text-white/75">
                          {group.totalQuantity} ready
                        </span>
                        <span className="rounded-full bg-white/6 px-2.5 py-1 text-xs text-white/75">
                          {group.orderCount}{" "}
                          {group.orderCount === 1 ? "order" : "orders"}
                        </span>
                      </div>
                    </div>

                    <span className="shrink-0 rounded-full border border-emerald-400/20 bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-300">
                      Ready Now
                    </span>
                  </div>

                  {/* Accent */}
                  <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/5">
                    <div
                      className={`h-full rounded-full ${accentBarMap.ready}`}
                    />
                  </div>

                  {/* Items */}
                  <div className="mt-4 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-3">
                    <p className="text-[11px] uppercase tracking-wide text-white/30">
                      Pickup items
                    </p>

                    <div className="mt-2 space-y-2">
                      {itemEntries.map(([itemName, quantity]) => (
                        <div
                          key={itemName}
                          className="flex items-center justify-between gap-3 text-sm"
                        >
                          <span className="truncate text-gray-200">
                            {itemName}
                          </span>

                          <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/70">
                            x{quantity}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="mt-4 rounded-full border border-emerald-400/15 bg-emerald-500/10 px-4 py-3 text-center text-sm font-medium text-emerald-300">
                    Ready for pickup
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
      <div className="rounded-3xl border border-white/8 bg-[#191C24] px-6 py-16 text-center">
        <p className="text-base font-medium text-white/55">No orders yet</p>
        <p className="mt-2 text-sm text-white/30">
          Waiting for guests to begin ordering.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {renderItemColumn("Pending", pending, "pending")}
      {renderItemColumn("Preparing", preparing, "preparing")}
      {renderReadyColumn(ready)}
    </div>
  );
}