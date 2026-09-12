# Agent Guidelines

## Agent skills

### Issue tracker

GitHub Issues via `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Canonical 5-role triage labels (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context repository (`CONTEXT.md` + `docs/adr/`). See `docs/agents/domain.md`.

### Architecture gate

Code is organised by bounded context under `src/lib/domains/`. Cross-context
imports MUST go through a barrel (`$domains/<ctx>` or `$domains/<ctx>/server`) —
never into `domain/`, `application/`, or `infrastructure/`. This is enforced by
`npm run depcruise`, which runs on every commit and MUST be green.

Read `CONTEXT.md` before exploring; it defines the vocabulary. See
`docs/adr/0001-enforce-context-barrels.md` for why the rule exists.
