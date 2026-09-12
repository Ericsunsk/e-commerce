# Domain Docs

How the engineering skills should consume this repo's domain documentation when exploring the codebase.

## Before exploring, read these

- **`CONTEXT.md`** at the repo root — the glossary, the bounded-context list, and the file-naming conventions. Read it before exploring.
- **`docs/adr/`**: read ADRs that touch the area you're about to work in.

Both exist and are current. They are **not** optional background: `CONTEXT.md`
defines the vocabulary and `docs/adr/0001` defines the architecture rule that
`npm run depcruise` enforces. A change that contradicts an ADR needs an
amendment, not a silent override.

If you find one of these files missing, that is a real problem — say so. Do not
proceed silently, and do not re-derive the architecture from the code.

## File structure

This is a **single-context repo**: one `CONTEXT.md` at the root covers the whole
system, and all ADRs live in one `docs/adr/`. There is no `CONTEXT-MAP.md`.

```
/
├── CONTEXT.md              ← glossary + bounded-context list + naming conventions
├── docs/adr/               ← 0001-enforce-context-barrels, 0002-cross-context-behaviour-is-injected
├── .dependency-cruiser.cjs ← the executable form of docs/adr/0001
├── .specify/memory/constitution.md
└── src/lib/domains/        ← the nine bounded contexts
```

Note the distinction: **nine bounded contexts, one `CONTEXT.md`.** "Single-context
repo" refers to the documentation layout, not to the number of bounded contexts —
those are different senses of the word "context", and `CONTEXT.md` disambiguates
them in its glossary.

## Use the glossary's vocabulary

When your output names a domain concept (in an issue title, a refactor proposal, a hypothesis, a test name), use the term as defined in `CONTEXT.md`. Don't drift to synonyms the glossary explicitly avoids.

If the concept you need isn't in the glossary yet, that's a signal: either you're inventing language the project doesn't use (reconsider) or there's a real gap (note it for `/domain-modeling`).

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than silently overriding:

> _Contradicts ADR-0001 (cross-context imports must target a barrel), but worth reopening because…_
