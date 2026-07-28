import type { ComponentType } from 'react'
import { template as applicationNotification } from './application-notification'
import { template as paymentLink } from './payment-link'
import { template as applicationDenial } from './application-denial'

export interface TemplateEntry {
  component: ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  displayName?: string
  previewData?: Record<string, any>
  /** Fixed recipient — overrides caller-provided recipientEmail when set. */
  to?: string
}

export const TEMPLATES: Record<string, TemplateEntry> = {
  'application-notification': applicationNotification,
  'payment-link': paymentLink,
  'application-denial': applicationDenial,
}

