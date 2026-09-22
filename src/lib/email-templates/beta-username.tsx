import * as React from 'react'
import { Body, Container, Head, Heading, Html, Preview, Section, Text } from '@react-email/components'
import type { TemplateEntry } from './registry'

interface Props {
  username?: string
  memberEmail?: string
  note?: string
}

const Email = ({ username = '', memberEmail = '', note = '' }: Props) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>{`Beta access request — ${username || 'TradingView user'}`}</Preview>
    <Body style={main}>
      <Container style={shell}>
        <Section style={panel}>
          <Text style={pill}>&#9679;&nbsp;&nbsp;BETA ACCESS REQUEST</Text>
          <Heading style={title}>{username || 'TradingView username'}</Heading>
          <Text style={subtitle}>
            A beta tester submitted their TradingView username for SHLM SYSTEM invite-only access.
          </Text>

          <Section style={innerCard}>
            <Text style={row}>
              <strong>TradingView username:</strong> {username || '—'}
            </Text>
            <Text style={row}>
              <strong>Member account:</strong> {memberEmail || '—'}
            </Text>
            <Text style={row}>
              <strong>Note:</strong> {note || '—'}
            </Text>
          </Section>

          <Text style={footerText}>SHLM Trading &middot; Beta notification</Text>
        </Section>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (data: Record<string, any>) =>
    `Beta access request — ${data['username'] || 'TradingView user'}`,
  displayName: 'Beta access request (admin)',
  previewData: {
    username: 'shlm_trader',
    memberEmail: 'member@example.com',
    note: 'Please add me to the invite-only list.',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, Helvetica, sans-serif' }
const shell = { padding: '24px 16px', maxWidth: '560px' }
const panel = {
  border: '1px solid #e5e5e5',
  borderRadius: '16px',
  padding: '24px',
}
const pill = {
  fontSize: '11px',
  letterSpacing: '1.5px',
  color: '#666666',
  margin: '0 0 12px',
}
const title = { fontSize: '24px', margin: '0 0 8px', color: '#111111' }
const subtitle = { fontSize: '14px', color: '#555555', margin: '0 0 16px' }
const innerCard = {
  backgroundColor: '#fafafa',
  borderRadius: '12px',
  padding: '16px',
}
const row = { fontSize: '14px', color: '#111111', margin: '0 0 8px' }
const footerText = { fontSize: '11px', color: '#888888', marginTop: '20px' }
