'use client'

// Lesson Plan, education shell.
//
// Receives block_content.lesson_brief, shared_materials and
// planted_considerations from the education scenario generator. The UI
// adapts to the lesson_brief.scope:
//
//   support_one_pupil    (TA)            — write a one-pupil support plan
//   single_lesson        (Class Teacher) — full 50-minute lesson plan
//   unit_sequence        (HoD)           — single lesson plus a 6-8 lesson sequence outline
//   review_colleague_plan (SLT)          — review a colleague's plan with strengths and development areas
//
// Every scope captures: learning intention, success criteria, three
// differentiation strategies, AfL approach, and resources or risks.
// Unit_sequence adds a sequence outline. Review_colleague_plan swaps
// inputs for strengths and development areas.
//
// Tone: UK National Curriculum framing only. No claim of authoritative
// pedagogy. Anonymised, no real schools or exam board content.

import { useEffect, useState } from 'react'
import { BLOCK_CATALOGUE } from './catalogue'
import BlockScenarioHeader from '../office/_BlockScenarioHeader'

export const metadata = BLOCK_CATALOGUE['lesson-plan']

const NAVY = '#0f2137'
const TEAL = '#00BFA5'
const TEAL_TINT = '#E6F4F1'
const TX = '#1f2937'
const TX2 = '#475569'
const TX3 = '#64748b'
const BD = '#cbd5e1'
const F = "'Outfit', system-ui, sans-serif"
const FM = "'IBM Plex Mono', monospace"

const SCOPE_LABEL = {
  support_one_pupil:     'Support plan for one pupil',
  single_lesson:         'Full lesson plan',
  unit_sequence:         'Lesson plan with unit sequence',
  review_colleague_plan: 'Review of colleague plan',
}

const LI_MIN = 30
const SC_MIN = 50
const DIFF_MIN = 30
const AFL_MIN = 50
const RES_MIN = 30

