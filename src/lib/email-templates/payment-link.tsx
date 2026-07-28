import * as React from 'react'
import { Body, Button, Container, Head, Heading, Html, Preview, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  fullName?: string
  tier?: string
  checkoutUrl?: string
  amount?: string
  promoCode?: string
  discountPercent?: string
}

const Email = ({
  fullName = 'there',
  tier = 'SHLM Mentorship',
  checkoutUrl = '#',
  amount = '$1,499.00',
  promoCode,
  discountPercent,
}: Props) => {
  const firstName = fullName.split(' ')[0]
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>Your SHLM mentorship invitation is ready — complete your enrollment</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={monogram}>SHLM</Text>
          </Section>

          <Section style={card}>
            <Heading style={h1}>You're invited.</Heading>
            <Text style={lead}>
              Hi {firstName}, your application has been approved. You’re invited to join {tier}.
            </Text>

            <Text style={body}>
              Spots are limited and filled on a first-come basis. Complete your enrollment below to secure your place in the next cohort.
            </Text>

            {promoCode && discountPercent && (
              <Section style={promoBadge}>
                <Text style={promoText}>
                  {discountPercent}% OFF APPLIED — CODE {promoCode}
                </Text>
                <Text style={priceWhite}>{amount}</Text>
                <Text style={originalPriceWhite}>Discounted price</Text>
              </Section>
            )}

            {!promoCode && (
              <Section style={priceBlock}>
                <Text style={price}>{amount}</Text>
                <Text style={originalPrice}>Total due today</Text>
              </Section>
            )}

            <Button href={checkoutUrl} style={cta}>
              Complete enrollment
            </Button>

            <Text style={finePrint}>
              This secure link is personalized for you. If you have questions, reply to this email and Joshua will respond directly.
            </Text>
          </Section>

          <Text style={footer}>
            SHLM Trading — Breakout strategy mentorship
            <br />
            <a href="https://shlmtrdng.com" style={footerLink}>shlmtrdng.com</a>
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: Email,
  subject: 'Your SHLM Mentorship invitation is ready',
  displayName: 'Payment link (applicant)',
  previewData: {
    fullName: 'Jane Doe',
    tier: 'SHLM Mentorship',
    checkoutUrl: 'https://shlmtrdng.com/success?tier=mentorship&session_id=preview',
    amount: '$1,199.20',
    promoCode: '1MILL',
    discountPercent: '20',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Helvetica, Arial, sans-serif' }
const container = { padding: '40px 24px', maxWidth: '600px', margin: '0 auto' }
const header = { textAlign: 'center' as const, marginBottom: '32px' }
const monogram = { fontSize: '28px', fontWeight: 700, letterSpacing: '0.18em', color: '#0a0a0a', margin: '0' }
const card = { border: '1px solid #0a0a0a', borderRadius: '0px', padding: '40px', backgroundColor: '#ffffff' }
const h1 = { fontSize: '32px', fontWeight: 600, letterSpacing: '-0.02em', color: '#0a0a0a', margin: '0 0 16px', lineHeight: '1.1' }
const lead = { fontSize: '16px', color: '#171717', margin: '0 0 20px', lineHeight: '1.6' }
const body = { fontSize: '15px', color: '#404040', margin: '0 0 28px', lineHeight: '1.6' }
const promoBadge = { backgroundColor: '#0a0a0a', padding: '24px', textAlign: 'center' as const, marginBottom: '28px' }
const promoText = { fontSize: '11px', fontWeight: 600, letterSpacing: '0.15em', color: '#ffffff', margin: '0 0 8px', textTransform: 'uppercase' as const }
const priceBlock = { border: '1px solid #e5e5e5', padding: '24px', textAlign: 'center' as const, marginBottom: '28px' }
const price = { fontSize: '36px', fontWeight: 600, letterSpacing: '-0.02em', color: '#0a0a0a', margin: '0' }
const originalPrice = { fontSize: '12px', color: '#737373', margin: '6px 0 0', textTransform: 'uppercase' as const, letterSpacing: '0.1em' }
const cta = { backgroundColor: '#0a0a0a', color: '#ffffff', fontSize: '14px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' as const, padding: '18px 32px', textDecoration: 'none', display: 'inline-block', width: '100%', textAlign: 'center' as const, boxSizing: 'border-box' as const }
const finePrint = { fontSize: '12px', color: '#a3a3a3', margin: '24px 0 0', lineHeight: '1.5', textAlign: 'center' as const }
const footer = { fontSize: '12px', color: '#a3a3a3', textAlign: 'center' as const, marginTop: '32px', lineHeight: '1.6' }
const footerLink = { color: '#737373', textDecoration: 'none' }
