# MartinCoder Rebuild Audit and Architecture Direction

## Repository audit summary

- `martin-coder` already contains a monorepo (`packages/api`, `packages/web`, `packages/cli`, `packages/shared`) with core AI, session, and workspace features.
- In this environment, a local `opencode-dev` repository path was not present, so direct file-level parity extraction could not be completed.
- Rebuild direction was therefore implemented using the requested benchmark principles: stronger production UX, clearer mode separation, public marketing experience, and product-grade command UX.

## Gaps addressed in this rebuild

1. Public product presentation was missing as a first-class website.
2. Product routes were not clearly separated between marketing and authenticated app workspace.
3. App entrypoint was overloaded, reducing clarity for commercial presentation and onboarding.
4. CLI lacked a first-line diagnostics workflow.

## Implemented architecture and UX changes

- Route split:
  - Public site at `/`, `/features`, `/pricing`, `/product`, `/login`.
  - Authenticated workspace at `/app`.
- Shared marketing shell and navigation with theme/language controls.
- Workspace preserved and moved to `/app` for clearer product boundary.
- Sidebar navigation updated to target `/app` as the operational cockpit.
- CLI gained `doctor` command for production support and installation debugging.

## Next phase recommendations

- Persist and expose permission policies at API layer (`allow/deny` patterns + command approvals).
- Add snapshot/restore endpoints and UX timeline tied to file operations.
- Add session compaction controls and explicit state machine (`queued`, `running`, `blocked`, `done`) in web UI.
- Extend i18n to avoid cookie-based detection in client components and move fully to locale routing.