export default function LessonPlanBlock({ role_profile, block_content, scenario_context, onComplete }) {
  const brief = block_content?.lesson_brief || null
  const sharedMaterials = block_content?.shared_materials || ''
  const scope = brief?.scope || 'single_lesson'
  const isReview = scope === 'review_colleague_plan'
  const isUnitSequence = scope === 'unit_sequence'
  const isSupportOnePupil = scope === 'support_one_pupil'

  const [learningIntention, setLearningIntention] = useState('')
  const [successCriteria, setSuccessCriteria] = useState('')
  const [diffLow, setDiffLow] = useState('')
  const [diffSen, setDiffSen] = useState('')
  const [diffHigh, setDiffHigh] = useState('')
  const [aflApproach, setAflApproach] = useState('')
  const [resourcesAndRisks, setResourcesAndRisks] = useState('')
  const [unitSequence, setUnitSequence] = useState('')
  const [reviewStrengths, setReviewStrengths] = useState('')
  const [reviewDevelopment, setReviewDevelopment] = useState('')
  const [startedAt] = useState(() => new Date().toISOString())

  useEffect(() => {
    setLearningIntention('')
    setSuccessCriteria('')
    setDiffLow('')
    setDiffSen('')
    setDiffHigh('')
    setAflApproach('')
    setResourcesAndRisks('')
    setUnitSequence('')
    setReviewStrengths('')
    setReviewDevelopment('')
  }, [brief?.topic, scope])

  const liReady = learningIntention.trim().length >= LI_MIN
  const scReady = successCriteria.trim().length >= SC_MIN
  const diffReady = isReview
    ? true
    : (diffLow.trim().length >= DIFF_MIN && diffSen.trim().length >= DIFF_MIN && diffHigh.trim().length >= DIFF_MIN)
  const aflReady = aflApproach.trim().length >= AFL_MIN
  const resReady = resourcesAndRisks.trim().length >= RES_MIN
  const unitReady = isUnitSequence ? unitSequence.trim().length >= 100 : true
  const reviewReady = isReview
    ? (reviewStrengths.trim().length >= 60 && reviewDevelopment.trim().length >= 60)
    : true

  const canSubmit = !!brief
    && (isReview ? (reviewReady && aflReady && resReady) : (liReady && scReady && diffReady && aflReady && resReady && unitReady))

  const handleSubmit = () => {
    const completedAt = new Date().toISOString()
    const time_in_block_seconds = Math.max(
      0,
      Math.round((new Date(completedAt) - new Date(startedAt)) / 1000)
    )
    onComplete && onComplete({
      block_id: 'lesson-plan',
      scope,
      learning_intention: learningIntention.trim(),
      success_criteria: successCriteria.trim(),
      differentiation: isReview ? null : {
        low_middle_high: diffLow.trim(),
        sen: diffSen.trim(),
        eal_high_attainers: diffHigh.trim(),
      },
      assessment_for_learning: aflApproach.trim(),
      resources_and_risks: resourcesAndRisks.trim(),
      unit_sequence: isUnitSequence ? unitSequence.trim() : null,
      review_strengths: isReview ? reviewStrengths.trim() : null,
      review_development_areas: isReview ? reviewDevelopment.trim() : null,
      time_in_block_seconds,
      started_at: startedAt,
      completed_at: completedAt,
    })
  }

  return (
    <div style={{ fontFamily: F }}>
      <BlockScenarioHeader
        scenario_context={scenario_context}
        block_content={block_content}
        blockName="Lesson plan"
      />

      {!brief ? (
        <FallbackPanel block_content={block_content} onComplete={handleSubmit} />
      ) : (
        <>
          <div style={{ maxWidth: 880, margin: '0 auto 14px', fontFamily: F, fontSize: 13, color: TX2, lineHeight: 1.55 }}>
            {scopeIntro(scope)}
          </div>

          <BriefCard brief={brief} sharedMaterials={sharedMaterials} />

          {isReview ? (
            <>
              <Section
                number={1}
                title="Strengths in the colleague's plan"
                hint="Two or three sentences naming what is genuinely strong. Specific to the plan, not generic."
                status={reviewStrengths.trim().length >= 60 ? 'ready' : 'incomplete'}
                counter={`${reviewStrengths.trim().length} / 60`}
              >
                <textarea
                  value={reviewStrengths}
                  onChange={(e) => setReviewStrengths(e.target.value)}
                  rows={3}
                  placeholder="Name the strongest elements of the plan and why they work for this class."
                  style={textareaStyle}
                />
              </Section>

              <Section
                number={2}
                title="Development areas"
                hint="Two or three sentences naming what you would want the colleague to strengthen, with the named gap and the suggested move."
                status={reviewDevelopment.trim().length >= 60 ? 'ready' : 'incomplete'}
                counter={`${reviewDevelopment.trim().length} / 60`}
              >
                <textarea
                  value={reviewDevelopment}
                  onChange={(e) => setReviewDevelopment(e.target.value)}
                  rows={3}
                  placeholder="Name the gap, why it matters for these pupils, and the move you would suggest."
                  style={textareaStyle}
                />
              </Section>

              <Section
                number={3}
                title="Assessment for learning observation"
                hint={`How would you check whether the AfL approach is actually landing? Minimum ${AFL_MIN} characters.`}
                status={aflReady ? 'ready' : 'incomplete'}
                counter={`${aflApproach.trim().length} / ${AFL_MIN}`}
              >
                <textarea
                  value={aflApproach}
                  onChange={(e) => setAflApproach(e.target.value)}
                  rows={3}
                  placeholder="Name the AfL move, the checkpoint, and what evidence would tell you the pupils have grasped the intention."
                  style={textareaStyle}
                />
              </Section>

              <Section
                number={4}
                title="Resources and risks"
                hint={`What resources are needed and what might go wrong. Minimum ${RES_MIN} characters.`}
                status={resReady ? 'ready' : 'incomplete'}
                counter={`${resourcesAndRisks.trim().length} / ${RES_MIN}`}
              >
                <textarea
                  value={resourcesAndRisks}
                  onChange={(e) => setResourcesAndRisks(e.target.value)}
                  rows={3}
                  placeholder="Resources, the named risk, and the mitigation."
                  style={textareaStyle}
                />
              </Section>
            </>
          ) : (
            <>
              <Section
                number={1}
                title="Learning intention"
                hint={`One sentence in pupil-facing language. Minimum ${LI_MIN} characters.`}
                status={liReady ? 'ready' : 'incomplete'}
                counter={`${learningIntention.trim().length} / ${LI_MIN}`}
              >
                <textarea
                  value={learningIntention}
                  onChange={(e) => setLearningIntention(e.target.value)}
                  rows={2}
                  placeholder="By the end of the lesson, pupils will..."
                  style={textareaStyle}
                />
              </Section>

              <Section
                number={2}
                title="Success criteria"
                hint={`Two or three pupil-facing statements. Minimum ${SC_MIN} characters.`}
                status={scReady ? 'ready' : 'incomplete'}
                counter={`${successCriteria.trim().length} / ${SC_MIN}`}
              >
                <textarea
                  value={successCriteria}
                  onChange={(e) => setSuccessCriteria(e.target.value)}
                  rows={3}
                  placeholder="I can... / I can explain... / I can demonstrate..."
                  style={textareaStyle}
                />
              </Section>

              <Section
                number={3}
                title="Three differentiation strategies"
                hint={`A strategy each for low / middle / high attainers, for a SEN pupil, and for an EAL pupil. Minimum ${DIFF_MIN} characters per box.`}
                status={diffReady ? 'ready' : 'incomplete'}
              >
                <SubLabel>Low, middle, high attainers</SubLabel>
                <textarea
                  value={diffLow}
                  onChange={(e) => setDiffLow(e.target.value)}
                  rows={2}
                  placeholder="A scaffold for low attainers; the core task for middle; an extension for high."
                  style={textareaStyle}
                />
                <SubLabel>SEN pupil</SubLabel>
                <textarea
                  value={diffSen}
                  onChange={(e) => setDiffSen(e.target.value)}
                  rows={2}
                  placeholder="The named adjustment, with reference to a specific pupil from the roster if helpful."
                  style={textareaStyle}
                />
                <SubLabel>EAL pupil</SubLabel>
                <textarea
                  value={diffHigh}
                  onChange={(e) => setDiffHigh(e.target.value)}
                  rows={2}
                  placeholder="The language scaffold, dual coding, or peer support strategy."
                  style={textareaStyle}
                />
              </Section>

              <Section
                number={4}
                title="Assessment for learning approach"
                hint={`The AfL move you would use mid-lesson and at the end. Minimum ${AFL_MIN} characters.`}
                status={aflReady ? 'ready' : 'incomplete'}
                counter={`${aflApproach.trim().length} / ${AFL_MIN}`}
              >
                <textarea
                  value={aflApproach}
                  onChange={(e) => setAflApproach(e.target.value)}
                  rows={3}
                  placeholder="Cold-call sample, mini-whiteboards, exit ticket, hinge question..."
                  style={textareaStyle}
                />
              </Section>

              <Section
                number={5}
                title="Resources and risks"
                hint={`The resources you need and one risk you would plan around. Minimum ${RES_MIN} characters.`}
                status={resReady ? 'ready' : 'incomplete'}
                counter={`${resourcesAndRisks.trim().length} / ${RES_MIN}`}
              >
                <textarea
                  value={resourcesAndRisks}
                  onChange={(e) => setResourcesAndRisks(e.target.value)}
                  rows={3}
                  placeholder={isSupportOnePupil
                    ? "Resources for the pupil and the risk you would flag to the teacher."
                    : "Materials, room set-up, and the named risk plus mitigation."}
                  style={textareaStyle}
                />
              </Section>

              {isUnitSequence ? (
                <Section
                  number={6}
                  title="Unit sequence: 6-8 lessons"
                  hint="A short outline of the lesson sequence this lesson sits within. One line per lesson naming the focus and how it builds. Minimum 100 characters."
                  status={unitReady ? 'ready' : 'incomplete'}
                  counter={`${unitSequence.trim().length} / 100`}
                >
                  <textarea
                    value={unitSequence}
                    onChange={(e) => setUnitSequence(e.target.value)}
                    rows={6}
                    placeholder="L1: ... / L2: ... / L3: ..."
                    style={textareaStyle}
                  />
                </Section>
              ) : null}
            </>
          )}

          <SubmitFooter canSubmit={canSubmit} onSubmit={handleSubmit} />
        </>
      )}
    </div>
  )
}

