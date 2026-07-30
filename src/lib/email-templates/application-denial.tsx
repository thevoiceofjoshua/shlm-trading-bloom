import * as React from 'react'
import { Body, Container, Head, Heading, Hr, Html, Preview, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  fullName?: string
  reason?: string
}

const DEFAULT_REASON =
  'Based on your application, your current stage of experience and stated goals are not the right fit for this cohort. The mentorship moves quickly through live execution and risk sizing, and we only accept traders who can keep pace with that from week one — otherwise we would be taking your money without being able to give you the result you came for.'

const Email = ({ fullName = 'there', reason = DEFAULT_REASON }: Props) => {
  const firstName = fullName.split(' ')[0]
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>An update on your SHLM Mentorship application</Preview>
      <Body style={main}>
        <Container style={outer}>
          <Section style={hero}>
            <Text style={heroGlow}>&nbsp;</Text>
            <Text style={monogram}>S H L M</Text>
            <Text style={heroRule}>&nbsp;</Text>
            <Text style={heroKicker}>Application update</Text>
            <Heading style={heroTitle}>Thank you for applying.</Heading>
          </Section>

          <Section style={card}>
            <Text style={lead}>Hi {firstName},</Text>
            <Text style={body}>
              Thank you for taking the time to apply to the SHLM Mentorship, and for being open about where you are in your
              trading journey. After a careful review, we&rsquo;ve decided not to move forward with your application for this cohort.
            </Text>

            <Section style={reasonBlock}>
              <Text style={reasonLabel}>Why</Text>
              <Text style={reasonText}>{reason}</Text>
            </Section>

            <Text style={body}>
              Please read this as a matter of timing and fit — not of your potential. We keep cohorts small so every member
              receives direct, personal mentorship, and that means being honest when the fit isn&rsquo;t there yet.
            </Text>

            <Hr style={hr} />

            <Text style={whatsNext}>Where to go from here</Text>
            <Text style={step}><span style={stepNum}>01</span>&nbsp;&nbsp;Keep journaling every trade — process before profit.</Text>
            <Text style={step}><span style={stepNum}>02</span>&nbsp;&nbsp;Study the breakout strategy breakdown on our site and trade it on a demo.</Text>
            <Text style={step}><span style={stepNum}>03</span>&nbsp;&nbsp;Join the free community, then reapply once you have consistent screen time behind you.</Text>

            <Text style={body}>
              You&rsquo;re genuinely welcome to apply again — plenty of our strongest members were not accepted the first time.
            </Text>

            <Text style={signoff}>&mdash; Joshua, SHLM Trading</Text>
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
  subject: 'An update on your SHLM Mentorship application',
  displayName: 'Application denial',
  previewData: { fullName: 'Jane Doe' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Helvetica, Arial, sans-serif', margin: '0', padding: '0' }
const outer = { padding: '32px 20px 48px', maxWidth: '600px', margin: '0 auto' }

const hero = {
  backgroundColor: '#0a0a0a',
  backgroundImage: 'linear-gradient(135deg, #000000 0%, #121212 50%, #1c1c1c 72%, #0a0a0a 100%)',
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
const heroRule = { margin: '22px auto', height: '1px', width: '40px', backgroundColor: '#3a3a3a', fontSize: '1px', lineHeight: '1px' }
const heroKicker = { fontSize: '10px', letterSpacing: '0.28em', textTransform: 'uppercase' as const, color: '#9c9c9c', margin: '0 0 12px' }
const heroTitle = { fontSize: '32px', fontWeight: 600, letterSpacing: '-0.02em', color: '#ffffff', margin: '0', lineHeight: '1.12' }

const card = { border: '1px solid #e8e8e8', borderTop: 'none', padding: '40px', backgroundColor: '#ffffff' }
const lead = { fontSize: '16px', color: '#0a0a0a', margin: '0 0 14px', lineHeight: '1.6', fontWeight: 600 }
const body = { fontSize: '15px', color: '#454545', margin: '0 0 16px', lineHeight: '1.75' }

const reasonBlock = { borderLeft: '3px solid #0a0a0a', backgroundColor: '#fafafa', padding: '20px 22px', margin: '24px 0' }
const reasonLabel = { fontSize: '10px', letterSpacing: '0.24em', textTransform: 'uppercase' as const, color: '#8f8f8f', margin: '0 0 8px' }
const reasonText = { fontSize: '14px', color: '#2a2a2a', margin: '0', lineHeight: '1.75' }

const hr = { borderColor: '#ececec', margin: '32px 0 24px' }
const whatsNext = { fontSize: '10px', letterSpacing: '0.24em', textTransform: 'uppercase' as const, color: '#8f8f8f', margin: '0 0 14px' }
const step = { fontSize: '14px', color: '#2a2a2a', margin: '0 0 10px', lineHeight: '1.6' }
const stepNum = { fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', color: '#b0b0b0' }

const signoff = { fontSize: '15px', color: '#0a0a0a', margin: '24px 0 0', lineHeight: '1.6', fontWeight: 500 }
const footer = { fontSize: '12px', color: '#a3a3a3', textAlign: 'center' as const, marginTop: '28px', lineHeight: '1.7' }
const footerLink = { color: '#737373', textDecoration: 'none' }
