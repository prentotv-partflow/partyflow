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

type OrderGroupedCard = {
  groupKey: string;
  guestName: string;
  orderNumber?: number;
  sectionId: string;
  status: "pending" | "preparing";
  totalQuantity: number;
  orderCount: number;
  requestIds: string[];
  requests: GroupedRequestCard["requests"];
  itemLines: {
    itemName: string;
    quantity: number;
  }[];
  latestCreatedAt?: GroupedRequestCard["latestCreatedAt"];
  queueAgeLevel?: GroupedRequestCard["queueAgeLevel"];
  queueAgeLabel?: GroupedRequestCard["queueAgeLabel"];
};

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

function getTimestampMs(
  value?: {
    seconds?: number;
    nanoseconds?: number;
    toMillis?: () => number;
  } | null
) {
  if (!value) return 0;

  if (typeof value.toMillis === "function") {
    return value.toMillis();
  }

  if (typeof value.seconds === "number") {
    const nanos =
      typeof value.nanoseconds === "number" ? value.nanoseconds : 0;
    return value.seconds * 1000 + Math.floor(nanos / 1_000_000);
  }

  return 0;
}

function getColumnSummary(type: ColumnType, count: number) {
  switch (type) {
    case "pending":
      return count === 0
        ? "No incoming requests"
        : `${count} ${count === 1 ? "request" : "requests"} waiting`;

    case "preparing":
      return count === 0
        ? "No requests in service"
        : `${count} ${count === 1 ? "request" : "requests"} in service`;

    case "ready":
      return count === 0
        ? "Nothing out for delivery"
        : `${count} ${count === 1 ? "delivery" : "deliveries"} active`;

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

function getPrimarySectionId(requests: { sectionId?: string }[]) {
  const found = requests.find((request) => request.sectionId?.trim());

  return found?.sectionId?.trim() || "main";
}

function formatSectionLabel(sectionId: string) {
  return sectionId
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function getRequestMetaLabel(orderNumber: number | undefined, sectionId: string) {
  const sectionLabel = formatSectionLabel(sectionId);

  if (typeof orderNumber === "number") {
    return `#${orderNumber} · ${sectionLabel}`;
  }

  return sectionLabel;
}

function groupByOrderFromItemGroups(
  groups: GroupedRequestCard[],
  status: "pending" | "preparing"
): OrderGroupedCard[] {
  const orderMap = new Map<
    string,
    {
      groupKey: string;
      guestName: string;
      orderNumber?: number;
      sectionId: string;
      status: "pending" | "preparing";
      totalQuantity: number;
      orderCount: number;
      requestIds: string[];
      requests: GroupedRequestCard["requests"];
      itemMap: Map<string, { itemName: string; quantity: number }>;
      latestCreatedAt?: GroupedRequestCard["latestCreatedAt"];
      queueAgeLevel?: GroupedRequestCard["queueAgeLevel"];
      queueAgeLabel?: GroupedRequestCard["queueAgeLabel"];
    }
  >();

  groups.forEach((group) => {
    group.requests.forEach((request) => {
      const orderKey =
        request.orderGroupId ||
        (typeof request.orderNumber === "number"
          ? `order-number-${request.orderNumber}`
          : `request-${request.id}`);

      const groupKey = `${status}__order__${orderKey}`;
      const normalizedGuestName =
        (request.guestName || "Guest").trim() || "Guest";
      const requestQuantity = Math.max(Number(request.quantity ?? 1), 1);
      const requestCreatedAt = getTimestampMs(request.createdAt);

      if (!orderMap.has(groupKey)) {
        orderMap.set(groupKey, {
          groupKey,
          guestName: normalizedGuestName,
          orderNumber: request.orderNumber,
          sectionId: request.sectionId?.trim() || "main",
          status,
          totalQuantity: 0,
          orderCount: 0,
          requestIds: [],
          requests: [],
          itemMap: new Map(),
          latestCreatedAt: request.createdAt,
          queueAgeLevel: group.queueAgeLevel,
          queueAgeLabel: group.queueAgeLabel,
        });
      }

      const existing = orderMap.get(groupKey);

      if (!existing) return;

      if (
        typeof existing.orderNumber !== "number" &&
        typeof request.orderNumber === "number"
      ) {
        existing.orderNumber = request.orderNumber;
      }

      if (existing.sectionId === "main" && request.sectionId?.trim()) {
        existing.sectionId = request.sectionId.trim();
      }

      existing.requestIds.push(request.id);
      existing.requests.push(request);
      existing.totalQuantity += requestQuantity;
      existing.orderCount += 1;

      const itemKey = request.itemName.trim().toLowerCase();
      const existingItem = existing.itemMap.get(itemKey);

      if (existingItem) {
        existingItem.quantity += requestQuantity;
      } else {
        existing.itemMap.set(itemKey, {
          itemName: request.itemName.trim(),
          quantity: requestQuantity,
        });
      }

      const latestCreatedAt = getTimestampMs(existing.latestCreatedAt);

      if (requestCreatedAt >= latestCreatedAt) {
        existing.latestCreatedAt = request.createdAt;
      }

      const currentAgePriority =
        existing.queueAgeLevel === "attention"
          ? 2
          : existing.queueAgeLevel === "waiting"
          ? 1
          : 0;

      const nextAgePriority =
        group.queueAgeLevel === "attention"
          ? 2
          : group.queueAgeLevel === "waiting"
          ? 1
          : 0;

      if (nextAgePriority > currentAgePriority) {
        existing.queueAgeLevel = group.queueAgeLevel;
        existing.queueAgeLabel = group.queueAgeLabel;
      }
    });
  });

  return Array.from(orderMap.values())
    .map((group) => ({
      groupKey: group.groupKey,
      guestName: group.guestName,
      orderNumber: group.orderNumber,
      sectionId: group.sectionId,
      status: group.status,
      totalQuantity: group.totalQuantity,
      orderCount: group.orderCount,
      requestIds: group.requestIds,
      requests: group.requests,
      itemLines: Array.from(group.itemMap.values()),
      latestCreatedAt: group.latestCreatedAt,
      queueAgeLevel: group.queueAgeLevel,
      queueAgeLabel: group.queueAgeLabel,
    }))
    .sort((a, b) => {
      return getTimestampMs(b.latestCreatedAt) - getTimestampMs(a.latestCreatedAt);
    });
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

  const pendingOrders = useMemo(() => {
    return groupByOrderFromItemGroups(pending, "pending");
  }, [pending]);

  const preparingOrders = useMemo(() => {
    return groupByOrderFromItemGroups(preparing, "preparing");
  }, [preparing]);

  const filteredReady = useMemo(() => {
    const query = readySearch.trim();

    if (!query) return ready;

    return ready.filter((group) => {
      const orderNumber = getPrimaryOrderNumber(group.requests);

      if (typeof orderNumber !== "number") return false;

      return String(orderNumber).includes(query);
    });
  }, [ready, readySearch]);

  const renderOrderColumn = (
    title: string,
    items: OrderGroupedCard[],
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
                  Active service
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
              <p className="text-sm font-medium text-white/45">No requests</p>
              <p className="mt-1 text-xs text-white/25">
                Waiting for service activity...
              </p>
            </div>
          ) : (
            items.map((group) => {
              const isUpdating = group.requestIds.some((id) =>
                updatingIds.includes(id)
              );

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
              const metaLabel = getRequestMetaLabel(
                group.orderNumber,
                group.sectionId
              );

              return (
                <div
                  key={group.groupKey}
                  className={`rounded-2xl border bg-[#0F1218] p-4 transition duration-200 hover:border-white/12 ${activeBatchClass} ${glowMap[type]}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] font-semibold tracking-[0.08em] text-white/72">
                          {metaLabel}
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
                            Updating
                          </span>
                        ) : null}

                        {actionsDisabled ? (
                          <span className="rounded-full border border-yellow-400/20 bg-yellow-500/10 px-2.5 py-1 text-xs font-medium text-yellow-300">
                            Paused
                          </span>
                        ) : null}
                      </div>

                      <p className="mt-3 truncate text-xl font-semibold leading-tight text-white">
                        {group.guestName}
                      </p>
                    </div>

                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium capitalize ${badgeMap[type]}`}
                    >
                      {isPending ? "Requested" : "In Service"}
                    </span>
                  </div>

                  <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/5">
                    <div
                      className={`h-full rounded-full ${accentBarMap[type]}`}
                    />
                  </div>

                  <div className="mt-4 space-y-2 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-3">
                    {group.itemLines.map((item) => (
                      <div
                        key={item.itemName}
                        className="flex items-center justify-between gap-3 text-sm"
                      >
                        <span className="truncate text-gray-100">
                          {item.itemName}
                        </span>

                        <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium text-white/75">
                          x{item.quantity}
                        </span>
                      </div>
                    ))}
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
                          ? "Starting..."
                          : actionsDisabled
                          ? "Waiting for live sync"
                          : "Start"}
                      </button>
                    ) : (
                      <button
                        onClick={() => onMarkReady(group.requestIds)}
                        disabled={buttonDisabled}
                        className="w-full rounded-full bg-[#508CFF] px-4 py-3 text-sm font-medium text-white transition hover:opacity-90 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
                      >
                        {isUpdating
                          ? "Sending..."
                          : actionsDisabled
                          ? "Waiting for live sync"
                          : "Out for Delivery"}
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
                <h2 className="text-base font-semibold text-white">
                  Out for Delivery
                </h2>

                {items.length > 0 && (
                  <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.12em] text-emerald-300">
                    Delivery view
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
              placeholder="Find request #"
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
                {readySearch
                  ? "No matching deliveries"
                  : "Nothing out for delivery yet"}
              </p>

              <p className="mt-1 text-xs text-white/25">
                {readySearch
                  ? "Try the 3-digit request number."
                  : "Delivery items appear grouped by guest."}
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
              const sectionId = getPrimarySectionId(group.requests);
              const metaLabel = getRequestMetaLabel(orderNumber, sectionId);
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
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold tracking-[0.08em] text-emerald-200">
                          {metaLabel}
                        </span>

                        {isUpdating ? (
                          <span className="rounded-full border border-[#8B5CFF]/25 bg-[#8B5CFF]/12 px-2.5 py-1 text-xs font-medium text-[#D7C7FF]">
                            Updating
                          </span>
                        ) : null}

                        {actionsDisabled ? (
                          <span className="rounded-full border border-yellow-400/20 bg-yellow-500/10 px-2.5 py-1 text-xs font-medium text-yellow-300">
                            Paused
                          </span>
                        ) : null}
                      </div>

                      <p className="mt-3 truncate text-xl font-semibold leading-tight text-white">
                        {group.guestName}
                      </p>
                    </div>

                    <span className="shrink-0 rounded-full border border-emerald-400/20 bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-300">
                      Out
                    </span>
                  </div>

                  <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/5">
                    <div
                      className={`h-full rounded-full ${accentBarMap.ready}`}
                    />
                  </div>

                  <div className="mt-4 space-y-2 rounded-xl border border-white/5 bg-white/[0.03] px-3 py-3">
                    {itemEntries.map(([itemName, quantity]) => (
                      <div
                        key={itemName}
                        className="flex items-center justify-between gap-3 text-sm"
                      >
                        <span className="truncate text-gray-100">
                          {itemName}
                        </span>

                        <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-xs font-medium text-white/75">
                          x{quantity}
                        </span>
                      </div>
                    ))}
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
                        ? "Marking..."
                        : actionsDisabled
                        ? "Waiting for live sync"
                        : "Mark Delivered"}
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
        <p className="text-base font-medium text-white/55">No requests yet</p>
        <p className="mt-2 text-sm text-white/30">
          Waiting for guests to send service requests.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {renderOrderColumn("Incoming Requests", pendingOrders, "pending")}
      {renderOrderColumn("In Service", preparingOrders, "preparing")}
      {renderReadyColumn(filteredReady)}
    </div>
  );
}