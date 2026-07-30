import * as React from 'react'
import { Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text } from '@react-email/components'
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
      <Preview>Your SHLM Mentorship invitation is ready — complete your enrollment</Preview>
      <Body style={main}>
        <Container style={outer}>
          {/* Hero panel */}
          <Section style={hero}>
            <Text style={heroGlow}>&nbsp;</Text>
            <Text style={monogram}>S H L M</Text>
            <Text style={heroRule}>&nbsp;</Text>
            <Text style={heroKicker}>Application approved</Text>
            <Heading style={heroTitle}>You&rsquo;re in.</Heading>
            <Text style={heroSub}>{tier}</Text>
          </Section>

          {/* Body panel */}
          <Section style={card}>
            <Text style={lead}>Hi {firstName},</Text>
            <Text style={body}>
              Congratulations — after reviewing your application, we&rsquo;d like to welcome you into the SHLM Mentorship.
              You showed the discipline and intent we look for in a trader we can actually move the needle for.
            </Text>
            <Text style={body}>
              Cohorts are kept intentionally small so every member gets direct, personal mentorship. Your seat is reserved
              on a first-come basis — complete your enrollment below to lock it in.
            </Text>

            {promoCode && discountPercent ? (
              <Section style={priceDark}>
                <Text style={promoText}>{discountPercent}% off applied &middot; code {promoCode}</Text>
                <Text style={priceWhite}>{amount}</Text>
                <Text style={priceCaptionLight}>Total due today</Text>
              </Section>
            ) : (
              <Section style={priceDark}>
                <Text style={priceWhite}>{amount}</Text>
                <Text style={priceCaptionLight}>Total due today</Text>
              </Section>
            )}

            <Section style={{ textAlign: 'center' as const }}>
              <Button href={checkoutUrl} style={cta}>
                Complete enrollment
              </Button>
            </Section>

            <Hr style={hr} />

            <Text style={whatsNext}>What happens next</Text>
            <Text style={step}><span style={stepNum}>01</span>&nbsp;&nbsp;Secure your seat through the link above.</Text>
            <Text style={step}><span style={stepNum}>02</span>&nbsp;&nbsp;Receive your private dashboard and community access.</Text>
            <Text style={step}><span style={stepNum}>03</span>&nbsp;&nbsp;We schedule your onboarding call and start building your plan.</Text>

            <Text style={finePrint}>
              This link is personalized for you. Questions? Reply to this email and Joshua will respond directly.
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

const main = { backgroundColor: '#ffffff', fontFamily: 'Helvetica, Arial, sans-serif', margin: '0', padding: '0' }
const outer = { padding: '32px 20px 48px', maxWidth: '600px', margin: '0 auto' }

const hero = {
  backgroundColor: '#0a0a0a',
  backgroundImage:
    'linear-gradient(135deg, #000000 0%, #101010 45%, #1c1c1c 70%, #0a0a0a 100%)',
  padding: '52px 40px 44px',
  textAlign: 'center' as const,
}
const heroGlow = {
  margin: '0 auto 28px',
  height: '2px',
  width: '64px',
  backgroundImage: 'linear-gradient(90deg, rgba(255,255,255,0) 0%, #ffffff 50%, rgba(255,255,255,0) 100%)',
  fontSize: '1px',
  lineHeight: '2px',
}
const monogram = { fontSize: '22px', fontWeight: 700, letterSpacing: '0.34em', color: '#ffffff', margin: '0' }
const heroRule = {
  margin: '22px auto',
  height: '1px',
  width: '40px',
  backgroundColor: '#3a3a3a',
  fontSize: '1px',
  lineHeight: '1px',
}
const heroKicker = {
  fontSize: '10px',
  letterSpacing: '0.28em',
  textTransform: 'uppercase' as const,
  color: '#9c9c9c',
  margin: '0 0 12px',
}
const heroTitle = { fontSize: '42px', fontWeight: 600, letterSpacing: '-0.03em', color: '#ffffff', margin: '0', lineHeight: '1.05' }
const heroSub = { fontSize: '13px', letterSpacing: '0.16em', textTransform: 'uppercase' as const, color: '#bdbdbd', margin: '14px 0 0' }

const card = { border: '1px solid #e8e8e8', borderTop: 'none', padding: '40px', backgroundColor: '#ffffff' }
const lead = { fontSize: '16px', color: '#0a0a0a', margin: '0 0 14px', lineHeight: '1.6', fontWeight: 600 }
const body = { fontSize: '15px', color: '#454545', margin: '0 0 16px', lineHeight: '1.75' }

const priceDark = {
  backgroundColor: '#0a0a0a',
  backgroundImage: 'linear-gradient(135deg, #0a0a0a 0%, #1e1e1e 100%)',
  padding: '28px 24px',
  textAlign: 'center' as const,
  margin: '28px 0',
}
const promoText = {
  fontSize: '10px',
  fontWeight: 600,
  letterSpacing: '0.2em',
  color: '#c8c8c8',
  margin: '0 0 10px',
  textTransform: 'uppercase' as const,
}
const priceWhite = { fontSize: '40px', fontWeight: 600, letterSpacing: '-0.03em', color: '#ffffff', margin: '0', lineHeight: '1' }
const priceCaptionLight = { fontSize: '10px', color: '#8f8f8f', margin: '10px 0 0', textTransform: 'uppercase' as const, letterSpacing: '0.2em' }

const cta = {
  backgroundColor: '#0a0a0a',
  color: '#ffffff',
  fontSize: '13px',
  fontWeight: 600,
  letterSpacing: '0.14em',
  textTransform: 'uppercase' as const,
  padding: '18px 32px',
  textDecoration: 'none',
  display: 'inline-block',
  width: '100%',
  textAlign: 'center' as const,
  boxSizing: 'border-box' as const,
}

const hr = { borderColor: '#ececec', margin: '32px 0 24px' }
const whatsNext = {
  fontSize: '10px',
  letterSpacing: '0.24em',
  textTransform: 'uppercase' as const,
  color: '#8f8f8f',
  margin: '0 0 14px',
}
const step = { fontSize: '14px', color: '#2a2a2a', margin: '0 0 10px', lineHeight: '1.6' }
const stepNum = { fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', color: '#b0b0b0' }

const finePrint = { fontSize: '12px', color: '#a3a3a3', margin: '28px 0 0', lineHeight: '1.6', textAlign: 'center' as const }
const footer = { fontSize: '12px', color: '#a3a3a3', textAlign: 'center' as const, marginTop: '28px', lineHeight: '1.7' }
const footerLink = { color: '#737373', textDecoration: 'none' }
