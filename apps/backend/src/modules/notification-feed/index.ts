import NotificationFeedModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const NOTIFICATION_FEED_MODULE = "notificationFeed"

export default Module(NOTIFICATION_FEED_MODULE, {
  service: NotificationFeedModuleService,
})
