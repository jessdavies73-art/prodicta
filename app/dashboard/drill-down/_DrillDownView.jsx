'use client'

// Drill-down dashboard view, four tabs:
//   1. By Role       (every account)
//   2. By Client     (agency only; hidden for direct employer)
//   3. By Team Member (multi-user accounts; empty state otherwise)
//   4. By Location   (assessments with location populated; empty state otherwise)
//
// Data flows in as already-fetched props so the same component renders
// against live Supabase data on /dashboard/drill-down and demo data on
// /demo/drill-down. Aggregation is in-memory; the component does not
// fetch.
//
// Visual conventions match the existing dashboard table at app/dashboard/
// page.js (BD borders, BG header bg, TX3 header text, TEAL hover indicator).
// Mobile collapses tables to stacked cards at <=768px.

import { useEffect, useMemo, useState } from 'react'
import { NAVY, TEAL, TEALD, TEALLT, BG, CARD, BD, TX, TX2, TX3, GRN, GRNBG, AMB, AMBBG, RED, REDBG, F, FM } from '@/lib/constants'

const STORAGE_KEY = 'prodicta_drilldown_state'

function useIsMobile(threshold = 768) {
  const [mobile, setMobile] = useState(false)
  useEffect(() => {
    const check = () => setMobile(typeof window !== 'undefined' && window.innerWidth <= threshold)
    check()
    if (typeof window !== 'undefined') window.addEventListener('resize', check)
    return () => { if (typeof window !== 'undefined') window.removeEventListener('resize', check) }
  }, [threshold])
  return mobile
}

function loadState() {
  if (typeof window === 'undefined') return {}
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}
function saveState(state) {
  if (typeof window === 'undefined') return
  try { window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state)) } catch {}
}

const STATUS_PILL = {
  Active:    { bg: TEALLT, fg: TEALD, bd: `${TEAL}55` },
  Filled:    { bg: GRNBG,  fg: GRN,   bd: '#a7f3d0' },
  Cancelled: { bg: '#f1f5f9', fg: TX2, bd: BD },
  Stale:     { bg: AMBBG, fg: AMB,    bd: '#fcd34d' },
}

