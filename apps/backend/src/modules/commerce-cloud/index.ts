import CommerceCloudModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const COMMERCE_CLOUD_MODULE = "commerceCloud"

export default Module(COMMERCE_CLOUD_MODULE, {
  service: CommerceCloudModuleService,
})
