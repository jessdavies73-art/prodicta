# Healthcare shell (Phase 2)

Reserved for nurses, carers, doctors, therapists, pharmacy clinical, dental clinical, vet, and social work roles.

The clinical Workspace differs from Office: shift handover notes, observation charts, drug round prompts, safeguarding flags, escalation thresholds, multi-disciplinary team coordination. Block library and shell layout will be designed in Phase 2.

Currently the role-profile-detector classifies clinical and care roles as `shell_family = 'healthcare'`. Phase 1 does not generate a `workspace_scenario` for these roles; the assess flow falls back to the legacy WorkspacePage.
