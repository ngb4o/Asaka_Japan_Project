"use client";

import { useEffect, useRef } from "react";

export type CrmEntity =
  | "orders"
  | "leads"
  | "dealers"
  | "trips"
  | "receivables"
  | "inventory"
  | "products"
  | "all";

const EVENT_NAME = "crm:data-changed";

type CrmDataChangedDetail = {
  entities: CrmEntity[];
  toolName?: string;
};

export function emitCrmDataChanged(
  entities: CrmEntity | CrmEntity[],
  meta?: { toolName?: string }
) {
  if (typeof window === "undefined") return;
  const list = Array.isArray(entities) ? entities : [entities];
  window.dispatchEvent(
    new CustomEvent<CrmDataChangedDetail>(EVENT_NAME, {
      detail: { entities: list, toolName: meta?.toolName },
    })
  );
}

/** Map chatbot write tools → entities to refresh. */
export function entitiesForChatTool(toolName?: string): CrmEntity[] {
  switch (toolName) {
    case "update_order_status":
      return ["orders"];
    case "record_order_payment":
      return ["orders", "receivables"];
    case "update_lead_status":
    case "create_lead":
      return ["leads"];
    case "create_dealer":
      return ["dealers"];
    case "create_product":
      return ["products", "inventory"];
    case "add_trip_expense":
      return ["trips"];
    default:
      return ["all"];
  }
}

/**
 * Refresh list/detail when CRM data changes (e.g. chatbot confirm).
 */
export function useCrmDataRefresh(
  entities: CrmEntity[],
  onRefresh: () => void | Promise<void>
) {
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;
  const entitiesKey = entities.slice().sort().join(",");

  useEffect(() => {
    const watched = entitiesKey.split(",").filter(Boolean) as CrmEntity[];

    const handler = (event: Event) => {
      const detail = (event as CustomEvent<CrmDataChangedDetail>).detail;
      const changed = detail?.entities?.length ? detail.entities : (["all"] as CrmEntity[]);
      const hit =
        changed.includes("all") ||
        watched.includes("all") ||
        watched.some((entity) => changed.includes(entity));
      if (!hit) return;
      void onRefreshRef.current();
    };

    window.addEventListener(EVENT_NAME, handler);
    return () => window.removeEventListener(EVENT_NAME, handler);
  }, [entitiesKey]);
}