function StatusPill({ value }) {
  const s = STATUS_PILL[value] || STATUS_PILL.Active
  return (
    <span style={{
      display: 'inline-block', padding: '3px 10px', borderRadius: 50,
      fontSize: 11, fontWeight: 700, fontFamily: F,
      background: s.bg, color: s.fg, border: `1px solid ${s.bd}`,
      letterSpacing: '0.02em',
    }}>{value}</span>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Aggregators. Pure functions over the live data so we can swap demo
// vs production with no logic change.
// ─────────────────────────────────────────────────────────────────────
function deriveRoleStatus(assessment, candidates) {
  if (assessment?.status === 'cancelled') return 'Cancelled'
  if (assessment?.status === 'archived') return 'Filled'
  const created = assessment?.created_at ? new Date(assessment.created_at).getTime() : 0
  const ageDays = (Date.now() - created) / 86400000
  if (ageDays > 60 && candidates.every(c => c.status !== 'completed')) return 'Stale'
  return 'Active'
}

function aggregateRoles(candidates, assessments) {
  const byAssessmentId = new Map()
  for (const a of assessments || []) {
    byAssessmentId.set(a.id, { assessment: a, candidates: [] })
  }
  // Some candidate stubs only carry the nested `assessments` object, no
  // top-level row; fall back to that when the assessment row is missing
  // (covers demo data where the full assessments list is in DEMO_ASSESSMENTS
  // but candidates carry a stub).
  for (const c of candidates || []) {
    const aid = c.assessments?.id || c.assessment_id
    if (!aid) continue
    if (!byAssessmentId.has(aid)) {
      byAssessmentId.set(aid, { assessment: { id: aid, ...(c.assessments || {}) }, candidates: [] })
    }
    byAssessmentId.get(aid).candidates.push(c)
  }

  return Array.from(byAssessmentId.values()).map(({ assessment, candidates: cs }) => {
    const completed = cs.filter(c => c.status === 'completed')
    const recommended = completed.filter(c => (c.results?.[0]?.overall_score ?? 0) >= 70)
    const active = cs.filter(c => c.status !== 'completed' && c.status !== 'archived' && c.status !== 'rejected')
    const hires = cs.filter(c => /hire|placed|offer.accepted/i.test(c.outcome || c.stage || ''))
    const scores = completed.map(c => c.results?.[0]?.overall_score).filter(s => Number.isFinite(s))
    const avg = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null
    const status = deriveRoleStatus(assessment, cs)
    const passRate = completed.length
      ? Math.round((completed.filter(c => (c.results?.[0]?.overall_score ?? 0) >= 70).length / completed.length) * 100)
      : null
    return {
      id: assessment.id,
      role_title: assessment.role_title || 'Unknown role',
      employment_type: assessment.employment_type || 'permanent',
      client_name: assessment.client_name || null,
      location: assessment.location || null,
      team_member_id: assessment.team_member_id || null,
      created_at: assessment.created_at || null,
      total: cs.length,
      completed: completed.length,
      recommended: recommended.length,
      active: active.length,
      hires: hires.length,
      avg,
      passRate,
      status,
      candidates: cs,
    }
  })
}

function aggregateClients(roles, clientsList) {
  const byClient = new Map()
  // Seed from explicit DEMO_CLIENTS / accounts table where available.
  for (const cl of clientsList || []) {
    if (!cl?.name) continue
    byClient.set(cl.name, {
      name: cl.name,
      sector: cl.sector || null,
      primary_contact: cl.primary_contact || null,
      roles: [],
      last_activity_at: cl.last_activity_at || null,
    })
  }
  // Walk roles to count totals per client.
  for (const r of roles) {
    if (!r.client_name) continue
    if (!byClient.has(r.client_name)) {
      byClient.set(r.client_name, { name: r.client_name, sector: null, primary_contact: null, roles: [], last_activity_at: null })
    }
    byClient.get(r.client_name).roles.push(r)
  }
  return Array.from(byClient.values()).map(c => {
    const totalAssessments = c.roles.reduce((s, r) => s + r.total, 0)
    const completed = c.roles.reduce((s, r) => s + r.completed, 0)
    const hires = c.roles.reduce((s, r) => s + r.hires, 0)
    return {
      ...c,
      open_roles: c.roles.length,
      total_assessments: totalAssessments,
      completed,
      hires,
      // Rebate window candidates: completed in the last 90 days, role
      // employment_type permanent. Best-effort heuristic from candidate
      // completion dates; refines once outcome data exists.
      rebate_window: c.roles.flatMap(r => r.candidates).filter(cand => {
        if (cand.status !== 'completed' || !cand.completed_at) return false
        const completedAge = (Date.now() - new Date(cand.completed_at).getTime()) / 86400000
        return completedAge <= 90
      }).length,
    }
  })
}

function aggregateTeamMembers(roles, candidates, members) {
  const byId = new Map()
  for (const m of members || []) {
    if (!m?.id) continue
    byId.set(m.id, {
      ...m,
      active_assessments: 0,
      completed_this_month: 0,
      recommended: 0,
      hires: 0,
      scores: [],
      last_activity: m.last_active_at || null,
    })
  }
  const monthAgo = Date.now() - 30 * 86400000
  for (const r of roles) {
    if (!r.team_member_id || !byId.has(r.team_member_id)) continue
    const e = byId.get(r.team_member_id)
    if (r.status === 'Active') e.active_assessments += r.total
    e.recommended += r.recommended
    e.hires += r.hires
    for (const c of r.candidates) {
      if (c.completed_at && new Date(c.completed_at).getTime() >= monthAgo) e.completed_this_month += 1
      const s = c.results?.[0]?.overall_score
      if (Number.isFinite(s)) e.scores.push(s)
    }
  }
  return Array.from(byId.values()).map(e => ({
    ...e,
    avg_score: e.scores.length ? Math.round(e.scores.reduce((a, b) => a + b, 0) / e.scores.length) : null,
  }))
}

function aggregateLocations(roles) {
  const byLocation = new Map()
  for (const r of roles) {
    if (!r.location) continue
    if (!byLocation.has(r.location)) {
      byLocation.set(r.location, { location: r.location, roles: [] })
    }
    byLocation.get(r.location).roles.push(r)
  }
  return Array.from(byLocation.values()).map(loc => {
    const totalAssessments = loc.roles.reduce((s, r) => s + r.total, 0)
    const completed = loc.roles.reduce((s, r) => s + r.completed, 0)
    const hires = loc.roles.reduce((s, r) => s + r.hires, 0)
    const allScores = loc.roles.flatMap(r => r.candidates.map(c => c.results?.[0]?.overall_score).filter(s => Number.isFinite(s)))
    const avg = allScores.length ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length) : null
    return {
      location: loc.location,
      total_assessments: totalAssessments,
      completed,
      hires,
      avg,
      active_roles: loc.roles.filter(r => r.status === 'Active').length,
      roles: loc.roles,
    }
  })
}

// ─────────────────────────────────────────────────────────────────────
// Main view
// ─────────────────────────────────────────────────────────────────────
export default function DrillDownView({
  candidates = [],
  assessments = [],
  teamMembers = [],
  clients = [],
  accountType = 'employer',
  planType = 'subscription',
  hideCompliance = false,
}) {
  const isMobile = useIsMobile()
  const persisted = useMemo(() => loadState(), [])

  const isAgency = accountType === 'agency'
  const isPayg = planType === 'payg'

  // Derive tabs once and gate by account/plan.
  const tabs = useMemo(() => {
    const t = [{ key: 'role', label: 'By Role', locked: false }]
    if (isAgency) t.push({ key: 'client', label: 'By Client', locked: isPayg })
    t.push({ key: 'team', label: 'By Team Member', locked: isPayg })
    t.push({ key: 'location', label: 'By Location', locked: isPayg })
    return t
  }, [isAgency, isPayg])

  const [tab, setTab] = useState(persisted.tab && tabs.some(t => t.key === persisted.tab) ? persisted.tab : 'role')
  const [search, setSearch] = useState(persisted.search || '')
  const [sort, setSort] = useState(persisted.sort || { key: 'created_at', dir: 'desc' })
  const [expanded, setExpanded] = useState(null)

  useEffect(() => { saveState({ tab, search, sort }) }, [tab, search, sort])

  const roles = useMemo(() => aggregateRoles(candidates, assessments), [candidates, assessments])
  const clientRows = useMemo(() => aggregateClients(roles, clients), [roles, clients])
  const teamRows = useMemo(() => aggregateTeamMembers(roles, candidates, teamMembers), [roles, candidates, teamMembers])
  const locationRows = useMemo(() => aggregateLocations(roles), [roles])

  function setSortKey(key) {
    setSort(prev => prev.key === key ? { key, dir: prev.dir === 'desc' ? 'asc' : 'desc' } : { key, dir: 'desc' })
  }

  function sortRows(rows, defaults) {
    const { key, dir } = sort
    const k = defaults.includes(key) ? key : defaults[0]
    const factor = dir === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      const av = a[k]; const bv = b[k]
      if (av == null && bv == null) return 0
      if (av == null) return 1
      if (bv == null) return -1
      if (typeof av === 'string') return factor * av.localeCompare(bv)
      return factor * (av - bv)
    })
  }

  return (
    <div style={{ fontFamily: F, color: TX, padding: isMobile ? '20px 12px' : '32px 24px', maxWidth: 1280, margin: '0 auto' }}>
      <header style={{ marginBottom: 18 }}>
        <div style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: TEAL, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 6 }}>
          PRODICTA &middot; Drill-down
        </div>
        <h1 style={{ fontFamily: F, fontSize: isMobile ? 22 : 28, fontWeight: 800, color: NAVY, margin: 0, letterSpacing: '-0.4px' }}>
          Slice the dashboard by what matters to you
        </h1>
        <p style={{ fontFamily: F, fontSize: 14, color: TX2, margin: '8px 0 0', lineHeight: 1.55 }}>
          {hideCompliance
            ? 'Slice your assessment, shortlisting, and post-placement signals by role, client, team member, or location. The four buckets stay consistent under every filter.'
            : 'Filter assessment, shortlisting, post-placement and compliance signals by role, client, team member, or location. The four buckets stay consistent under every filter.'}
        </p>
      </header>

      <TabStrip tabs={tabs} active={tab} onPick={setTab} isMobile={isMobile} />

      {tab === 'role' && (
        <RoleTab
          roles={sortRows(
            roles.filter(r => !search.trim() || `${r.role_title} ${r.client_name || ''} ${r.location || ''}`.toLowerCase().includes(search.toLowerCase())),
            ['created_at', 'total', 'avg', 'status']
          )}
          search={search}
          onSearch={setSearch}
          sort={sort}
          onSortKey={setSortKey}
          expanded={expanded}
          onExpand={setExpanded}
          isMobile={isMobile}
          isPayg={isPayg}
        />
      )}

      {tab === 'client' && (
        isAgency ? (
          isPayg ? <UpgradePrompt label="By Client" /> :
          clientRows.length === 0 ? <EmptyState
            title="No client data yet"
            body="No client data yet. Add clients via Settings, Clients to enable this view."
            cta={{ href: '/settings#clients', label: 'Open Settings' }}
          /> : <ClientTab
            clients={sortRows(clientRows, ['last_activity_at', 'total_assessments', 'hires'])}
            sort={sort}
            onSortKey={setSortKey}
            expanded={expanded}
            onExpand={setExpanded}
            isMobile={isMobile}
          />
        ) : <EmptyState title="Not available" body="Client drill-down is available on agency accounts." />
      )}

      {tab === 'team' && (
        isPayg ? <UpgradePrompt label="By Team Member" /> :
        teamRows.length <= 1 ? <EmptyState
          title="Add team members to enable this view"
          body="Add team members via Settings, Team to enable this view."
          cta={{ href: '/settings#team', label: 'Open Settings' }}
        /> : <TeamTab
          team={sortRows(teamRows, ['last_activity', 'completed_this_month', 'recommended', 'hires'])}
          sort={sort}
          onSortKey={setSortKey}
          expanded={expanded}
          onExpand={setExpanded}
          isMobile={isMobile}
        />
      )}

      {tab === 'location' && (
        isPayg ? <UpgradePrompt label="By Location" /> :
        locationRows.length === 0 ? <EmptyState
          title="Add a location to your assessments"
          body="Add location or site to assessments to enable this view."
          cta={{ href: '/assessment/new', label: 'New assessment' }}
        /> : <LocationTab
          rows={sortRows(locationRows, ['total_assessments', 'hires', 'avg'])}
          sort={sort}
          onSortKey={setSortKey}
          expanded={expanded}
          onExpand={setExpanded}
          isMobile={isMobile}
        />
      )}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Tab strip
