import ProductCloudModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const PRODUCT_CLOUD_MODULE = "productCloud"

export default Module(PRODUCT_CLOUD_MODULE, {
  service: ProductCloudModuleService,
})
