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
  ProductMedia,
  ChangeProposal,
} from "./models"

/**
 * Product Cloud-module — Blueprint `11-medusa-architecture.md` §3 + ADR-0008.
 * Deel B (+ B.15 media) + ADR-0009 ChangeProposal.
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
  ProductMedia,
  ChangeProposal,
}) {}

export default ProductCloudModuleService
