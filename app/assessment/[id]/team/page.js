'use client'
import { useState, useEffect, useSyncExternalStore } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import { Ic } from '@/components/Icons'
import {
  NAVY, TEAL, TEALD, TEALLT, BG, CARD, BD, TX, TX2, TX3,
  GRN, GRNBG, GRNBD, AMB, AMBBG, RED, REDBG,
  F, FM,
} from '@/lib/constants'

const _mSub = (cb) => { window.addEventListener('resize', cb); return () => window.removeEventListener('resize', cb) }
const _mSnap = () => window.innerWidth <= 768
const _mServer = () => false
function useIsMobile() { return useSyncExternalStore(_mSub, _mSnap, _mServer) }

const QUESTIONS = [
  {
    key: 'conflict_style',
    label: 'How do they handle conflict?',
    options: [
      { value: 'direct', label: 'They address it directly and quickly' },
      { value: 'consensus', label: 'They prefer to find consensus before acting' },
      { value: 'avoidant', label: 'They tend to avoid conflict where possible' },
    ],
  },
  {
    key: 'working_pace',
    label: 'What is their working pace?',
    options: [
      { value: 'fast', label: 'Fast moving, decides quickly, iterates as they go' },
      { value: 'measured', label: 'Measured, thinks things through before acting' },
      { value: 'methodical', label: 'Methodical, follows process carefully' },
    ],
  },
  {
    key: 'struggle_area',
    label: 'Where do they struggle most?',
    options: [
      { value: 'ambiguity', label: 'Ambiguous situations with no clear answer' },
      { value: 'pressure', label: 'High pressure deadlines with competing priorities' },
      { value: 'relationships', label: 'Managing relationships with difficult stakeholders' },
    ],
  },
  {
    key: 'colleague_needs',
    label: 'What do they need from colleagues?',
    options: [
      { value: 'directness', label: 'Clear communication and direct feedback' },
      { value: 'autonomy', label: 'Autonomy to work in their own way' },
      { value: 'structure', label: 'Structure and clear expectations' },
    ],
  },
  {
    key: 'decision_style',
    label: 'How do they make decisions?',
    options: [
      { value: 'data', label: 'Data first, evidence-based' },
      { value: 'instinct', label: 'Instinct and experience-led' },
      { value: 'consensus', label: 'Consensus-seeking, gets buy-in before deciding' },
    ],
  },
]

// -- CREATE TABLE IF NOT EXISTS team_profiles (id UUID PRIMARY KEY DEFAULT gen_random_uuid(), assessment_id UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE, user_id UUID NOT NULL REFERENCES auth.users(id), member_name TEXT NOT NULL, member_role TEXT, conflict_style TEXT, working_pace TEXT, struggle_area TEXT, colleague_needs TEXT, decision_style TEXT, created_at TIMESTAMPTZ DEFAULT NOW());

