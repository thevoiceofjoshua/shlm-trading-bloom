import * as React from 'react'
import { Body, Head, Html, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

// Deliberately bare: delivered to a carrier email-to-SMS gateway, which truncates long texts.
const Email = ({ text = 'SHLM: new Weekly Behavior event' }: { text?: string }) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Body style={{ backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }}>
      <Text style={{ margin: 0 }}>{text}</Text>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'SHLM',
  displayName: 'Weekly Behavior text alert',
  previewData: { text: 'SHLM: Monday -> FAST (live session read)' },
} satisfies TemplateEntry
