import { MedusaService } from "@medusajs/framework/utils"
import {
  ProductFamily,
  Product,
  ProductVersion,
  ProductVariant,
  Identifier,
  Category,
  ProductCategory,
  AttributeDefinition,
  AttributeValue,
  OwnershipRecord,
  Claim,
  Dispute,
  MatchCandidate,
  MergeRecord,
  SplitRecord,
} from "./models"

/**
 * Product Cloud-module — Blueprint `11-medusa-architecture.md` §3 + ADR-0008.
 * Deel B (exclusief B.13 ModerationCase, B.14 ProductOrigin).
 */
class ProductCloudModuleService extends MedusaService({
  ProductFamily,
  Product,
  ProductVersion,
  ProductVariant,
  Identifier,
  Category,
  ProductCategory,
  AttributeDefinition,
  AttributeValue,
  OwnershipRecord,
  Claim,
  Dispute,
  MatchCandidate,
  MergeRecord,
  SplitRecord,
}) {}

export default ProductCloudModuleService
