// ── Document template definitions ────────────────────────────────────────

export const TEMPLATES = [
  // ── SSP DOCUMENTS ──
  {
    id: 'self-certification', name: 'Self-Certification Form', category: 'SSP Documents', for: 'both',
    when: 'When a worker is absent for up to 7 days and self-certification is required.',
    prefilled: ['worker_name', 'company_name', 'absence_start_date'],
    required: [
      { key: 'absence_end_date', label: 'Last day of absence', type: 'date' },
      { key: 'absence_reason', label: 'Brief reason for absence', type: 'text' },
      { key: 'worker_signature_date', label: 'Date of worker signature', type: 'date' },
    ],
 legal: 'SSP 2026, self-certification valid for absences up to 7 days.',
    body: (f) => `SELF-CERTIFICATION FORM\n\nI, ${f.worker_name}, confirm that I was absent from work from ${f.absence_start_date} to ${f.absence_end_date}.\n\nReason for absence: ${f.absence_reason}\n\nI declare that the information given above is correct and complete.\n\nWorker signature: ________________________\nDate: ${f.worker_signature_date}\n\n${f.company_name}`,
  },
  {
    id: 'return-to-work', name: 'Return to Work Interview Form', category: 'SSP Documents', for: 'both',
    when: 'After an absence ends and the worker returns to work.',
    prefilled: ['worker_name', 'role_title', 'return_date', 'company_name'],
    required: [
      { key: 'absence_nature', label: 'Nature of absence discussed', type: 'textarea' },
      { key: 'adjustments_needed', label: 'Any adjustments needed', type: 'textarea' },
 { key: 'fit_to_return', label: 'Worker confirmed fit to return', type: 'select', options: ['Yes', 'No, further discussion needed'] },
    ],
    legal: 'Supports Fair Work Agency compliance.',
    body: (f) => `RETURN TO WORK INTERVIEW\n\nWorker: ${f.worker_name}\nRole: ${f.role_title}\nReturn date: ${f.return_date}\n\nNature of absence discussed:\n${f.absence_nature}\n\nAdjustments needed:\n${f.adjustments_needed}\n\nWorker confirmed fit to return: ${f.fit_to_return}\n\nManager signature: ________________________\nWorker signature: ________________________\nDate: ${f.return_date}\n\n${f.company_name}`,
  },
  {
    id: 'fit-note-request', name: 'Fit Note Request Letter', category: 'SSP Documents', for: 'both',
    when: 'When an absence exceeds 7 days and a fit note is required.',
    prefilled: ['worker_name', 'company_name', 'sick_date'],
    required: [
      { key: 'date_sent', label: 'Date letter sent', type: 'date' },
    ],
 legal: 'SSP 2026, fit note required for absences exceeding 7 calendar days.',
    body: (f) => `Dear ${f.worker_name},\n\nWe are writing regarding your current absence which began on ${f.sick_date}. As your absence has now exceeded 7 calendar days, we require a fit note from your GP or healthcare professional.\n\nPlease arrange for a fit note to be provided at your earliest convenience. Your Statutory Sick Pay will continue pending receipt of the fit note.\n\nIf you have any questions about this request or need support, please contact us.\n\nYours sincerely,\n${f.company_name}\nDate: ${f.date_sent}`,
  },
  {
    id: 'ssp1-form', name: 'SSP1 Form', category: 'SSP Documents', for: 'both',
    when: 'When SSP does not apply or SSP entitlement has been exhausted.',
    prefilled: ['worker_name', 'company_name'],
    required: [
      { key: 'ssp_end_reason', label: 'Reason SSP does not apply', type: 'select', options: ['Worker is between assignments', 'Maximum 28-week entitlement reached', 'Worker does not meet eligibility criteria'] },
      { key: 'ssp_end_date', label: 'Date SSP ended or does not apply from', type: 'date' },
    ],
 legal: 'SSP 2026, employer must issue SSP1 when SSP cannot be paid.',
 body: (f) => `SSP1, END OF SSP NOTIFICATION\n\nWorker name: ${f.worker_name}\nEmployer/agency: ${f.company_name}\n\nStatutory Sick Pay cannot be paid from ${f.ssp_end_date} because ${f.ssp_end_reason.toLowerCase()}.\n\nYou may be able to claim Employment and Support Allowance from the Department for Work and Pensions.\n\nDate issued: ${f.ssp_end_date}\n${f.company_name}`,
  },
  {
    id: 'fit-note-ack', name: 'Fit Note Acknowledgement', category: 'SSP Documents', for: 'both',
    when: 'When a fit note has been received from the worker.',
    prefilled: ['worker_name', 'company_name'],
    required: [
      { key: 'fit_note_date', label: 'Date fit note received', type: 'date' },
      { key: 'recommends_adjustments', label: 'Does the fit note recommend adjustments?', type: 'select', options: ['Yes', 'No'] },
      { key: 'adjustments_detail', label: 'What adjustments will be made (if applicable)', type: 'textarea' },
    ],
    legal: 'Reasonable adjustments must be considered where a fit note recommends them.',
    body: (f) => `Dear ${f.worker_name},\n\nWe confirm receipt of your fit note dated ${f.fit_note_date}. Your Statutory Sick Pay will continue in accordance with the SSP rules.\n\n${f.recommends_adjustments === 'Yes' ? `The fit note recommends adjustments. We will make the following adjustments:\n${f.adjustments_detail}\n` : 'The fit note does not recommend adjustments.\n'}\nIf you have any questions, please contact us.\n\nYours sincerely,\n${f.company_name}`,
  },

  // ── ASSIGNMENT DOCUMENTS (agency) ──
  {
    id: 'assignment-confirmation', name: 'Assignment Confirmation Letter', category: 'Assignment Documents', for: 'agency',
    when: 'When confirming a new assignment for a temporary worker.',
    prefilled: ['worker_name', 'role_title', 'client_company', 'start_date', 'end_date', 'company_name'],
    required: [
      { key: 'hours_per_week', label: 'Hours per week', type: 'text' },
      { key: 'location', label: 'Specific work location', type: 'text' },
      { key: 'line_manager', label: 'Line manager name at client', type: 'text' },
      { key: 'pay_rate', label: 'Pay rate', type: 'text' },
    ],
    legal: 'Agency Workers Regulations 2010, Employment Rights Act 2025 day-one rights.',
    body: (f) => `ASSIGNMENT CONFIRMATION\n\nDear ${f.worker_name},\n\nWe are pleased to confirm your assignment details:\n\nRole: ${f.role_title}\nClient: ${f.client_company}\nStart date: ${f.start_date}\nEnd date: ${f.end_date}\nHours per week: ${f.hours_per_week}\nLocation: ${f.location}\nLine manager: ${f.line_manager}\nPay rate: ${f.pay_rate}\n\n${f.company_name} is your employer of record for PAYE purposes.\n\nYou are entitled to Statutory Sick Pay and family leave (including Paternity Leave and Unpaid Parental Leave) from your first day. There is no qualifying period.\n\nHoliday accrues at 12.07% of hours worked.\n\nYours sincerely,\n${f.company_name}`,
  },
  {
    id: 'assignment-extension', name: 'Assignment Extension Letter', category: 'Assignment Documents', for: 'agency',
    when: 'When extending an existing assignment beyond its original end date.',
    prefilled: ['worker_name', 'role_title', 'end_date', 'company_name'],
    required: [
      { key: 'new_end_date', label: 'New end date', type: 'date' },
      { key: 'extension_reason', label: 'Reason for extension (if worker asks)', type: 'text' },
      { key: 'pay_rate_change', label: 'Any change to pay rate', type: 'text' },
    ],
    legal: 'Agency Workers Regulations 2010.',
    body: (f) => `ASSIGNMENT EXTENSION\n\nDear ${f.worker_name},\n\nWe are writing to confirm that your assignment as ${f.role_title} has been extended.\n\nOriginal end date: ${f.end_date}\nNew end date: ${f.new_end_date}\n${f.pay_rate_change ? `Pay rate: ${f.pay_rate_change}\n` : ''}\n${f.company_name} remains your employer of record for PAYE purposes. Your SSP entitlement and holiday accrual continue without interruption.\n\nYours sincerely,\n${f.company_name}`,
  },
  {
    id: 'assignment-end', name: 'Assignment End Letter', category: 'Assignment Documents', for: 'agency',
    when: 'When an assignment is ending.',
    prefilled: ['worker_name', 'role_title', 'company_name'],
    required: [
      { key: 'last_day', label: 'Last day of assignment', type: 'date' },
      { key: 'end_reason', label: 'Reason for ending', type: 'select', options: ['Client decision', 'Assignment complete', 'Performance concerns'] },
    ],
    legal: 'This letter confirms the end of an assignment. It does not constitute a dismissal.',
    body: (f) => `ASSIGNMENT END CONFIRMATION\n\nDear ${f.worker_name},\n\nWe are writing to confirm that your assignment as ${f.role_title} will end on ${f.last_day}.\n\nReason: ${f.end_reason}.\n\nPlease note:\n- Any outstanding holiday pay will be calculated and included in your final pay\n- Your P45 will follow\n- SSP does not apply between assignments\n- You remain on our books and we will contact you when suitable assignments arise\n\nThis letter confirms the end of an assignment and does not constitute a dismissal.\n\nYours sincerely,\n${f.company_name}`,
  },
  {
    id: 'between-assignments', name: 'Between Assignments Confirmation', category: 'Assignment Documents', for: 'agency',
    when: 'To confirm a worker is between assignments.',
    prefilled: ['worker_name', 'company_name'],
    required: [
      { key: 'confirmation_date', label: 'Date of confirmation', type: 'date' },
    ],
    legal: 'SSP does not apply during periods between assignments.',
    body: (f) => `BETWEEN ASSIGNMENTS CONFIRMATION\n\nDear ${f.worker_name},\n\nThis letter confirms that you are currently between assignments as of ${f.confirmation_date}.\n\nPlease note that Statutory Sick Pay does not apply during periods between assignments. You remain on our books and we will contact you when suitable assignments become available.\n\nYours sincerely,\n${f.company_name}`,
  },

  // ── PROBATION DOCUMENTS (employer) ──
  {
    id: 'probation-review', name: 'Probation Review Letter', category: 'Probation Documents', for: 'employer',
    when: 'For documenting a scheduled probation review meeting.',
    prefilled: ['worker_name', 'role_title', 'start_date', 'company_name'],
    required: [
      { key: 'review_date', label: 'Date of review', type: 'date' },
      { key: 'review_period', label: 'Review period', type: 'select', options: ['Month 1', 'Month 3', 'Month 5'] },
      { key: 'manager_name', label: 'Manager name', type: 'text' },
      { key: 'objectives_discussed', label: 'Objectives discussed', type: 'textarea' },
      { key: 'concerns_raised', label: 'Any concerns raised', type: 'textarea' },
      { key: 'next_review_date', label: 'Next review date', type: 'date' },
    ],
 legal: 'ERA 2025, probation review must be objective and documented.',
 body: (f) => `PROBATION REVIEW, ${f.review_period}\n\nEmployee: ${f.worker_name}\nRole: ${f.role_title}\nStart date: ${f.start_date}\nReview date: ${f.review_date}\nManager: ${f.manager_name}\n\nObjectives discussed:\n${f.objectives_discussed}\n\n${f.concerns_raised ? `Concerns raised:\n${f.concerns_raised}\n\n` : ''}Next review date: ${f.next_review_date}\n\nManager signature: ________________________\nEmployee signature: ________________________\n\n${f.company_name}`,
  },
  {
    id: 'probation-extension', name: 'Probation Extension Letter', category: 'Probation Documents', for: 'employer',
    when: 'When extending a probation period beyond the original end date.',
    prefilled: ['worker_name', 'role_title', 'company_name'],
    required: [
      { key: 'original_end_date', label: 'Original probation end date', type: 'date' },
      { key: 'new_end_date', label: 'New probation end date', type: 'date' },
      { key: 'extension_reason', label: 'Specific reason for extension', type: 'textarea' },
      { key: 'objectives_to_meet', label: 'Objectives to meet during extension', type: 'textarea' },
      { key: 'support_offered', label: 'Support being offered', type: 'textarea' },
    ],
 legal: 'ERA 2025, extension must be based on objective criteria, not protected characteristics.',
    body: (f) => `PROBATION EXTENSION\n\nDear ${f.worker_name},\n\nFollowing your probation review, we are extending your probation period.\n\nRole: ${f.role_title}\nOriginal end date: ${f.original_end_date}\nNew end date: ${f.new_end_date}\n\nReason for extension:\n${f.extension_reason}\n\nObjectives to meet during the extension period:\n${f.objectives_to_meet}\n\nSupport available:\n${f.support_offered}\n\nYours sincerely,\n${f.company_name}`,
  },
  {
    id: 'probation-pass', name: 'Probation Pass Letter', category: 'Probation Documents', for: 'employer',
    when: 'When an employee has successfully completed their probation period.',
    prefilled: ['worker_name', 'role_title', 'start_date', 'company_name'],
    required: [
      { key: 'probation_end_date', label: 'Probation end date', type: 'date' },
    ],
    legal: 'ERA 2025 compliance confirmed.',
    body: (f) => `PROBATION COMPLETION\n\nDear ${f.worker_name},\n\nWe are pleased to confirm that you have successfully completed your probation period.\n\nRole: ${f.role_title}\nStart date: ${f.start_date}\nProbation end date: ${f.probation_end_date}\n\nYour employment continues on the terms set out in your contract. ERA 2025 compliance confirmed.\n\nCongratulations.\n\nYours sincerely,\n${f.company_name}`,
  },
  {
    id: 'probation-fail', name: 'Probation Fail Letter', category: 'Probation Documents', for: 'employer',
    when: 'When dismissing an employee during or at the end of probation.',
    prefilled: ['worker_name', 'role_title', 'start_date', 'company_name'],
    required: [
      { key: 'performance_reasons', label: 'Specific documented performance reasons', type: 'textarea' },
      { key: 'notice_period', label: 'Notice period', type: 'text' },
      { key: 'final_date', label: 'Final date of employment', type: 'date' },
      { key: 'appeal_details', label: 'Right of appeal details', type: 'textarea' },
    ],
 legal: 'ERA 2025, dismissal must be based on objective documented evidence.',
    warning: 'Before issuing this letter seek independent employment law advice. Dismissal during probation carries legal risk under the Employment Rights Act 2025.',
 body: (f) => `TERMINATION OF EMPLOYMENT, PROBATION\n\nDear ${f.worker_name},\n\nFollowing your probation period, we have taken the decision to end your employment.\n\nRole: ${f.role_title}\nStart date: ${f.start_date}\nFinal date of employment: ${f.final_date}\nNotice period: ${f.notice_period}\n\nReasons:\n${f.performance_reasons}\n\nRight of appeal:\n${f.appeal_details}\n\nFinal pay including any outstanding holiday will be processed in accordance with your contract.\n\nYours sincerely,\n${f.company_name}`,
  },

  // ── FAMILY LEAVE ──
  {
    id: 'family-leave-ack', name: 'Family Leave Acknowledgement Letter', category: 'Family Leave Documents', for: 'both',
    when: 'When an employee or worker notifies you of family leave.',
    prefilled: ['worker_name', 'role_title', 'company_name'],
    required: [
      { key: 'notification_date', label: 'Date notification received', type: 'date' },
      { key: 'leave_type', label: 'Type of leave', type: 'select', options: ['Paternity Leave', 'Unpaid Parental Leave', 'Shared Parental Leave'] },
      { key: 'expected_start', label: 'Expected start date', type: 'date' },
      { key: 'expected_duration', label: 'Expected duration', type: 'text' },
    ],
 legal: 'ERA 2025, day-one family leave entitlement, no qualifying period.',
    body: (f) => `FAMILY LEAVE ACKNOWLEDGEMENT\n\nDear ${f.worker_name},\n\nWe acknowledge your notification of ${f.leave_type} received on ${f.notification_date}.\n\nRole: ${f.role_title}\nExpected start: ${f.expected_start}\nExpected duration: ${f.expected_duration}\n\nPlease note that under the Employment Rights Act 2025, you are entitled to ${f.leave_type} from your first day of employment. There is no qualifying period.\n\nYour role will be held for you and we will discuss your return to work arrangements before your leave begins.\n\nYours sincerely,\n${f.company_name}`,
  },

  // ── HOLIDAY ──
  {
    id: 'holiday-pay-statement', name: 'Holiday Pay Statement', category: 'Holiday Documents', for: 'both',
    when: 'To provide a summary of holiday entitlement and usage.',
    prefilled: ['worker_name', 'role_title', 'company_name'],
    required: [
      { key: 'holiday_year_start', label: 'Holiday year start', type: 'date' },
      { key: 'holiday_year_end', label: 'Holiday year end', type: 'date' },
      { key: 'entitlement_days', label: 'Total entitlement (days)', type: 'text' },
      { key: 'days_taken', label: 'Days taken', type: 'text' },
      { key: 'days_remaining', label: 'Days remaining', type: 'text' },
      { key: 'carry_over', label: 'Carry-over days (if any)', type: 'text' },
    ],
    legal: 'Working Time Regulations. Records retained for 6 years (HMRC requirement).',
    body: (f) => `HOLIDAY PAY STATEMENT\n\nWorker/Employee: ${f.worker_name}\nRole: ${f.role_title}\n\nHoliday year: ${f.holiday_year_start} to ${f.holiday_year_end}\n\nTotal entitlement: ${f.entitlement_days} days\nDays taken: ${f.days_taken}\nDays remaining: ${f.days_remaining}\n${f.carry_over && f.carry_over !== '0' ? `Carry-over: ${f.carry_over} days\n` : ''}\nThis record is maintained in accordance with the Working Time Regulations and HMRC record retention requirements (minimum 6 years).\n\n${f.company_name}`,
  },
]

export const CATEGORIES = [
  { key: 'SSP Documents', label: 'SSP Documents' },
  { key: 'Assignment Documents', label: 'Assignment Documents', for: 'agency' },
  { key: 'Probation Documents', label: 'Probation Documents', for: 'employer' },
  { key: 'Family Leave Documents', label: 'Family Leave' },
  { key: 'Holiday Documents', label: 'Holiday' },
]
