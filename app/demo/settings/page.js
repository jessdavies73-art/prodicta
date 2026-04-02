'use client'
import { useState } from 'react'
import { DemoLayout, SignUpModal } from '@/components/DemoShell'
import { Ic } from '@/components/Icons'
import { NAVY, TEAL, TEALD, TEALLT, BG, CARD, BD, TX, TX2, TX3, GRN, GRNBG, GRNBD, AMB, AMBBG, AMBBD, RED, REDBG, REDBD, F, FM } from '@/lib/constants'

const SHADOW = '0 2px 12px rgba(15,33,55,0.08)'

const TABS = [
  { key: 'company',    label: 'Company',          icon: 'briefcase' },
  { key: 'billing',    label: 'Billing',           icon: 'credit-card' },
  { key: 'team',       label: 'Team',              icon: 'users' },
  { key: 'weightings', label: 'Score Weightings',  icon: 'sliders' },
]

const DEFAULT_WEIGHTS = { 'Strategic Communication': 30, 'Problem Solving': 25, 'Delivery Focus': 25, 'Negotiation': 20 }

function Field({ label, value, type = 'text', hint }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontFamily: 'Outfit, sans-serif', fontSize: 13, fontWeight: 700, color: TX }}>{label}</label>
      <input
        type={type}
        defaultValue={value}
        readOnly
        style={{ padding: '10px 13px', borderRadius: 8, border: `1.5px solid ${BD}`, fontFamily: F, fontSize: 14, color: TX, background: BG, outline: 'none' }}
      />
      {hint && <p style={{ fontFamily: F, fontSize: 12, color: TX3, margin: 0 }}>{hint}</p>}
    </div>
  )
}

