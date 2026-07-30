import * as React from 'react'
import { Body, Container, Head, Heading, Html, Preview, Section, Text } from '@react-email/components'
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
        <Container style={shell}>
          <Section style={hero}>
            <Text style={watermark}>SHLM</Text>
            <Text style={wordmark}>S H L M</Text>
            <Text style={heroCaption}>Breakout strategy mentorship</Text>
          </Section>

          <Section style={panel}>
            <Section style={{ textAlign: 'center' as const }}>
              <Text style={pill}>&#9679;&nbsp;&nbsp;APPLICATION UPDATE</Text>
            </Section>

            <Heading style={title}>Thank you for applying.</Heading>

            <Text style={body}>Hi {firstName},</Text>
            <Text style={body}>
              Thank you for taking the time to apply to the SHLM Mentorship, and for being open about where you are in
              your trading journey. After a careful review, we&rsquo;ve decided not to move forward with your application
              for this cohort.
            </Text>

            <Section style={innerCard}>
              <Text style={cardKicker}>WHY</Text>
              <Text style={reasonText}>{reason}</Text>
            </Section>

            <Text style={body}>
              Please read this as a matter of timing and fit — not of your potential. We keep cohorts small so every
              member receives direct, personal mentorship, and that means being honest when the fit isn&rsquo;t there yet.
            </Text>

            <Section style={innerCard}>
              <Text style={cardKicker}>WHERE TO GO FROM HERE</Text>
              <Text style={arrowRow}><span style={arrow}>01</span>&nbsp;&nbsp;Keep journaling every trade — process before profit</Text>
              <Text style={arrowRow}><span style={arrow}>02</span>&nbsp;&nbsp;Study the breakout strategy breakdown on our site and trade it on demo</Text>
              <Text style={arrowRow}><span style={arrow}>03</span>&nbsp;&nbsp;Join the free community, then reapply with screen time behind you</Text>
              <Text style={cardNote}>
                You&rsquo;re genuinely welcome to apply again — plenty of our strongest members were not accepted the first time.
              </Text>
            </Section>

            <Text style={signoff}>&mdash; Joshua, SHLM Trading</Text>
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

export const template = {
  component: Email,
  subject: 'An update on your SHLM Mentorship application',
  displayName: 'Application denial',
  previewData: { fullName: 'Jane Doe' },
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
const watermark = { margin: '0 0 -34px', fontSize: '86px', fontWeight: 700, letterSpacing: '0.08em', color: '#141414', lineHeight: '1' }
const wordmark = { margin: '0', fontSize: '26px', fontWeight: 700, letterSpacing: '0.36em', color: '#ffffff' }
const heroCaption = { margin: '16px 0 0', fontSize: '10px', letterSpacing: '0.26em', textTransform: 'uppercase' as const, color: '#7a7a7a' }

const panel = { backgroundColor: '#0a0a0a', padding: '34px 32px 20px' }

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

const title = { fontSize: '34px', fontWeight: 700, letterSpacing: '-0.03em', color: '#ffffff', margin: '0 0 22px', lineHeight: '1.1', textAlign: 'center' as const }
const body = { fontSize: '15px', color: '#a8a8a8', margin: '0 0 15px', lineHeight: '1.75' }

const innerCard = { backgroundColor: '#111111', border: '1px solid #1f1f1f', borderRadius: '14px', padding: '24px 22px', margin: '26px 0' }
const cardKicker = { fontSize: '10px', fontWeight: 700, letterSpacing: '0.2em', color: '#6f6f6f', margin: '0 0 12px' }
const reasonText = { fontSize: '14px', color: '#d4d4d4', margin: '0', lineHeight: '1.75' }
const arrowRow = { fontSize: '14px', color: '#cfcfcf', margin: '0 0 10px', lineHeight: '1.6' }
const arrow = { color: '#6f6f6f', fontWeight: 700 }
const cardNote = { fontSize: '12px', color: '#6f6f6f', margin: '16px 0 0', lineHeight: '1.6' }

const signoff = { fontSize: '15px', color: '#ffffff', margin: '8px 0 0', lineHeight: '1.6', fontWeight: 600 }

const footerBar = { backgroundColor: '#000000', borderTop: '1px solid #1f1f1f', padding: '24px 32px 30px', textAlign: 'center' as const }
const footerText = { fontSize: '11px', color: '#5f5f5f', margin: '0 0 4px', letterSpacing: '0.06em', lineHeight: '1.6' }
const footerLink = { color: '#9a9a9a', textDecoration: 'none' }