export default function TeamProfilePage({ params }) {
  const router = useRouter()
  const isMobile = useIsMobile()
  const [loading, setLoading] = useState(true)
  const [assessment, setAssessment] = useState(null)
  const [members, setMembers] = useState([])
  const [editing, setEditing] = useState(null) // member id or 'new'
  const [form, setForm] = useState({ member_name: '', member_role: '', conflict_style: '', working_pace: '', struggle_area: '', colleague_needs: '', decision_style: '' })
  const [saving, setSaving] = useState(false)
  const [companyName, setCompanyName] = useState('')

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: assess } = await supabase.from('assessments').select('id, role_title').eq('id', params.id).single()
      setAssessment(assess)

      const { data: prof } = await supabase.from('users').select('company_name').eq('id', user.id).maybeSingle()
      if (prof?.company_name) setCompanyName(prof.company_name)

      const { data: teamData } = await supabase
        .from('team_profiles')
        .select('*')
        .eq('assessment_id', params.id)
        .order('created_at')
      if (teamData) setMembers(teamData)
      setLoading(false)
    }
    load()
  }, [params.id])

  async function saveMember() {
    if (!form.member_name.trim()) return
    setSaving(true)
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (editing === 'new') {
      const { data } = await supabase.from('team_profiles').insert({
        assessment_id: params.id,
        user_id: user.id,
        ...form,
      }).select().single()
      if (data) setMembers(prev => [...prev, data])
    } else {
      await supabase.from('team_profiles').update(form).eq('id', editing)
      setMembers(prev => prev.map(m => m.id === editing ? { ...m, ...form } : m))
    }
    setEditing(null)
    setForm({ member_name: '', member_role: '', conflict_style: '', working_pace: '', struggle_area: '', colleague_needs: '', decision_style: '' })
    setSaving(false)
  }

  async function deleteMember(id) {
    const supabase = createClient()
    await supabase.from('team_profiles').delete().eq('id', id)
    setMembers(prev => prev.filter(m => m.id !== id))
  }

  function startEdit(member) {
    setEditing(member.id)
    setForm({
      member_name: member.member_name || '',
      member_role: member.member_role || '',
      conflict_style: member.conflict_style || '',
      working_pace: member.working_pace || '',
      struggle_area: member.struggle_area || '',
      colleague_needs: member.colleague_needs || '',
      decision_style: member.decision_style || '',
    })
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', minHeight: '100vh', background: BG, fontFamily: F }}>
        <Sidebar companyName={companyName} />
        <main style={{ marginLeft: isMobile ? 0 : 220, padding: isMobile ? '72px 16px 32px' : 40, color: TX3 }}>Loading...</main>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: BG, fontFamily: F }}>
      <Sidebar companyName={companyName} />
      <main style={{ marginLeft: isMobile ? 0 : 220, padding: isMobile ? '72px 16px 32px' : '32px 40px', flex: 1, minWidth: 0, maxWidth: 800 }}>

        <button onClick={() => router.push(`/assessment/${params.id}`)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', fontFamily: F, fontSize: 13, fontWeight: 600, color: TX3, padding: 0, marginBottom: 20 }}>
          <Ic name="arrow-left" size={14} color={TX3} /> Back to assessment
        </button>

        <h1 style={{ fontFamily: F, fontSize: 26, fontWeight: 800, color: NAVY, margin: '0 0 8px' }}>Your Team Profile</h1>
        <p style={{ fontFamily: F, fontSize: 15, color: TX2, margin: '0 0 24px', lineHeight: 1.6 }}>
          Tell us about your existing team. Takes 2 minutes per person. Every candidate assessed for {assessment?.role_title || 'this role'} will be compared against your team.
        </p>

        {/* Existing members */}
        {members.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 24 }}>
            {members.map(m => (
              <div key={m.id} style={{ background: CARD, border: `1px solid ${BD}`, borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <div style={{ fontFamily: F, fontSize: 14, fontWeight: 700, color: TX }}>{m.member_name}</div>
                  {m.member_role && <div style={{ fontFamily: F, fontSize: 12, color: TX3 }}>{m.member_role}</div>}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button onClick={() => startEdit(m)} style={{ padding: '5px 12px', borderRadius: 6, border: `1px solid ${BD}`, background: '#fff', color: TX2, fontFamily: F, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Edit</button>
                  <button onClick={() => deleteMember(m.id)} style={{ padding: '5px 12px', borderRadius: 6, border: `1px solid #fecaca`, background: REDBG, color: RED, fontFamily: F, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add / Edit form */}
        {editing ? (
          <div style={{ background: CARD, border: `1px solid ${TEAL}55`, borderRadius: 12, padding: '20px 24px', marginBottom: 20 }}>
            <h3 style={{ fontFamily: F, fontSize: 16, fontWeight: 700, color: NAVY, margin: '0 0 16px' }}>
              {editing === 'new' ? 'Add team member' : 'Edit team member'}
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12, marginBottom: 18 }}>
              <div>
                <label style={{ fontFamily: F, fontSize: 12, fontWeight: 600, color: TX3, display: 'block', marginBottom: 4 }}>Name</label>
                <input value={form.member_name} onChange={e => setForm(p => ({ ...p, member_name: e.target.value }))} style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 8, border: `1px solid ${BD}`, fontFamily: F, fontSize: 14, color: TX, outline: 'none' }} />
              </div>
              <div>
                <label style={{ fontFamily: F, fontSize: 12, fontWeight: 600, color: TX3, display: 'block', marginBottom: 4 }}>Role / title</label>
                <input value={form.member_role} onChange={e => setForm(p => ({ ...p, member_role: e.target.value }))} style={{ width: '100%', boxSizing: 'border-box', padding: '9px 12px', borderRadius: 8, border: `1px solid ${BD}`, fontFamily: F, fontSize: 14, color: TX, outline: 'none' }} />
              </div>
            </div>

            {QUESTIONS.map(q => (
              <div key={q.key} style={{ marginBottom: 16 }}>
                <div style={{ fontFamily: F, fontSize: 13, fontWeight: 700, color: TX, marginBottom: 8 }}>{q.label}</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {q.options.map(opt => (
                    <label key={opt.value} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '8px 12px', borderRadius: 8, background: form[q.key] === opt.value ? TEALLT : BG, border: `1px solid ${form[q.key] === opt.value ? TEAL : BD}`, transition: 'all 0.15s' }}>
                      <input type="radio" name={q.key} value={opt.value} checked={form[q.key] === opt.value} onChange={() => setForm(p => ({ ...p, [q.key]: opt.value }))} style={{ accentColor: TEAL }} />
                      <span style={{ fontFamily: F, fontSize: 13, color: form[q.key] === opt.value ? TEALD : TX2 }}>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}

            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={saveMember} disabled={saving || !form.member_name.trim()} style={{ padding: '10px 24px', borderRadius: 8, border: 'none', background: form.member_name.trim() ? TEAL : BD, color: form.member_name.trim() ? NAVY : TX3, fontFamily: F, fontSize: 14, fontWeight: 700, cursor: form.member_name.trim() ? 'pointer' : 'not-allowed' }}>
                {saving ? 'Saving...' : editing === 'new' ? 'Add to team' : 'Save changes'}
              </button>
              <button onClick={() => { setEditing(null); setForm({ member_name: '', member_role: '', conflict_style: '', working_pace: '', struggle_area: '', colleague_needs: '', decision_style: '' }) }} style={{ padding: '10px 20px', borderRadius: 8, border: `1.5px solid ${BD}`, background: 'transparent', color: TX2, fontFamily: F, fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          members.length < 10 && (
            <button onClick={() => setEditing('new')} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 24px', borderRadius: 10, border: 'none', background: TEAL, color: NAVY, fontFamily: F, fontSize: 15, fontWeight: 800, cursor: 'pointer' }}>
              <Ic name="plus" size={16} color={NAVY} /> Add team member
            </button>
          )
        )}

        {members.length >= 10 && !editing && (
          <p style={{ fontFamily: F, fontSize: 13, color: TX3, marginTop: 12 }}>Maximum 10 team members reached.</p>
        )}
      </main>
    </div>
  )
}
