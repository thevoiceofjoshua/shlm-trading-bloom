import * as React from 'react'
import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  fullName?: string
  email?: string
  phone?: string
  tier?: string
  experience?: string
  goals?: string
  scheduledAt?: string
  scheduledAtLA?: string
  timezone?: string
}

const Email = ({
  fullName = 'New applicant',
  email = '',
  phone = '',
  tier = '',
  experience = '',
  goals = '',
  scheduledAt = '',
  scheduledAtLA = '',
  timezone = '',
}: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`New SHLM application — ${fullName} (${tier})`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>New SHLM Application</Heading>
        <Text style={lead}>
          You have a new client call scheduled. Details below.
        </Text>

        <Section style={card}>
          <Row label="Name" value={fullName} />
          <Row label="Email" value={email} />
          <Row label="Phone" value={phone || '—'} />
          <Row label="Tier" value={tier} />
          <Hr style={hr} />
          <Row label="Applicant timezone" value={timezone || '—'} />
          <Row label={`Scheduled call (${timezone || 'applicant local'})`} value={scheduledAt} />
          <Row label="Scheduled call (LA)" value={scheduledAtLA || scheduledAt} />
        </Section>

        <Section style={card}>
          <Text style={label}>Experience</Text>
          <Text style={body}>{experience || '—'}</Text>
          <Hr style={hr} />
          <Text style={label}>Goals</Text>
          <Text style={body}>{goals || '—'}</Text>
        </Section>

        <Text style={footer}>SHLM Trading — Admin notification</Text>
      </Container>
    </Body>
  </Html>
)

const Row = ({ label, value }: { label: string; value: string }) => (
  <div style={{ marginBottom: '8px' }}>
    <Text style={rowLabel}>{label}</Text>
    <Text style={rowValue}>{value}</Text>
  </div>
)

export const template = {
  component: Email,
  subject: (data: Record<string, any>) =>
    `New SHLM application — ${data.fullName ?? 'Applicant'} (${data.tier ?? ''})`,
  displayName: 'Application notification (admin)',
  previewData: {
    fullName: 'Jane Doe',
    email: 'jane@example.com',
    phone: '+1 555-123-4567',
    tier: 'Mentorship',
    experience: '2 years trading futures',
    goals: 'Consistency and risk management',
    scheduledAt: 'Wednesday, August 5, 2026 at 5:00 PM',
    scheduledAtLA: 'Wednesday, August 5, 2026 at 2:00 PM',
    timezone: 'America/New_York',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Helvetica, Arial, sans-serif' }
const container = { padding: '32px 24px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '24px', fontWeight: 600, color: '#0a0a0a', margin: '0 0 8px' }
const lead = { fontSize: '14px', color: '#525252', margin: '0 0 24px' }
const card = {
  border: '1px solid #e5e5e5',
  borderRadius: '12px',
  padding: '20px',
  marginBottom: '16px',
  backgroundColor: '#fafafa',
}
const rowLabel = { fontSize: '11px', textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: '#737373', margin: '0' }
const rowValue = { fontSize: '15px', color: '#0a0a0a', margin: '2px 0 0', fontWeight: 500 }
const label = { fontSize: '11px', textTransform: 'uppercase' as const, letterSpacing: '0.08em', color: '#737373', margin: '0 0 4px' }
const body = { fontSize: '14px', color: '#171717', margin: '0', lineHeight: '1.55' }
const hr = { borderColor: '#e5e5e5', margin: '12px 0' }
const footer = { fontSize: '12px', color: '#a3a3a3', textAlign: 'center' as const, marginTop: '24px' }
