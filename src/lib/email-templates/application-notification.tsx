import * as React from 'react'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from '@react-email/components'
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
    <Preview>{`${fullName} · ${tier} · call ${scheduledAtLA || scheduledAt}`}</Preview>
    <Body style={main}>
      <Container style={shell}>
        {/* Hero with watermark monogram */}
        <Section style={hero}>
          <Text style={watermark}>SHLM</Text>
          <Text style={wordmark}>S H L M</Text>
          <Text style={heroCaption}>Breakout strategy mentorship</Text>
        </Section>

        <Section style={panel}>
          <Section style={{ textAlign: 'center' as const }}>
            <Text style={pill}>&#9679;&nbsp;&nbsp;NEW APPLICATION</Text>
          </Section>

          <Heading style={title}>{fullName}</Heading>
          <Text style={subtitle}>
            A new applicant has booked a client call. Review and approve or deny from the admin portal.
          </Text>

          {/* Applicant card */}
          <Section style={innerCard}>
            <Text style={cardKicker}>APPLICANT</Text>
            <Row label="Name" value={fullName} />
            <Row label="Email" value={email || '—'} />
            <Row label="Phone" value={phone || '—'} />
            <Row label="Entry level" value={tier || '—'} />
          </Section>

          {/* Call card */}
          <Section style={innerCard}>
            <Text style={cardKicker}>SCHEDULED CALL</Text>
            <Row label="Los Angeles time" value={scheduledAtLA || scheduledAt || '—'} highlight />
            <Row label={`Applicant local (${timezone || 'unknown'})`} value={scheduledAt || '—'} />
          </Section>

          <Section style={{ textAlign: 'center' as const }}>
            <Button href="https://shlmtrdng.com/admin" style={cta}>
              Review in Admin Portal&nbsp;&nbsp;&#8599;
            </Button>
          </Section>

          {/* Responses card */}
          <Section style={innerCard}>
            <Text style={cardKicker}>EXPERIENCE</Text>
            <Text style={bodyText}>{experience || '—'}</Text>
            <Text style={divider}>&nbsp;</Text>
            <Text style={cardKicker}>GOALS</Text>
            <Text style={bodyText}>{goals || '—'}</Text>
            <Text style={cardNote}>Reply to this email to respond to the applicant directly.</Text>
          </Section>
        </Section>

        <Section style={footerBar}>
          <Text style={footerText}>SHLM Trading &middot; Admin notification</Text>
          <Text style={footerText}>
            <a href="https://shlmtrdng.com" style={footerLink}>shlmtrdng.com</a>
          </Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

const Row = ({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) => (
  <Section style={{ marginBottom: '12px' }}>
    <Text style={rowLabel}>{label}</Text>
    <Text style={highlight ? rowValueStrong : rowValue}>{value}</Text>
  </Section>
)

export const template = {
  component: Email,
  subject: (data: Record<string, any>) =>
    `🔔 New applicant: ${data.fullName ?? 'Applicant'}${data.tier ? ` — ${data.tier}` : ''}`,
  displayName: 'Application notification (admin)',
  previewData: {
    fullName: 'Jane Doe',
    email: 'jane@example.com',
    phone: '+1 555-123-4567',
    tier: 'Intermediate',
    experience: '2 years trading futures',
    goals: 'Consistency and risk management',
    scheduledAt: 'Wednesday, August 5, 2026 at 5:00 PM',
    scheduledAtLA: 'Wednesday, August 5, 2026 at 2:00 PM',
    timezone: 'America/New_York',
  },
} satisfies TemplateEntry

/* ---------- styles ---------- */
const main = { backgroundColor: '#ffffff', fontFamily: 'Helvetica, Arial, sans-serif', margin: '0', padding: '0' }
const shell = { maxWidth: '600px', margin: '0 auto', backgroundColor: '#0a0a0a', padding: '0' }

const hero = {
  backgroundColor: '#000000',
  backgroundImage: 'linear-gradient(160deg, #1a1a1a 0%, #0d0d0d 45%, #000000 100%)',
  padding: '46px 40px 40px',
  textAlign: 'center' as const,
  borderBottom: '1px solid #1f1f1f',
}
const watermark = {
  margin: '0 0 -34px',
  fontSize: '86px',
  fontWeight: 700,
  letterSpacing: '0.08em',
  color: '#141414',
  lineHeight: '1',
}
const wordmark = { margin: '0', fontSize: '26px', fontWeight: 700, letterSpacing: '0.36em', color: '#ffffff' }
const heroCaption = { margin: '16px 0 0', fontSize: '10px', letterSpacing: '0.26em', textTransform: 'uppercase' as const, color: '#7a7a7a' }

const panel = { backgroundColor: '#0a0a0a', padding: '34px 32px 8px' }

const pill = {
  display: 'inline-block',
  border: '1px solid #2a2a2a',
  borderRadius: '999px',
  padding: '9px 20px',
  fontSize: '10px',
  fontWeight: 700,
  letterSpacing: '0.2em',
  color: '#d4d4d4',
  margin: '0 0 22px',
}

const title = { fontSize: '36px', fontWeight: 700, letterSpacing: '-0.035em', color: '#ffffff', margin: '0 0 16px', lineHeight: '1.08', textAlign: 'center' as const }
const subtitle = { fontSize: '15px', color: '#a8a8a8', margin: '0', lineHeight: '1.75', textAlign: 'center' as const }

const innerCard = { backgroundColor: '#111111', border: '1px solid #1f1f1f', borderRadius: '14px', padding: '24px 22px', margin: '26px 0' }
const cardKicker = { fontSize: '10px', fontWeight: 700, letterSpacing: '0.2em', color: '#6f6f6f', margin: '0 0 14px' }
const rowLabel = { fontSize: '10px', letterSpacing: '0.16em', textTransform: 'uppercase' as const, color: '#6f6f6f', margin: '0 0 3px' }
const rowValue = { fontSize: '15px', color: '#cfcfcf', margin: '0', lineHeight: '1.5' }
const rowValueStrong = { fontSize: '17px', fontWeight: 700, color: '#ffffff', margin: '0', lineHeight: '1.45' }
const bodyText = { fontSize: '14px', color: '#cfcfcf', margin: '0', lineHeight: '1.7', whiteSpace: 'pre-wrap' as const }
const divider = { height: '1px', backgroundColor: '#1f1f1f', margin: '20px 0', fontSize: '1px', lineHeight: '1px' }
const cardNote = { fontSize: '12px', color: '#6f6f6f', margin: '16px 0 0', lineHeight: '1.6' }

const cta = {
  backgroundColor: '#ffffff',
  color: '#0a0a0a',
  fontSize: '13px',
  fontWeight: 700,
  letterSpacing: '0.1em',
  padding: '17px 34px',
  borderRadius: '999px',
  textDecoration: 'none',
  display: 'inline-block',
}

const footerBar = { backgroundColor: '#000000', borderTop: '1px solid #1f1f1f', padding: '24px 32px 30px', textAlign: 'center' as const }
const footerText = { fontSize: '11px', color: '#5f5f5f', margin: '0 0 4px', letterSpacing: '0.06em', lineHeight: '1.6' }
const footerLink = { color: '#9a9a9a', textDecoration: 'none' }
