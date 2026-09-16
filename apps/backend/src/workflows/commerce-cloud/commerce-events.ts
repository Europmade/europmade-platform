import { Modules } from "@medusajs/framework/utils"
import type { MedusaContainer } from "@medusajs/framework/types"

/** Domeinevents Commerce Cloud — Blueprint `04-event-model.md` §2.2. */
export async function emitCommerceEvent(
  container: MedusaContainer,
  name:
    | "OfferCreated"
    | "OfferWithdrawn"
    | "InventoryChanged"
    | "PriceChanged"
    | "OfferMetaChanged",
  data: Record<string, unknown>
): Promise<void> {
  const eventBus = container.resolve(Modules.EVENT_BUS)
  await eventBus.emit({ name, data })
}
