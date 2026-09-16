import MfaModuleService from "./service"
import { Module } from "@medusajs/framework/utils"

export const MFA_MODULE = "mfa"

export default Module(MFA_MODULE, {
  service: MfaModuleService,
})
