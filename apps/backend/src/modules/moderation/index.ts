import ModerationModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const MODERATION_MODULE = "moderation"

export default Module(MODERATION_MODULE, {
  service: ModerationModuleService,
})
