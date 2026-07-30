import OrderServiceModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const ORDER_MODULE = "orderService"

export default Module(ORDER_MODULE, {
  service: OrderServiceModuleService,
})
