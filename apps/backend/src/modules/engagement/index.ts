import { Module } from "@medusajs/framework/utils"
import EngagementModuleService from "./service"

export const ENGAGEMENT_MODULE = "engagement"

export default Module(ENGAGEMENT_MODULE, {
  service: EngagementModuleService,
})