// ─────────────────────────────────────────────────────────────────────
function TabStrip({ tabs, active, onPick, isMobile }) {
  return (
    <div style={{
      display: 'flex', gap: 4, borderBottom: `1px solid ${BD}`, marginBottom: 18,
      overflowX: isMobile ? 'auto' : 'visible',
      WebkitOverflowScrolling: 'touch',
    }}>
      {tabs.map(t => {
        const isActive = t.key === active
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onPick(t.key)}
            style={{
              fontFamily: F, fontSize: 13.5, fontWeight: 700,
              padding: '10px 16px',
              background: 'transparent', border: 'none', cursor: 'pointer',
              color: isActive ? NAVY : TX2,
              borderBottom: `2px solid ${isActive ? TEAL : 'transparent'}`,
              marginBottom: -1, whiteSpace: 'nowrap', flexShrink: 0,
              display: 'inline-flex', alignItems: 'center', gap: 6,
            }}
          >
            {t.label}
            {t.locked ? <span style={{ fontFamily: FM, fontSize: 10, color: AMB, padding: '2px 6px', borderRadius: 4, background: AMBBG, border: `1px solid #fcd34d` }}>Upgrade</span> : null}
          </button>
        )
      })}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Reusable bits
// ─────────────────────────────────────────────────────────────────────
function EmptyState({ title, body, cta }) {
  return (
    <div style={{
      background: CARD, border: `1px solid ${BD}`, borderRadius: 14, borderTop: `3px solid ${TEAL}`,
      padding: '24px 26px', textAlign: 'left',
    }}>
      <div style={{ fontFamily: F, fontSize: 15, fontWeight: 800, color: NAVY, marginBottom: 8 }}>{title}</div>
      <p style={{ fontFamily: F, fontSize: 13.5, color: TX3, lineHeight: 1.55, margin: '0 0 14px', fontStyle: 'italic' }}>{body}</p>
      {cta ? (
        <a href={cta.href} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '8px 16px', borderRadius: 8, border: 'none',
          background: TEAL, color: NAVY,
          fontFamily: F, fontSize: 13, fontWeight: 700, textDecoration: 'none',
        }}>{cta.label}</a>
      ) : null}
    </div>
  )
}

