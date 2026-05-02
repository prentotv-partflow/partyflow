"use client";

import { useMemo, useState } from "react";
import { GroupedRequestCard, ReadyGuestCard } from "@/app/types/queue";

type Props = {
  pending: GroupedRequestCard[];
  preparing: GroupedRequestCard[];
  ready: ReadyGuestCard[];
  onStartPreparing: (requestIds: string[]) => void;
  onMarkReady: (requestIds: string[]) => void;
  onCompletePickup: (requestIds: string[]) => void;
  updatingIds?: string[];
  actionsDisabled?: boolean;
  reliabilityMessage?: string;
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
        : `${count} ${count === 1 ? "batch" : "batches"} waiting`;

    case "preparing":
      return count === 0
        ? "No active batches"
        : `${count} ${count === 1 ? "batch" : "batches"} in progress`;

    case "ready":
      return count === 0
        ? "No ready guests"
        : `${count} ${count === 1 ? "guest" : "guests"} ready`;

    default:
      return "";
  }
}

function getPrimaryOrderNumber(requests: { orderNumber?: number }[]) {
  const found = requests.find(
    (request) => typeof request.orderNumber === "number"
  );

  return found?.orderNumber;
}

export default function QueueView({
  pending,
  preparing,
  ready,
  onStartPreparing,
  onMarkReady,
  onCompletePickup,
  updatingIds = [],
  actionsDisabled = false,
  reliabilityMessage = "",
}: Props) {
  const [readySearch, setReadySearch] = useState("");

  const filteredReady = useMemo(() => {
    const query = readySearch.trim();

    if (!query) return ready;

    return ready.filter((group) => {
      const orderNumber = getPrimaryOrderNumber(group.requests);

      if (typeof orderNumber !== "number") return false;

      return String(orderNumber).includes(query);
    });
  }, [ready, readySearch]);

  const renderItemColumn = (
    title: string,
    items: GroupedRequestCard[],
    type: "pending" | "preparing"
  ) => {
    const isPending = type === "pending";
    const hasItems = items.length > 0;
    const hasAgedPendingItems =
      isPending &&
      items.some(
        (group) =>
          group.queueAgeLevel === "waiting" ||
          group.queueAgeLevel === "attention"
      );

    return (
      <div
        className={`flex max-h-[72vh] flex-col rounded-3xl border bg-[#191C24] p-4 sm:p-5 ${columnShellMap[type]}`}
      >
        <div className="mb-4 flex items-start justify-between gap-3 border-b border-white/6 pb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-white">{title}</h2>

              {isPending && hasAgedPendingItems && (
                <span className="rounded-full border border-yellow-400/20 bg-yellow-500/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-yellow-300">
                  Aging queue
                </span>
              )}

              {!isPending && hasItems && (
                <span className="rounded-full border border-[#508CFF]/20 bg-[#508CFF]/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-[#9FC0FF]">
                  Active batch
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

              const hasQueueAgeBadge =
                isPending &&
                group.queueAgeLevel &&
                group.queueAgeLevel !== "normal";

              const queueAgeBadgeClass =
                group.queueAgeLevel === "attention"
                  ? "border-red-400/25 bg-red-500/10 text-red-300"
                  : "border-yellow-400/20 bg-yellow-500/10 text-yellow-300";

              const pendingAttentionClass =
                group.queueAgeLevel === "attention"
                  ? "border-red-400/20 shadow-[0_0_0_1px_rgba(248,113,113,0.08),0_0_24px_rgba(248,113,113,0.06)]"
                  : group.queueAgeLevel === "waiting"
                  ? "border-yellow-400/16 shadow-[0_0_0_1px_rgba(250,204,21,0.08)]"
                  : "border-white/6";

              const activeBatchClass = isUpdating
                ? "border-[#8B5CFF]/28 bg-[#151022] shadow-[0_0_0_1px_rgba(139,92,255,0.12),0_0_24px_rgba(139,92,255,0.08)]"
                : isPending
                ? pendingAttentionClass
                : "border-white/6";

              const buttonDisabled = isUpdating || actionsDisabled;

              return (
                <div
                  key={group.groupKey}
                  className={`rounded-2xl border bg-[#0F1218] p-4 transition duration-200 hover:border-white/12 ${activeBatchClass} ${glowMap[type]}`}
                >
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

                        {hasQueueAgeBadge ? (
                          <span
                            className={`rounded-full border px-2.5 py-1 text-xs font-medium ${queueAgeBadgeClass}`}
                          >
                            {group.queueAgeLabel}
                          </span>
                        ) : null}

                        {isUpdating ? (
                          <span className="rounded-full border border-[#8B5CFF]/25 bg-[#8B5CFF]/12 px-2.5 py-1 text-xs font-medium text-[#D7C7FF]">
                            Batch updating
                          </span>
                        ) : null}

                        {actionsDisabled ? (
                          <span className="rounded-full border border-yellow-400/20 bg-yellow-500/10 px-2.5 py-1 text-xs font-medium text-yellow-300">
                            Actions paused
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium capitalize ${badgeMap[type]}`}
                    >
                      {isPending ? "pending" : "batch"}
                    </span>
                  </div>

                  <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/5">
                    <div
                      className={`h-full rounded-full ${accentBarMap[type]}`}
                    />
                  </div>

                  <div className="mt-4 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-3">
                    <p className="text-[11px] uppercase tracking-wide text-white/30">
                      Recent guests
                    </p>

                    <p className="mt-1 text-sm text-gray-300">
                      {latestGuests.join(", ")}
                      {extraGuestCount > 0 ? ` +${extraGuestCount} more` : ""}
                    </p>
                  </div>

                  {actionsDisabled && reliabilityMessage ? (
                    <p className="mt-3 text-xs leading-5 text-yellow-200/60">
                      {reliabilityMessage}
                    </p>
                  ) : null}

                  <div className="mt-4">
                    {type === "pending" ? (
                      <button
                        onClick={() => onStartPreparing(group.requestIds)}
                        disabled={buttonDisabled}
                        className="w-full rounded-full bg-yellow-500 px-4 py-3 text-sm font-medium text-black transition hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
                      >
                        {isUpdating
                          ? "Starting batch..."
                          : actionsDisabled
                          ? "Waiting for live sync"
                          : "Start Batch"}
                      </button>
                    ) : (
                      <button
                        onClick={() => onMarkReady(group.requestIds)}
                        disabled={buttonDisabled}
                        className="w-full rounded-full bg-[#508CFF] px-4 py-3 text-sm font-medium text-white transition hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
                      >
                        {isUpdating
                          ? "Marking batch ready..."
                          : actionsDisabled
                          ? "Waiting for live sync"
                          : "Batch Ready"}
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
        <div className="mb-4 border-b border-white/6 pb-4">
          <div className="flex items-start justify-between gap-3">
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

          <div className="mt-3">
            <input
              type="text"
              inputMode="numeric"
              placeholder="Find order #"
              value={readySearch}
              onChange={(e) =>
                setReadySearch(e.target.value.replace(/\D/g, "").slice(0, 3))
              }
              className="w-full rounded-2xl border border-white/8 bg-[#0F1218] px-4 py-2.5 text-sm text-white outline-none transition placeholder:text-white/25 focus:border-emerald-400/35"
            />
          </div>
        </div>

        <div className="flex flex-col gap-3 overflow-y-auto pr-1">
          {filteredReady.length === 0 ? (
            <div className="rounded-2xl border border-white/5 bg-[#0F1218] px-4 py-10 text-center">
              <p className="text-sm font-medium text-white/45">
                {readySearch ? "No matching ready orders" : "Nothing ready yet"}
              </p>

              <p className="mt-1 text-xs text-white/25">
                {readySearch
                  ? "Try the 3-digit order number."
                  : "Ready items appear grouped by guest."}
              </p>
            </div>
          ) : (
            filteredReady.map((group) => {
              const isUpdating = group.requestIds.some((id) =>
                updatingIds.includes(id)
              );

              const uniqueItemLines = group.requests.reduce<
                Record<string, number>
              >((acc, request) => {
                const key = request.itemName.trim();
                acc[key] = (acc[key] ?? 0) + (request.quantity ?? 1);
                return acc;
              }, {});

              const itemEntries = Object.entries(uniqueItemLines);
              const orderNumber = getPrimaryOrderNumber(group.requests);
              const buttonDisabled = isUpdating || actionsDisabled;

              return (
                <div
                  key={group.groupKey}
                  className={`rounded-2xl border bg-[#0F1218] p-4 transition duration-200 hover:border-white/12 ${
                    isUpdating
                      ? "border-[#8B5CFF]/28 bg-[#151022] shadow-[0_0_0_1px_rgba(139,92,255,0.12),0_0_24px_rgba(139,92,255,0.08)]"
                      : "border-white/6"
                  } ${glowMap.ready}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      {typeof orderNumber === "number" && (
                        <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold tracking-[0.08em] text-emerald-200">
                          ORDER #{orderNumber}
                        </span>
                      )}

                      <p className="mt-2 truncate text-lg font-semibold text-white">
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

                        {isUpdating ? (
                          <span className="rounded-full border border-[#8B5CFF]/25 bg-[#8B5CFF]/12 px-2.5 py-1 text-xs font-medium text-[#D7C7FF]">
                            Completing pickup
                          </span>
                        ) : null}

                        {actionsDisabled ? (
                          <span className="rounded-full border border-yellow-400/20 bg-yellow-500/10 px-2.5 py-1 text-xs font-medium text-yellow-300">
                            Actions paused
                          </span>
                        ) : null}
                      </div>
                    </div>

                    <span className="shrink-0 rounded-full border border-emerald-400/20 bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-300">
                      Ready Now
                    </span>
                  </div>

                  <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/5">
                    <div
                      className={`h-full rounded-full ${accentBarMap.ready}`}
                    />
                  </div>

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

                  {actionsDisabled && reliabilityMessage ? (
                    <p className="mt-3 text-xs leading-5 text-yellow-200/60">
                      {reliabilityMessage}
                    </p>
                  ) : null}

                  <div className="mt-4">
                    <button
                      onClick={() => onCompletePickup(group.requestIds)}
                      disabled={buttonDisabled}
                      className="w-full rounded-full bg-emerald-400 px-4 py-3 text-sm font-medium text-black transition hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
                    >
                      {isUpdating
                        ? "Completing pickup..."
                        : actionsDisabled
                        ? "Waiting for live sync"
                        : "Complete Pickup"}
                    </button>
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
    pending.length === 0 && preparing.length === 0 && ready.length === 0;

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
      {renderReadyColumn(filteredReady)}
    </div>
  );
}