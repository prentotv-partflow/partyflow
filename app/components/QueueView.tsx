"use client";

import { GroupedRequestCard, ReadyGuestCard } from "@/app/types/queue";

type Props = {
  pending: GroupedRequestCard[];
  preparing: GroupedRequestCard[];
  ready: ReadyGuestCard[];
  onStartPreparing: (requestIds: string[]) => void;
  onMarkReady: (requestIds: string[]) => void;
  onCompletePickup: (requestIds: string[]) => void;
  updatingIds?: string[];
};

type ColumnType = "pending" | "preparing" | "ready";

const badgeMap: Record<ColumnType, string> = {
  pending: "border border-yellow-400/20 bg-yellow-500/10 text-yellow-300",
  preparing: "border border-[#508CFF]/20 bg-[#508CFF]/12 text-[#9FC0FF]",
  ready: "border border-emerald-400/20 bg-emerald-500/10 text-emerald-300",
};

const shellMap: Record<ColumnType, string> = {
  pending: "border-yellow-400/10",
  preparing: "border-[#508CFF]/10",
  ready: "border-emerald-400/14",
};

function SummaryPill({
  label,
  count,
  tone,
}: {
  label: string;
  count: number;
  tone: string;
}) {
  return (
    <div className={`rounded-2xl border px-4 py-3 ${tone}`}>
      <p className="text-[10px] uppercase tracking-[0.14em] opacity-70">
        {label}
      </p>
      <p className="mt-1 text-xl font-semibold">{count}</p>
    </div>
  );
}

export default function QueueView({
  pending,
  preparing,
  ready,
  onStartPreparing,
  onMarkReady,
  onCompletePickup,
  updatingIds = [],
}: Props) {
  const totalLive = pending.length + preparing.length + ready.length;

  const renderPendingPreparing = (
    title: string,
    items: GroupedRequestCard[],
    type: "pending" | "preparing"
  ) => {
    return (
      <div
        className={`flex max-h-[72vh] flex-col rounded-3xl border bg-[#191C24] p-4 sm:p-5 ${shellMap[type]}`}
      >
        <div className="mb-4 flex items-center justify-between border-b border-white/6 pb-4">
          <div>
            <h2 className="text-lg font-semibold text-white">{title}</h2>
            <p className="mt-1 text-xs text-white/35">
              {items.length === 0
                ? "No active groups"
                : `${items.length} active ${
                    items.length === 1 ? "group" : "groups"
                  }`}
            </p>
          </div>

          <span
            className={`rounded-full px-3 py-1 text-sm font-semibold ${badgeMap[type]}`}
          >
            {items.length}
          </span>
        </div>

        <div className="flex flex-col gap-3 overflow-y-auto pr-1">
          {items.length === 0 ? (
            <div className="rounded-2xl border border-white/5 bg-[#0F1218] px-4 py-10 text-center text-white/35">
              Waiting for activity...
            </div>
          ) : (
            items.map((group) => {
              const isUpdating = group.requestIds.some((id) =>
                updatingIds.includes(id)
              );

              return (
                <div
                  key={group.groupKey}
                  className="rounded-2xl border border-white/6 bg-[#0F1218] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-white">
                        {group.itemName}
                      </p>

                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-white/70">
                        <span className="rounded-full bg-white/6 px-2.5 py-1">
                          Qty {group.totalQuantity}
                        </span>
                        <span className="rounded-full bg-white/6 px-2.5 py-1">
                          {group.orderCount} orders
                        </span>
                      </div>
                    </div>

                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${badgeMap[type]}`}
                    >
                      {type}
                    </span>
                  </div>

                  <div className="mt-4">
                    {type === "pending" ? (
                      <button
                        onClick={() => onStartPreparing(group.requestIds)}
                        disabled={isUpdating}
                        className="w-full rounded-full bg-yellow-500 px-4 py-4 text-base font-semibold text-black transition hover:opacity-90 disabled:bg-gray-300 disabled:text-gray-500"
                      >
                        {isUpdating ? "Updating..." : "Start Preparing"}
                      </button>
                    ) : (
                      <button
                        onClick={() => onMarkReady(group.requestIds)}
                        disabled={isUpdating}
                        className="w-full rounded-full bg-[#508CFF] px-4 py-4 text-base font-semibold text-white transition hover:opacity-90 disabled:bg-gray-300 disabled:text-gray-500"
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

  const renderReady = () => {
    return (
      <div
        className={`flex max-h-[72vh] flex-col rounded-3xl border bg-[#191C24] p-4 sm:p-5 ${shellMap.ready}`}
      >
        <div className="mb-4 flex items-center justify-between border-b border-white/6 pb-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Ready Pickup</h2>
            <p className="mt-1 text-xs text-emerald-200/60">
              Guests waiting now
            </p>
          </div>

          <span
            className={`rounded-full px-3 py-1 text-sm font-semibold ${badgeMap.ready}`}
          >
            {ready.length}
          </span>
        </div>

        <div className="flex flex-col gap-3 overflow-y-auto pr-1">
          {ready.length === 0 ? (
            <div className="rounded-2xl border border-white/5 bg-[#0F1218] px-4 py-10 text-center text-white/35">
              Nothing ready yet
            </div>
          ) : (
            ready.map((group) => {
              const isUpdating = group.requestIds.some((id) =>
                updatingIds.includes(id)
              );

              return (
                <div
                  key={group.groupKey}
                  className="rounded-2xl border border-emerald-400/10 bg-[#0F1218] p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold text-white">
                        {group.guestName}
                      </p>

                      <div className="mt-2 flex flex-wrap gap-2 text-xs text-white/70">
                        <span className="rounded-full bg-white/6 px-2.5 py-1">
                          Qty {group.totalQuantity}
                        </span>
                        <span className="rounded-full bg-white/6 px-2.5 py-1">
                          {group.orderCount} orders
                        </span>
                      </div>
                    </div>

                    <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-300">
                      Ready
                    </span>
                  </div>

                  <button
                    onClick={() => onCompletePickup(group.requestIds)}
                    disabled={isUpdating}
                    className="mt-4 w-full rounded-full bg-emerald-400 px-4 py-4 text-base font-semibold text-black transition hover:opacity-90 disabled:bg-gray-300 disabled:text-gray-500"
                  >
                    {isUpdating ? "Updating..." : "Complete Pickup"}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  if (totalLive === 0) {
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
    <div>
      <div className="sticky top-0 z-20 mb-4 rounded-3xl border border-white/8 bg-[#191C24]/95 p-3 backdrop-blur-xl">
        <div className="grid grid-cols-3 gap-3">
          <SummaryPill
            label="Pending"
            count={pending.length}
            tone="border-yellow-400/15 bg-yellow-500/8 text-yellow-300"
          />
          <SummaryPill
            label="Preparing"
            count={preparing.length}
            tone="border-[#508CFF]/15 bg-[#508CFF]/8 text-[#9FC0FF]"
          />
          <SummaryPill
            label="Ready"
            count={ready.length}
            tone="border-emerald-400/15 bg-emerald-500/8 text-emerald-300"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {renderPendingPreparing("Pending", pending, "pending")}
        {renderPendingPreparing("Preparing", preparing, "preparing")}
        {renderReady()}
      </div>
    </div>
  );
}