function UpgradePrompt({ label }) {
  return (
    <EmptyState
      title={`${label} is a subscription feature`}
      body="Upgrade from PAYG to a subscription plan to unlock the full drill-down. By Role is available on every plan."
      cta={{ href: '/billing/credits', label: 'See plans' }}
    />
  )
}

function SortHeader({ k, label, sort, onSortKey, hideOnMobile = false, align = 'left' }) {
  const active = sort.key === k
  const arrow = active ? (sort.dir === 'asc' ? ' ↑' : ' ↓') : ''
  return (
    <th style={{
      padding: '10px 8px', textAlign: align,
      fontFamily: F, fontSize: 11, fontWeight: 700, color: active ? NAVY : TX3,
      letterSpacing: '0.04em', textTransform: 'uppercase', whiteSpace: 'nowrap',
      background: BG, cursor: 'pointer',
      display: hideOnMobile ? undefined : undefined,
    }}
    onClick={() => onSortKey(k)}
    >
      {label}{arrow}
    </th>
  )
}

function tableShell({ isMobile, children }) {
  return (
    <div style={{
      background: CARD, border: `1px solid ${BD}`, borderRadius: 12, overflow: 'hidden',
    }}>
      {children}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Tab 1: By Role
// ─────────────────────────────────────────────────────────────────────
function RoleTab({ roles, search, onSearch, sort, onSortKey, expanded, onExpand, isMobile, isPayg }) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
        <input
          type="text"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search role title or location"
          style={{
            flex: 1, minWidth: 220,
            padding: '10px 14px', borderRadius: 10,
            border: `1px solid ${BD}`, background: CARD,
            fontFamily: F, fontSize: 14, color: TX, outline: 'none',
          }}
        />
        <span style={{ fontFamily: FM, fontSize: 12, color: TX3 }}>{roles.length} role{roles.length === 1 ? '' : 's'}</span>
      </div>

      {roles.length === 0 ? (
        <EmptyState title="No roles match" body="Try clearing the search or creating a new assessment." cta={{ href: '/assessment/new', label: 'New assessment' }} />
      ) : isMobile ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {roles.map(r => <RoleCard key={r.id} r={r} expanded={expanded === `role:${r.id}`} onExpand={() => onExpand(expanded === `role:${r.id}` ? null : `role:${r.id}`)} />)}
        </div>
      ) : (
        <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <colgroup>
              <col style={{ width: '24%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '9%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '11%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '6%' }} />
            </colgroup>
            <thead>
              <tr style={{ borderBottom: `1px solid ${BD}` }}>
                <SortHeader k="role_title" label="Role" sort={sort} onSortKey={onSortKey} />
                <SortHeader k="employment_type" label="Type" sort={sort} onSortKey={onSortKey} />
                <SortHeader k="total" label="Sent" sort={sort} onSortKey={onSortKey} align="right" />
                <SortHeader k="completed" label="Completed" sort={sort} onSortKey={onSortKey} align="right" />
                <SortHeader k="recommended" label="Recommended" sort={sort} onSortKey={onSortKey} align="right" />
                <SortHeader k="active" label="Active" sort={sort} onSortKey={onSortKey} align="right" />
                <SortHeader k="hires" label="Hires" sort={sort} onSortKey={onSortKey} align="right" />
                <SortHeader k="avg" label="Avg" sort={sort} onSortKey={onSortKey} align="right" />
                <SortHeader k="passRate" label="Pass" sort={sort} onSortKey={onSortKey} align="right" />
                <SortHeader k="status" label="Status" sort={sort} onSortKey={onSortKey} />
              </tr>
            </thead>
            <tbody>
              {roles.map((r, i) => (
                <RoleRow key={r.id} r={r} last={i === roles.length - 1} expanded={expanded === `role:${r.id}`} onExpand={() => onExpand(expanded === `role:${r.id}` ? null : `role:${r.id}`)} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function RoleRow({ r, last, expanded, onExpand }) {
  return (
    <>
      <tr
        onClick={onExpand}
        style={{
          borderBottom: last && !expanded ? 'none' : `1px solid ${BD}`,
          background: expanded ? '#f0fdfb' : CARD,
          cursor: 'pointer',
        }}
      >
        <td style={{ padding: '10px 8px', fontFamily: F, fontSize: 13.5, fontWeight: 700, color: NAVY, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {r.role_title}
          {r.client_name ? <span style={{ display: 'block', fontFamily: F, fontSize: 11.5, fontWeight: 500, color: TX3 }}>{r.client_name}{r.location ? ` · ${r.location}` : ''}</span> : r.location ? <span style={{ display: 'block', fontFamily: F, fontSize: 11.5, fontWeight: 500, color: TX3 }}>{r.location}</span> : null}
        </td>
        <td style={{ padding: '10px 8px', fontFamily: FM, fontSize: 12, color: TX2 }}>{r.employment_type}</td>
        <td style={{ padding: '10px 8px', fontFamily: FM, fontSize: 13, color: TX, textAlign: 'right' }}>{r.total}</td>
        <td style={{ padding: '10px 8px', fontFamily: FM, fontSize: 13, color: TX, textAlign: 'right' }}>{r.completed}</td>
        <td style={{ padding: '10px 8px', fontFamily: FM, fontSize: 13, color: r.recommended > 0 ? TEALD : TX, fontWeight: r.recommended > 0 ? 700 : 400, textAlign: 'right' }}>{r.recommended}</td>
        <td style={{ padding: '10px 8px', fontFamily: FM, fontSize: 13, color: TX, textAlign: 'right' }}>{r.active}</td>
        <td style={{ padding: '10px 8px', fontFamily: FM, fontSize: 13, color: TX, textAlign: 'right' }}>{r.hires}</td>
        <td style={{ padding: '10px 8px', fontFamily: FM, fontSize: 13, color: TX, textAlign: 'right' }}>{r.avg ?? '—'}</td>
        <td style={{ padding: '10px 8px', fontFamily: FM, fontSize: 13, color: TX, textAlign: 'right' }}>{r.passRate != null ? `${r.passRate}%` : '—'}</td>
        <td style={{ padding: '10px 8px' }}><StatusPill value={r.status} /></td>
      </tr>
      {expanded ? <RoleExpandedRow r={r} colSpan={10} /> : null}
    </>
  )
}

function RoleExpandedRow({ r, colSpan }) {
  const top = (r.candidates || []).slice(0, 5)
  return (
    <tr style={{ background: '#f8fafc', borderBottom: `1px solid ${BD}` }}>
      <td colSpan={colSpan} style={{ padding: '14px 16px' }}>
        <div style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
          Top candidates &middot; {r.role_title}
        </div>
        {top.length === 0 ? (
          <div style={{ fontFamily: F, fontSize: 13, color: TX3, fontStyle: 'italic' }}>No candidates yet.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {top.map(c => (
              <a key={c.id} href={`/assessment/${r.id}/candidate/${c.id}`} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '8px 12px', borderRadius: 8,
                background: CARD, border: `1px solid ${BD}`,
                fontFamily: F, fontSize: 13, color: TX, textDecoration: 'none',
              }}>
                <span style={{ flex: 1, fontWeight: 700, color: NAVY }}>{c.name}</span>
                <span style={{ fontFamily: FM, fontSize: 12, color: TX2 }}>{c.status}</span>
                {c.results?.[0]?.overall_score != null ? (
                  <span style={{ fontFamily: FM, fontSize: 12, fontWeight: 700, color: c.results[0].overall_score >= 70 ? TEALD : TX2 }}>
                    {c.results[0].overall_score}
                  </span>
                ) : null}
              </a>
            ))}
          </div>
        )}
      </td>
    </tr>
  )
}

function RoleCard({ r, expanded, onExpand }) {
  return (
    <div onClick={onExpand} style={{
      background: CARD, border: `1px solid ${BD}`, borderRadius: 10,
      padding: 14, cursor: 'pointer',
      borderTop: `3px solid ${expanded ? TEAL : BD}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'baseline', marginBottom: 6 }}>
        <div>
          <div style={{ fontFamily: F, fontSize: 14, fontWeight: 800, color: NAVY }}>{r.role_title}</div>
          {r.client_name || r.location ? (
            <div style={{ fontFamily: F, fontSize: 12, color: TX3 }}>{r.client_name || ''}{r.client_name && r.location ? ' · ' : ''}{r.location || ''}</div>
          ) : null}
        </div>
        <StatusPill value={r.status} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, marginTop: 8 }}>
        <Metric label="Sent" value={r.total} />
        <Metric label="Completed" value={r.completed} />
        <Metric label="Recommended" value={r.recommended} highlight={r.recommended > 0} />
        <Metric label="Active" value={r.active} />
        <Metric label="Hires" value={r.hires} />
        <Metric label="Avg" value={r.avg ?? '—'} />
      </div>
      {expanded ? <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px dashed ${BD}` }}><RoleExpandedInline r={r} /></div> : null}
    </div>
  )
}

function RoleExpandedInline({ r }) {
  const top = (r.candidates || []).slice(0, 5)
  if (top.length === 0) return <div style={{ fontFamily: F, fontSize: 12.5, color: TX3, fontStyle: 'italic' }}>No candidates yet.</div>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {top.map(c => (
        <a key={c.id} href={`/assessment/${r.id}/candidate/${c.id}`} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          fontFamily: F, fontSize: 12.5, color: TX, textDecoration: 'none',
        }}>
          <span style={{ flex: 1, fontWeight: 700, color: NAVY }}>{c.name}</span>
          {c.results?.[0]?.overall_score != null ? <span style={{ fontFamily: FM, fontWeight: 700, color: c.results[0].overall_score >= 70 ? TEALD : TX2 }}>{c.results[0].overall_score}</span> : null}
        </a>
      ))}
    </div>
  )
}

function Metric({ label, value, highlight }) {
  return (
    <div>
      <div style={{ fontFamily: FM, fontSize: 10, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <div style={{ fontFamily: FM, fontSize: 16, fontWeight: 800, color: highlight ? TEALD : NAVY }}>{value}</div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Tab 2: By Client
// ─────────────────────────────────────────────────────────────────────
function ClientTab({ clients, sort, onSortKey, expanded, onExpand, isMobile }) {
  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {clients.map(c => (
          <div key={c.name} onClick={() => onExpand(expanded === `client:${c.name}` ? null : `client:${c.name}`)} style={{
            background: CARD, border: `1px solid ${BD}`, borderRadius: 10, padding: 14, cursor: 'pointer',
          }}>
            <div style={{ fontFamily: F, fontSize: 14, fontWeight: 800, color: NAVY }}>{c.name}</div>
            {c.sector ? <div style={{ fontFamily: F, fontSize: 12, color: TX3 }}>{c.sector}</div> : null}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, marginTop: 8 }}>
              <Metric label="Open roles" value={c.open_roles} />
              <Metric label="Sent" value={c.total_assessments} />
              <Metric label="Completed" value={c.completed} />
              <Metric label="Hires" value={c.hires} />
              <Metric label="Rebate window" value={c.rebate_window} />
            </div>
            {expanded === `client:${c.name}` ? <ClientExpandedInline c={c} /> : null}
          </div>
        ))}
      </div>
    )
  }
  return (
    <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 12, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${BD}` }}>
            <SortHeader k="name" label="Client" sort={sort} onSortKey={onSortKey} />
            <SortHeader k="open_roles" label="Roles open" sort={sort} onSortKey={onSortKey} align="right" />
            <SortHeader k="total_assessments" label="Sent" sort={sort} onSortKey={onSortKey} align="right" />
            <SortHeader k="completed" label="Completed" sort={sort} onSortKey={onSortKey} align="right" />
            <SortHeader k="hires" label="Hires" sort={sort} onSortKey={onSortKey} align="right" />
            <SortHeader k="rebate_window" label="Rebate window" sort={sort} onSortKey={onSortKey} align="right" />
            <SortHeader k="last_activity_at" label="Last activity" sort={sort} onSortKey={onSortKey} />
          </tr>
        </thead>
        <tbody>
          {clients.map((c, i) => {
            const isExp = expanded === `client:${c.name}`
            return (
              <Fragment key={c.name}>
                <tr onClick={() => onExpand(isExp ? null : `client:${c.name}`)} style={{
                  borderBottom: i < clients.length - 1 || isExp ? `1px solid ${BD}` : 'none',
                  background: isExp ? '#f0fdfb' : CARD, cursor: 'pointer',
                }}>
                  <td style={{ padding: '10px 8px', fontFamily: F, fontSize: 13.5, fontWeight: 700, color: NAVY }}>
                    {c.name}
                    {c.sector ? <span style={{ display: 'block', fontFamily: F, fontSize: 11.5, fontWeight: 500, color: TX3 }}>{c.sector}</span> : null}
                  </td>
                  <td style={{ padding: '10px 8px', fontFamily: FM, fontSize: 13, color: TX, textAlign: 'right' }}>{c.open_roles}</td>
                  <td style={{ padding: '10px 8px', fontFamily: FM, fontSize: 13, color: TX, textAlign: 'right' }}>{c.total_assessments}</td>
                  <td style={{ padding: '10px 8px', fontFamily: FM, fontSize: 13, color: TX, textAlign: 'right' }}>{c.completed}</td>
                  <td style={{ padding: '10px 8px', fontFamily: FM, fontSize: 13, color: TX, textAlign: 'right' }}>{c.hires}</td>
                  <td style={{ padding: '10px 8px', fontFamily: FM, fontSize: 13, color: c.rebate_window > 0 ? TEALD : TX, textAlign: 'right' }}>{c.rebate_window}</td>
                  <td style={{ padding: '10px 8px', fontFamily: FM, fontSize: 12, color: TX2 }}>{c.last_activity_at ? new Date(c.last_activity_at).toLocaleDateString('en-GB') : '—'}</td>
                </tr>
                {isExp ? (
                  <tr style={{ background: '#f8fafc' }}>
                    <td colSpan={7} style={{ padding: '14px 16px' }}><ClientExpandedInline c={c} /></td>
                  </tr>
                ) : null}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function ClientExpandedInline({ c }) {
  if (!c.roles || c.roles.length === 0) {
    return <div style={{ fontFamily: F, fontSize: 13, color: TX3, fontStyle: 'italic' }}>No roles open for this client right now.</div>
  }
  return (
    <div>
      <div style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Roles for {c.name}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {c.roles.map(r => (
          <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 0', fontFamily: F, fontSize: 13, color: TX }}>
            <span style={{ flex: 1, fontWeight: 700, color: NAVY }}>{r.role_title}</span>
            <span style={{ fontFamily: FM, fontSize: 12, color: TX2 }}>{r.location || '—'}</span>
            <span style={{ fontFamily: FM, fontSize: 12, color: TX2 }}>{r.completed}/{r.total}</span>
            <StatusPill value={r.status} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Tab 3: By Team Member
// ─────────────────────────────────────────────────────────────────────
function TeamTab({ team, sort, onSortKey, expanded, onExpand, isMobile }) {
  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {team.map(t => (
          <div key={t.id} style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 10, padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
              <div>
                <div style={{ fontFamily: F, fontSize: 14, fontWeight: 800, color: NAVY }}>{t.name}</div>
                <div style={{ fontFamily: F, fontSize: 12, color: TX3, textTransform: 'capitalize' }}>{t.role}</div>
              </div>
              <span style={{ fontFamily: FM, fontSize: 11, color: TX3 }}>{t.last_activity ? new Date(t.last_activity).toLocaleDateString('en-GB') : '—'}</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
              <Metric label="Active" value={t.active_assessments} />
              <Metric label="Done this month" value={t.completed_this_month} />
              <Metric label="Recommended" value={t.recommended} highlight={t.recommended > 0} />
              <Metric label="Hires" value={t.hires} />
              <Metric label="Avg score" value={t.avg_score ?? '—'} />
            </div>
          </div>
        ))}
      </div>
    )
  }
  return (
    <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 12, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${BD}` }}>
            <SortHeader k="name" label="Team member" sort={sort} onSortKey={onSortKey} />
            <SortHeader k="role" label="Role" sort={sort} onSortKey={onSortKey} />
            <SortHeader k="active_assessments" label="Active" sort={sort} onSortKey={onSortKey} align="right" />
            <SortHeader k="completed_this_month" label="Done this month" sort={sort} onSortKey={onSortKey} align="right" />
            <SortHeader k="recommended" label="Recommended" sort={sort} onSortKey={onSortKey} align="right" />
            <SortHeader k="hires" label="Hires" sort={sort} onSortKey={onSortKey} align="right" />
            <SortHeader k="avg_score" label="Avg score" sort={sort} onSortKey={onSortKey} align="right" />
            <SortHeader k="last_activity" label="Last active" sort={sort} onSortKey={onSortKey} />
          </tr>
        </thead>
        <tbody>
          {team.map((t, i) => (
            <tr key={t.id} style={{ borderBottom: i < team.length - 1 ? `1px solid ${BD}` : 'none', background: CARD }}>
              <td style={{ padding: '10px 8px', fontFamily: F, fontSize: 13.5, fontWeight: 700, color: NAVY }}>
                {t.name}
                <span style={{ display: 'block', fontFamily: F, fontSize: 11.5, color: TX3, fontWeight: 500 }}>{t.email}</span>
              </td>
              <td style={{ padding: '10px 8px', fontFamily: FM, fontSize: 12, color: TX2, textTransform: 'capitalize' }}>{t.role}</td>
              <td style={{ padding: '10px 8px', fontFamily: FM, fontSize: 13, color: TX, textAlign: 'right' }}>{t.active_assessments}</td>
              <td style={{ padding: '10px 8px', fontFamily: FM, fontSize: 13, color: TX, textAlign: 'right' }}>{t.completed_this_month}</td>
              <td style={{ padding: '10px 8px', fontFamily: FM, fontSize: 13, color: t.recommended > 0 ? TEALD : TX, fontWeight: t.recommended > 0 ? 700 : 400, textAlign: 'right' }}>{t.recommended}</td>
              <td style={{ padding: '10px 8px', fontFamily: FM, fontSize: 13, color: TX, textAlign: 'right' }}>{t.hires}</td>
              <td style={{ padding: '10px 8px', fontFamily: FM, fontSize: 13, color: TX, textAlign: 'right' }}>{t.avg_score ?? '—'}</td>
              <td style={{ padding: '10px 8px', fontFamily: FM, fontSize: 12, color: TX2 }}>{t.last_activity ? new Date(t.last_activity).toLocaleDateString('en-GB') : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────
// Tab 4: By Location
// ─────────────────────────────────────────────────────────────────────
function LocationTab({ rows, sort, onSortKey, expanded, onExpand, isMobile }) {
  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {rows.map(loc => {
          const isExp = expanded === `loc:${loc.location}`
          return (
            <div key={loc.location} onClick={() => onExpand(isExp ? null : `loc:${loc.location}`)} style={{
              background: CARD, border: `1px solid ${BD}`, borderRadius: 10, padding: 14, cursor: 'pointer',
              borderTop: `3px solid ${isExp ? TEAL : BD}`,
            }}>
              <div style={{ fontFamily: F, fontSize: 14, fontWeight: 800, color: NAVY, marginBottom: 6 }}>{loc.location}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6 }}>
                <Metric label="Sent" value={loc.total_assessments} />
                <Metric label="Completed" value={loc.completed} />
                <Metric label="Hires" value={loc.hires} />
                <Metric label="Avg" value={loc.avg ?? '—'} />
                <Metric label="Active roles" value={loc.active_roles} />
              </div>
              {isExp ? (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: `1px dashed ${BD}`, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {loc.roles.map(r => (
                    <div key={r.id} style={{ fontFamily: F, fontSize: 12.5, color: TX }}>
                      <b style={{ color: NAVY }}>{r.role_title}</b> · {r.completed}/{r.total} done
                    </div>
                  ))}
                </div>
              ) : null}
            </div>
          )
        })}
      </div>
    )
  }
  return (
    <div style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 12, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: `1px solid ${BD}` }}>
            <SortHeader k="location" label="Location" sort={sort} onSortKey={onSortKey} />
            <SortHeader k="total_assessments" label="Sent" sort={sort} onSortKey={onSortKey} align="right" />
            <SortHeader k="completed" label="Completed" sort={sort} onSortKey={onSortKey} align="right" />
            <SortHeader k="hires" label="Hires" sort={sort} onSortKey={onSortKey} align="right" />
            <SortHeader k="avg" label="Avg score" sort={sort} onSortKey={onSortKey} align="right" />
            <SortHeader k="active_roles" label="Active roles" sort={sort} onSortKey={onSortKey} align="right" />
          </tr>
        </thead>
        <tbody>
          {rows.map((loc, i) => {
            const isExp = expanded === `loc:${loc.location}`
            return (
              <Fragment key={loc.location}>
                <tr onClick={() => onExpand(isExp ? null : `loc:${loc.location}`)} style={{
                  borderBottom: i < rows.length - 1 || isExp ? `1px solid ${BD}` : 'none',
                  background: isExp ? '#f0fdfb' : CARD, cursor: 'pointer',
                }}>
                  <td style={{ padding: '10px 8px', fontFamily: F, fontSize: 13.5, fontWeight: 700, color: NAVY }}>{loc.location}</td>
                  <td style={{ padding: '10px 8px', fontFamily: FM, fontSize: 13, color: TX, textAlign: 'right' }}>{loc.total_assessments}</td>
                  <td style={{ padding: '10px 8px', fontFamily: FM, fontSize: 13, color: TX, textAlign: 'right' }}>{loc.completed}</td>
                  <td style={{ padding: '10px 8px', fontFamily: FM, fontSize: 13, color: TX, textAlign: 'right' }}>{loc.hires}</td>
                  <td style={{ padding: '10px 8px', fontFamily: FM, fontSize: 13, color: TX, textAlign: 'right' }}>{loc.avg ?? '—'}</td>
                  <td style={{ padding: '10px 8px', fontFamily: FM, fontSize: 13, color: TX, textAlign: 'right' }}>{loc.active_roles}</td>
                </tr>
                {isExp ? (
                  <tr style={{ background: '#f8fafc' }}>
                    <td colSpan={6} style={{ padding: '14px 16px' }}>
                      <div style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Roles in {loc.location}</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {loc.roles.map(r => (
                          <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, fontFamily: F, fontSize: 13, color: TX }}>
                            <span style={{ flex: 1, fontWeight: 700, color: NAVY }}>{r.role_title}</span>
                            <span style={{ fontFamily: FM, fontSize: 12, color: TX2 }}>{r.completed}/{r.total} done</span>
                            <StatusPill value={r.status} />
                          </div>
                        ))}
                      </div>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// React Fragment alias so the grouped <tr> pairs above stay valid JSX
// without pulling in <></> braces inline (clearer in tables).
function Fragment({ children }) { return <>{children}</> }