function CompanyTab({ onSave }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <Field label="Company name" value="Acme Recruiting Co." />
      <Field label="Website" value="https://acmerecruiting.demo" type="url" />
      <Field label="Industry" value="Technology" />
      <Field label="Company size" value="51-200 employees" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label style={{ fontFamily: F, fontSize: 13, fontWeight: 700, color: TX }}>Default assessment language</label>
        <select disabled style={{ padding: '10px 13px', borderRadius: 8, border: `1.5px solid ${BD}`, fontFamily: F, fontSize: 14, color: TX, background: BG, appearance: 'none', cursor: 'not-allowed' }}>
          <option>English (UK)</option>
        </select>
      </div>
      <div style={{ paddingTop: 8 }}>
        <button onClick={onSave} style={{ padding: '11px 28px', borderRadius: 8, border: 'none', background: TEAL, color: NAVY, fontFamily: F, fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>
          Save changes
        </button>
      </div>
    </div>
  )
}

function BillingTab({ onUpgrade }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Current plan */}
      <div style={{ background: GRNBG, border: `1px solid #86efac`, borderRadius: 12, padding: '18px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <p style={{ fontFamily: F, fontSize: 14, fontWeight: 800, color: TX, margin: '0 0 3px' }}>Demo Plan</p>
          <p style={{ fontFamily: F, fontSize: 13, color: TX2, margin: 0 }}>Read-only access · No assessment credits</p>
        </div>
        <span style={{ padding: '4px 12px', borderRadius: 50, background: GRN, color: '#fff', fontSize: 11, fontWeight: 700 }}>Active</span>
      </div>

      {/* Usage */}
      <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 12, padding: '18px 20px' }}>
        <p style={{ fontFamily: F, fontSize: 14, fontWeight: 700, color: TX, margin: '0 0 14px' }}>Usage this month</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {[
            { label: 'Assessments sent', used: 0, limit: 0 },
            { label: 'AI reports generated', used: 0, limit: 0 },
          ].map(({ label, used, limit }) => (
            <div key={label}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                <span style={{ fontFamily: F, fontSize: 13, color: TX2 }}>{label}</span>
                <span style={{ fontFamily: FM, fontSize: 12.5, color: TX3 }}>Demo only</span>
              </div>
              <div style={{ height: 6, borderRadius: 99, background: BG }} />
            </div>
          ))}
        </div>
      </div>

      {/* Upgrade CTA */}
      <div style={{ background: `linear-gradient(135deg, ${NAVY} 0%, #1a3a5c 100%)`, borderRadius: 12, padding: '24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <p style={{ fontFamily: F, fontSize: 16, fontWeight: 800, color: '#fff', margin: 0 }}>Unlock full access</p>
        <p style={{ fontFamily: F, fontSize: 13.5, color: 'rgba(255,255,255,0.7)', margin: 0, lineHeight: 1.6 }}>
          Create real assessments, invite candidates, and get AI-generated reports. Plans start from £49/month.
        </p>
        <button onClick={onUpgrade} style={{ alignSelf: 'flex-start', padding: '11px 24px', borderRadius: 8, border: 'none', background: TEAL, color: NAVY, fontFamily: F, fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>
          See pricing & sign up →
        </button>
      </div>
    </div>
  )
}

function TeamTab({ onInvite }) {
  const members = [
    { name: 'Demo User', email: 'demo@prodicta.io', role: 'Owner', initials: 'D', since: 'Today' },
  ]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <p style={{ fontFamily: F, fontSize: 14, color: TX2, margin: 0 }}>Manage who has access to your workspace</p>
        <button
          onClick={onInvite}
          style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '9px 18px', borderRadius: 8, border: 'none', background: TEAL, color: NAVY, fontFamily: F, fontSize: 13.5, fontWeight: 800, cursor: 'pointer' }}
        >
          <Ic name="user-plus" size={15} color={NAVY} />
          Invite member
        </button>
      </div>

      <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '10px 20px', borderBottom: `1px solid ${BD}`, background: BG, display: 'grid', gridTemplateColumns: '1fr 1fr auto auto' }}>
          {['Member', 'Email', 'Role', ''].map((h, i) => (
            <span key={i} style={{ fontFamily: F, fontSize: 11.5, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</span>
          ))}
        </div>
        {members.map(m => (
          <div key={m.email} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto auto', padding: '14px 20px', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 9, background: `linear-gradient(135deg, ${TEAL}, #009688)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: NAVY }}>{m.initials}</div>
              <span style={{ fontFamily: F, fontSize: 14, fontWeight: 600, color: TX }}>{m.name}</span>
            </div>
            <span style={{ fontFamily: F, fontSize: 13.5, color: TX2 }}>{m.email}</span>
            <span style={{ padding: '3px 10px', borderRadius: 50, background: TEALLT, color: TEALD, fontSize: 12, fontWeight: 700 }}>{m.role}</span>
            <span style={{ fontFamily: F, fontSize: 12, color: TX3 }}>{m.since}</span>
          </div>
        ))}
      </div>

      <div style={{ background: AMBBG, border: `1px solid #fcd34d`, borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Ic name="info" size={15} color={AMB} />
        <p style={{ fontFamily: F, fontSize: 13.5, color: '#92400e', margin: 0 }}>
          Team invites are available on paid plans. Sign up to add colleagues to your workspace.
        </p>
      </div>
    </div>
  )
}

function WeightingsTab({ onSave }) {
  const [weights, setWeights] = useState(DEFAULT_WEIGHTS)
  const total = Object.values(weights).reduce((a, b) => a + b, 0)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h2 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: TX, fontFamily: F }}>Default Score Weightings</h2>
        <p style={{ margin: '0 0 24px', fontSize: 13, color: TX2, lineHeight: 1.6, fontFamily: F }}>
          Control how important each skill is when calculating candidate scores. For example, if communication matters most for your roles, increase its weight.
        </p>
        {/* Demo banner */}
        <div style={{ background: AMBBG, border: `1px solid ${AMBBD}`, borderRadius: 8, padding: '10px 14px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Ic name="info" size={14} color={AMB} />
          <span style={{ fontFamily: F, fontSize: 12.5, color: '#92400e' }}>Demo mode. Sign up to set real weightings that apply to your assessments.</span>
        </div>

        {Object.entries(weights).map(([skill, val]) => (
          <div key={skill} style={{ marginBottom: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <label style={{ fontFamily: F, fontSize: 14, fontWeight: 600, color: TX }}>{skill}</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="number" min={0} max={100} value={val}
                  onChange={e => setWeights(prev => ({ ...prev, [skill]: Math.max(0, Math.min(100, Number(e.target.value))) }))}
                  style={{ width: 60, padding: '5px 8px', borderRadius: 7, border: `1.5px solid ${BD}`, fontFamily: 'IBM Plex Mono, monospace', fontSize: 14, color: TX, textAlign: 'right', outline: 'none' }}
                />
                <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 13, color: TX3, width: 16 }}>%</span>
              </div>
            </div>
            <input
              type="range" min={0} max={100} value={val}
              onChange={e => setWeights(prev => ({ ...prev, [skill]: Number(e.target.value) }))}
              style={{ width: '100%', accentColor: TEAL, cursor: 'pointer' }}
            />
          </div>
        ))}

        {/* Total indicator */}
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 8, marginBottom: 20, background: total === 100 ? GRNBG : REDBG, border: `1px solid ${total === 100 ? GRNBD : REDBD}` }}>
          <Ic name={total === 100 ? 'check' : 'alert'} size={14} color={total === 100 ? GRN : RED} />
          <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontSize: 13, fontWeight: 700, color: total === 100 ? GRN : RED }}>
            Total: {total}%{total !== 100 ? ' (must equal 100%)' : ''}
          </span>
        </div>

        {/* Visual preview */}
        <div style={{ background: BG, border: `1px solid ${BD}`, borderRadius: 10, padding: '14px 16px', marginBottom: 20 }}>
          <div style={{ fontFamily: F, fontSize: 12.5, fontWeight: 700, color: TX2, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '0.04em' }}>What this means</div>
          {Object.entries(weights).sort((a, b) => b[1] - a[1]).map(([skill, w], i) => (
            <div key={skill} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ width: `${Math.max(4, w)}%`, height: 6, borderRadius: 99, background: i === 0 ? TEAL : i === 1 ? GRN : i === 2 ? AMB : '#cbd5e1', transition: 'width 0.3s ease', minWidth: 4 }} />
              <span style={{ fontFamily: F, fontSize: 12.5, color: TX2, whiteSpace: 'nowrap' }}>{skill} <span style={{ fontFamily: 'IBM Plex Mono, monospace', fontWeight: 700, color: TX }}>{w}%</span></span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={onSave}
            style={{ padding: '11px 24px', borderRadius: 8, border: 'none', background: TEAL, color: NAVY, fontFamily: F, fontSize: 14, fontWeight: 800, cursor: 'pointer' }}
          >
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
              <Ic name="check" size={15} color={NAVY} />
              Save as default
            </span>
          </button>
          <button onClick={() => setWeights(DEFAULT_WEIGHTS)} style={{ padding: '11px 20px', borderRadius: 8, border: `1.5px solid ${BD}`, background: 'transparent', color: TX2, fontFamily: F, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            Reset to default
          </button>
        </div>
        <p style={{ margin: '12px 0 0', fontSize: 12, color: TX3, fontFamily: F, lineHeight: 1.6 }}>
          These defaults apply to all new assessments. You can override them per-assessment when creating an assessment.
        </p>
      </div>
    </div>
  )
}

export default function DemoSettingsPage() {
  const [modal, setModal] = useState(false)
  const [tab, setTab] = useState('company')

  return (
    <DemoLayout active="settings">
      {modal && <SignUpModal onClose={() => setModal(false)} />}
      <main style={{ marginLeft: 220, marginTop: 46, minHeight: '100vh', background: BG, padding: '32px 32px 48px' }}>
        <div style={{ maxWidth: 760, margin: '0 auto' }}>
          {/* Header */}
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ fontFamily: F, fontSize: 22, fontWeight: 800, color: TX, margin: '0 0 4px', letterSpacing: '-0.3px' }}>Settings</h1>
            <p style={{ fontFamily: F, fontSize: 14, color: TX2, margin: 0 }}>Manage your workspace preferences</p>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, background: CARD, border: `1px solid ${BD}`, borderRadius: 10, padding: 5, marginBottom: 24, width: 'fit-content' }}>
            {TABS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px', borderRadius: 7, border: 'none',
                  fontFamily: F, fontSize: 13.5, fontWeight: tab === t.key ? 700 : 500, cursor: 'pointer',
                  background: tab === t.key ? NAVY : 'transparent',
                  color: tab === t.key ? '#fff' : TX2,
                  transition: 'all 0.15s',
                }}
              >
                <Ic name={t.icon} size={15} color={tab === t.key ? '#fff' : TX3} />
                {t.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 12, padding: '28px 28px', boxShadow: SHADOW }}>
            {tab === 'company'    && <CompanyTab onSave={() => setModal(true)} />}
            {tab === 'billing'    && <BillingTab onUpgrade={() => setModal(true)} />}
            {tab === 'team'       && <TeamTab onInvite={() => setModal(true)} />}
            {tab === 'weightings' && <WeightingsTab onSave={() => setModal(true)} />}
          </div>
        </div>
      </main>
    </DemoLayout>
  )
}
