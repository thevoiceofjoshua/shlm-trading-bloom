import * as React from 'react'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  fullName?: string
  tier?: string
  amount?: string
  invoiceNumber?: string
  paymentDate?: string
  paymentMethod?: string
  dashboardUrl?: string
  billedTo?: string
}

const Email = ({
  fullName = 'there',
  tier = 'SHLM Mentorship',
  amount = '$1,499.00',
  invoiceNumber = 'SHLM-0000',
  paymentDate = '',
  paymentMethod = 'Card',
  dashboardUrl = 'https://shlmtrdng.com/dashboard',
  billedTo = '',
}: Props) => {
  const firstName = fullName.split(' ')[0]
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Payment confirmed — your SHLM Mentorship receipt and access details</Preview>
      <Body style={main}>
        <Container style={shell}>
          <Section style={hero}>
            <Text style={watermark}>SHLM</Text>
            <Text style={wordmark}>S H L M</Text>
            <Text style={heroCaption}>Breakout strategy mentorship</Text>
          </Section>

          <Section style={panel}>
            <Section style={{ textAlign: 'center' as const }}>
              <Text style={pill}>&#9679;&nbsp;&nbsp;PAYMENT CONFIRMED</Text>
            </Section>

            <Heading style={title}>Enrollment confirmed.</Heading>

            <Text style={body}>Hi {firstName},</Text>
            <Text style={body}>
              Your payment has been received and your place in the {tier} is secured. A summary of your transaction is
              below — keep this email for your records.
            </Text>

            <Section style={innerCard}>
              <Text style={cardKicker}>
                RECEIPT&nbsp;&nbsp;<span style={accent}>TOTAL PAID</span>
              </Text>
              <Text style={price}>{amount}</Text>
              <Text style={divider}>&nbsp;</Text>
              <Row label="Invoice" value={invoiceNumber} />
              {paymentDate ? <Row label="Date" value={paymentDate} /> : null}
              <Row label="Program" value={tier} />
              <Row label="Payment method" value={paymentMethod} />
              {billedTo ? <Row label="Billed to" value={billedTo} /> : null}
              <Row label="Status" value="Paid in full" />
            </Section>

            <Section style={{ textAlign: 'center' as const }}>
              <Button href={dashboardUrl} style={cta}>
                Open Member Dashboard&nbsp;&nbsp;&#8599;
              </Button>
            </Section>

            <Section style={innerCard}>
              <Text style={cardKicker}>WHAT HAPPENS NEXT</Text>
              <Text style={arrowRow}><span style={arrow}>01</span>&nbsp;&nbsp;Your member dashboard and curriculum are unlocked</Text>
              <Text style={arrowRow}><span style={arrow}>02</span>&nbsp;&nbsp;Join the private community for daily breakdowns</Text>
              <Text style={arrowRow}><span style={arrow}>03</span>&nbsp;&nbsp;We schedule onboarding and build your trading plan</Text>
              <Text style={cardNote}>
                Questions about this transaction? Reply to this email and Joshua responds directly.
              </Text>
            </Section>
          </Section>

          <Section style={footerBar}>
            <Text style={footerText}>SHLM Trading &middot; Breakout strategy mentorship</Text>
            <Text style={footerText}>
              <a href="https://shlmtrdng.com" style={footerLink}>shlmtrdng.com</a>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  )
}

const Row = ({ label, value }: { label: string; value: string }) => (
  <Section style={{ marginBottom: '10px' }}>
    <Text style={rowLabel}>{label}</Text>
    <Text style={rowValue}>{value}</Text>
  </Section>
)

export const template = {
  component: Email,
  subject: (data: Record<string, any>) =>
    `Payment received — your SHLM Mentorship receipt${data.invoiceNumber ? ` (${data.invoiceNumber})` : ''}`,
  displayName: 'Payment receipt (client)',
  previewData: {
    fullName: 'Jane Doe',
    tier: 'SHLM Mentorship',
    amount: '$1,499.00',
    invoiceNumber: 'SHLM-4821',
    paymentDate: 'July 31, 2026',
    paymentMethod: 'Visa ending 4242',
    billedTo: 'jane@example.com',
    dashboardUrl: 'https://shlmtrdng.com/dashboard',
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

const title = { fontSize: '40px', fontWeight: 700, letterSpacing: '-0.035em', color: '#ffffff', margin: '0 0 22px', lineHeight: '1.06', textAlign: 'center' as const }
const body = { fontSize: '15px', color: '#a8a8a8', margin: '0 0 15px', lineHeight: '1.75' }

const innerCard = { backgroundColor: '#111111', border: '1px solid #1f1f1f', borderRadius: '14px', padding: '24px 22px', margin: '26px 0' }
const cardKicker = { fontSize: '10px', fontWeight: 700, letterSpacing: '0.2em', color: '#6f6f6f', margin: '0 0 12px' }
const accent = { color: '#ffffff' }
const price = { fontSize: '38px', fontWeight: 700, letterSpacing: '-0.03em', color: '#ffffff', margin: '0', lineHeight: '1' }
const divider = { height: '1px', backgroundColor: '#1f1f1f', margin: '20px 0', fontSize: '1px', lineHeight: '1px' }
const rowLabel = { fontSize: '10px', fontWeight: 700, letterSpacing: '0.18em', color: '#6f6f6f', margin: '0 0 3px', textTransform: 'uppercase' as const }
const rowValue = { fontSize: '15px', color: '#e6e6e6', margin: '0', lineHeight: '1.5' }
const arrowRow = { fontSize: '14px', color: '#cfcfcf', margin: '0 0 10px', lineHeight: '1.6' }
const arrow = { color: '#6f6f6f', fontWeight: 700 }
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