function scopeIntro(scope) {
  if (scope === 'support_one_pupil') return 'Plan how you would support the named pupil in this lesson. The teacher has shared the lesson context below.'
  if (scope === 'unit_sequence') return 'Plan the lesson and outline the 6 to 8 lesson sequence it sits within. The class context is below.'
  if (scope === 'review_colleague_plan') return 'Review the colleague plan below. Name the strengths and the development areas, then comment on AfL and resources.'
  return 'Plan the lesson described below. Cover the learning intention, success criteria, three differentiation strategies, AfL approach, and resources or risks.'
}

function BriefCard({ brief, sharedMaterials }) {
  return (
    <div style={{
      maxWidth: 880, margin: '0 auto 14px',
      background: '#fff', border: `1px solid ${BD}`, borderLeft: `4px solid ${TEAL}`,
      borderRadius: 10, padding: 14,
    }}>
      <div style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: TEAL, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
        {SCOPE_LABEL[brief.scope] || 'Lesson plan'}
      </div>
      <div style={{ fontFamily: F, fontSize: 16, fontWeight: 700, color: NAVY, lineHeight: 1.35, marginBottom: 6 }}>
        {brief.subject}{brief.year_group ? ` — ${brief.year_group}` : ''}
      </div>
      {brief.topic ? (
        <div style={{ fontFamily: F, fontSize: 14, color: TX, marginBottom: 8 }}>
          <b>Topic:</b> {brief.topic}
        </div>
      ) : null}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 10 }}>
        <Meta k="Duration" v={brief.duration_minutes ? `${brief.duration_minutes} min` : ''} />
        <Meta k="Year group" v={brief.year_group} />
        <Meta k="Constraint" v={brief.constraint} />
      </div>
      {brief.class_context ? (
        <div style={{
          background: '#f8fafc', border: `1px solid ${BD}`, borderRadius: 8, padding: 10, marginTop: 6,
        }}>
          <div style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
            Class context
          </div>
          <div style={{ fontFamily: F, fontSize: 13, color: NAVY, lineHeight: 1.55 }}>
            {brief.class_context}
          </div>
        </div>
      ) : null}
      {sharedMaterials ? (
        <div style={{
          background: TEAL_TINT, border: `1px solid ${TEAL}55`, borderRadius: 8, padding: 10, marginTop: 8,
        }}>
          <div style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: '#0e6e63', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>
            {brief.scope === 'review_colleague_plan' ? 'Colleague plan to review' : 'Shared by the teacher / department'}
          </div>
          <div style={{ fontFamily: F, fontSize: 13, color: NAVY, lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
            {sharedMaterials}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function Meta({ k, v }) {
  if (!v) return null
  return (
    <div>
      <div style={{ fontFamily: FM, fontSize: 10.5, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 3 }}>{k}</div>
      <div style={{ fontFamily: F, fontSize: 13, color: NAVY, lineHeight: 1.45 }}>{v}</div>
    </div>
  )
}

function SubLabel({ children }) {
  return (
    <div style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: TX3, textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 8, marginBottom: 4 }}>
      {children}
    </div>
  )
}

const textareaStyle = {
  width: '100%', boxSizing: 'border-box',
  fontFamily: F, fontSize: 13.5, color: NAVY, lineHeight: 1.55,
  padding: 10, borderRadius: 8,
  border: `1px solid ${BD}`, background: '#f8fafc',
  outline: 'none', resize: 'vertical',
}

function Section({ number, title, hint, status, counter, children }) {
  return (
    <div style={{
      maxWidth: 880, margin: '0 auto 12px',
      background: '#fff', border: `1px solid ${BD}`, borderRadius: 10, padding: 14,
    }}>
      <div style={{
        display: 'flex', alignItems: 'baseline', justifyContent: 'space-between',
        gap: 8, marginBottom: 4, flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span aria-hidden="true" style={{
            width: 22, height: 22, borderRadius: '50%',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: FM, fontSize: 11, fontWeight: 700,
            background: status === 'ready' ? TEAL : '#f1f5f9',
            color: status === 'ready' ? '#fff' : TX3,
            border: `1px solid ${status === 'ready' ? TEAL : BD}`,
          }}>
            {number}
          </span>
          <span style={{ fontFamily: F, fontSize: 14, fontWeight: 700, color: NAVY }}>
            {title}
          </span>
        </div>
        {counter ? (
          <span style={{ fontFamily: FM, fontSize: 11, color: status === 'ready' ? TEAL : TX3 }}>
            {counter}
          </span>
        ) : null}
      </div>
      {hint ? (
        <div style={{ fontFamily: F, fontSize: 12.5, color: TX3, lineHeight: 1.45, marginBottom: 8 }}>
          {hint}
        </div>
      ) : null}
      {children}
    </div>
  )
}

function SubmitFooter({ canSubmit, onSubmit }) {
  return (
    <div style={{
      maxWidth: 880, margin: '0 auto', padding: 16,
      background: '#fff', border: `1px solid ${BD}`, borderRadius: 10,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap',
    }}>
      <div style={{ fontFamily: F, fontSize: 13, color: TX2 }}>
        Submit when each section is complete.
      </div>
      <button
        type="button"
        onClick={onSubmit}
        disabled={!canSubmit}
        style={{
          fontFamily: F, fontSize: 14, fontWeight: 700,
          padding: '10px 18px', borderRadius: 8, border: 'none',
          background: canSubmit ? TEAL : '#cbd5e1', color: '#fff',
          cursor: canSubmit ? 'pointer' : 'not-allowed',
        }}
      >
        Continue
      </button>
    </div>
  )
}

function FallbackPanel({ block_content, onComplete }) {
  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: 22, background: '#fff', border: `1px solid ${BD}`, borderRadius: 10, fontFamily: F }}>
      <div style={{ fontFamily: FM, fontSize: 11, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
        Lesson brief missing
      </div>
      <p style={{ fontFamily: F, fontSize: 14, color: TX2, lineHeight: 1.55, marginBottom: 14 }}>
        Re-generate the workspace_scenario to populate the typed lesson brief. Showing the scenario summary below.
      </p>
      {block_content?.setup ? (
        <div style={{ background: '#f8fafc', border: `1px solid ${BD}`, borderRadius: 8, padding: 12, marginBottom: 12, fontFamily: F, fontSize: 13, color: NAVY, lineHeight: 1.55 }}>
          {block_content.setup}
        </div>
      ) : null}
      <button
        type="button"
        onClick={() => onComplete && onComplete({
          block_id: 'lesson-plan',
          fallback: true,
          completed_at: new Date().toISOString(),
        })}
        style={{
          fontFamily: F, fontSize: 14, fontWeight: 700,
          padding: '10px 18px', borderRadius: 8, border: 'none',
          background: TEAL, color: '#fff', cursor: 'pointer',
        }}
      >
        Skip block
      </button>
    </div>
  )
}
