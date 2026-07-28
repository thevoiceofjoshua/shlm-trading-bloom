import * as React from 'react'
import { Body, Container, Head, Heading, Html, Preview, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  fullName?: string
}

const Email = ({ fullName = 'there' }: Props) => {
  const firstName = fullName.split(' ')[0]
  return (
    <Html lang="en" dir="ltr">
      <Head />
      <Preview>An update on your SHLM Mentorship application</Preview>
      <Body style={main}>
        <Container style={container}>
          <Section style={header}>
            <Text style={monogram}>SHLM</Text>
          </Section>

          <Section style={card}>
            <Heading style={h1}>Thank you for applying.</Heading>
            <Text style={lead}>Hi {firstName},</Text>
            <Text style={body}>
              We appreciate you taking the time to apply to the SHLM Mentorship program. After a careful review of your application,
              we've decided not to move forward at this time.
            </Text>
            <Text style={body}>
              This decision isn't a reflection of your potential as a trader. We keep our cohorts small so every member receives
              direct, personal mentorship, and fit at this stage of your journey is a major factor in our review.
            </Text>
            <Text style={body}>
              We encourage you to keep sharpening your process — you're welcome to reapply in the future as your experience grows.
              In the meantime, feel free to follow along with our free content and community.
            </Text>
            <Text style={signoff}>— Joshua, SHLM Trading</Text>
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

const main = { backgroundColor: '#ffffff', fontFamily: 'Helvetica, Arial, sans-serif' }
const container = { padding: '40px 24px', maxWidth: '600px', margin: '0 auto' }
const header = { textAlign: 'center' as const, marginBottom: '32px' }
const monogram = { fontSize: '28px', fontWeight: 700, letterSpacing: '0.18em', color: '#0a0a0a', margin: '0' }
const card = { border: '1px solid #0a0a0a', borderRadius: '0px', padding: '40px', backgroundColor: '#ffffff' }
const h1 = { fontSize: '28px', fontWeight: 600, letterSpacing: '-0.02em', color: '#0a0a0a', margin: '0 0 20px', lineHeight: '1.15' }
const lead = { fontSize: '16px', color: '#171717', margin: '0 0 16px', lineHeight: '1.6' }
const body = { fontSize: '15px', color: '#404040', margin: '0 0 16px', lineHeight: '1.7' }
const signoff = { fontSize: '15px', color: '#0a0a0a', margin: '24px 0 0', lineHeight: '1.6' }
const footer = { fontSize: '12px', color: '#a3a3a3', textAlign: 'center' as const, marginTop: '32px', lineHeight: '1.6' }
const footerLink = { color: '#737373', textDecoration: 'none' }
