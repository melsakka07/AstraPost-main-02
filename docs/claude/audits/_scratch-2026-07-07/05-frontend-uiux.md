# Area 4 — Frontend + UI/UX Audit (read-only)

Date: 2026-07-07 · Reviewer: code-reviewer
Note: `ui-ux-pro-max` Skill tool not available in this session — applied WCAG 2.1 AA + `.claude/rules/frontend.md` + `.claude/rules/i18n.md` + mobile-first review manually.

Components audited:

- `src/components/composer/target-accounts-select.tsx`
- `src/components/settings/connected-linkedin-accounts.tsx`
- `src/components/settings/connected-instagram-accounts.tsx`
- `src/app/dashboard/settings/integrations/page.tsx` (renderer)
- Context: `src/components/composer/composer-publishing-panel.tsx` (renders TargetAccountsSelect)

---

## CANONICAL DISABLED / "COMING SOON" PATTERN — plan §1.4 should reuse this

**`src/components/composer/ai-length-selector.tsx:46-88`** is the WCAG-compliant disabled pattern in the codebase:

- `aria-disabled={isDisabled}` + `disabled={isDisabled}` together (line 53-54)
- Guard the handler: `onClick={() => !isDisabled && ...}` (line 55)
- Visual: `cursor-not-allowed opacity-50` (line 62), `focus-visible:ring-2` preserved (line 58)
- `<Lock aria-hidden="true" />` affordance icon (line 69-72)
- `<Tooltip>` explaining WHY it's disabled (line 82-86)

Caveat: ai-length-selector's own strings are HARDCODED ("Post Length" :34, "Requires X Premium subscription" :84). When the plan reuses this pattern for LinkedIn/Instagram coming-soon, it MUST wire text through `useTranslations()` and add a `settings.integrations.coming_soon` + tooltip key (none exists today — see i18n gap below).

Current de-facto gating is a BROKEN version of this pattern (see C1).

---

## CRITICAL / BLOCKER

### B1 — target-accounts-select.tsx has ZERO i18n; 6 hardcoded English strings

`src/components/composer/target-accounts-select.tsx` never imports `useTranslations`. Violates i18n hard rule (Arabic is primary). Every user-facing string is literal English:

- `:58` `"Select accounts"`
- `:76` `` `${selected.length} accounts` `` (also no ICU pluralization)
- `:85` `"Loading accounts..."`
- `:91` `"Post to"` (DropdownMenuLabel)
- `:99` `"Connect an X account to start posting →"`
- `:153` `"Token expires soon"` (TooltipContent)

Severity: **blocker**. Fix: add `const t = useTranslations("compose")`, move all six to `en/ar/pseudo.json` under `compose.*`. Plan step 2b (i18n-dev) must cover this component — it is currently unlisted for the composer in plan §5 (only settings LinkedIn is scoped to 2a).

### B2 — Icon-only disconnect buttons have no accessible name

Both settings components: `src/components/settings/connected-linkedin-accounts.tsx:114-121` and `connected-instagram-accounts.tsx:114-121`.
`<Button variant="ghost" size="icon">` wrapping `<Trash2>` with no `aria-label` and no `sr-only` text. Screen reader announces "button" with no purpose. Violates WCAG 4.1.2 Name, Role, Value.
Severity: **blocker**. Fix: `aria-label={t("integrations.disconnect")}` on the Button (key already exists at `en.json:2573`). Add `aria-hidden="true"` to the `<Trash2>`.

---

## SHOULD-FIX

### S1 — Current "Connect" disabled state is a broken WCAG pattern (directly relevant to plan §1.4)

`connected-linkedin-accounts.tsx:127` and `connected-instagram-accounts.tsx:127`: the Connect button is unconditionally `disabled` with NO tooltip, NO `aria-disabled`, NO "coming soon" text, NO reason. A native `disabled` button is removed from the tab order, so SR/keyboard users cannot discover it or learn why it is off. This is the baseline the plan replaces.
Severity: **should-fix**. Fix (and the plan's target): adopt the ai-length-selector pattern — keep it focusable-discoverable via a wrapping Tooltip, add `aria-disabled`, a `coming_soon` label/tooltip, and gate on the real flag rather than a hardcoded `disabled`.

### S2 — Token-expiring warning tooltip is unreachable by keyboard/SR

`target-accounts-select.tsx:148-155`: `<TooltipTrigger asChild>` wraps a bare `<AlertTriangle>` (not focusable). Keyboard and SR users cannot reach "Token expires soon". WCAG 1.3.1 / 2.1.1.
Severity: **should-fix**. Fix: wrap in a focusable element (`<span tabIndex={0} role="img" aria-label={...}>`) as done elsewhere, and give the icon a text alternative.

### S3 — RTL: hardcoded "→" arrow in empty-state link

`target-accounts-select.tsx:99`: literal `→` at end of "Connect an X account…". In Arabic/RTL the arrow points the wrong direction. Also the copy is X-only in a now multi-platform selector, and links to `/dashboard/settings` instead of `/dashboard/settings/integrations`.
Severity: **should-fix** (RTL correctness + broken link target).

### S4 — Icon-button tap target below 44px on mobile

Disconnect `Button size="icon"` (shadcn = 36×36px) in both settings components (`:114`). Below the ≥44px target requested in the mobile-first rule / WCAG 2.5.5.
Severity: **should-fix** on mobile. Fix: bump to `h-11 w-11` at `sm` down, or add padding hit-area.

### S5 — Platform icons are decorative but not hidden from SR / lack text alt

`target-accounts-select.tsx:62-68, 137-143` and settings card headers (`connected-linkedin-accounts.tsx:75`, `connected-instagram-accounts.tsx:75`): platform `<Twitter/Linkedin/Instagram>` icons carry meaning (which network) but have neither `aria-hidden` (when redundant with adjacent text) nor an `aria-label`/`sr-only` (when standalone, e.g. single-selected label at `:62-68` shows only icon + username, no platform word for SR).
Severity: **should-fix**. Fix: `aria-hidden="true"` where a text label follows; add `sr-only` platform name where the icon is the only platform signal.

---

## NICE-TO-HAVE

### N1 — Brand-color hex bypasses design tokens + dark mode

`target-accounts-select.tsx:138,140,142` (`text-[#1d9bf0]`, `text-[#0077b5]`, `text-[#e1306c]`) and settings headers (`:75`). Arbitrary hex, not `src/lib/tokens.ts` / globals.css tokens; won't adapt to dark mode. Acceptable as brand-identity icon colors, but note they are decorative small icons so contrast is not a text-contrast concern. `frontend.md` "avoid custom colors" leniency for brand marks.

### N2 — Loading state lacks aria-busy / spinner

`target-accounts-select.tsx:83-86`: trigger shows "Loading accounts..." text but no `aria-busy` and no spinner. Minor.

### N3 — Bidi isolation for `@username`

`connected-instagram-accounts.tsx:108` renders `@{username}` inside an RTL container; without `dir="ltr"`/`bdi` the `@` can flip side. Minor cosmetic.

### N4 — Small dropdown checkbox-item tap targets on mobile

`target-accounts-select.tsx:106-157`: default `DropdownMenuCheckboxItem` height (~32px) is a small touch target in a mobile popover. Minor.

### N5 (context, out of primary scope) — composer-publishing-panel hardcoded string

`composer-publishing-panel.tsx:83` `"Scheduling for"` is literal English while the rest of the file uses `t()`. Flagging because this file hosts the composer flag-gating in §1.4; fix alongside.

---

## i18n coverage matrix

- Settings components: fully use `useTranslations("settings")`; keys exist in en (`:2556-2627`) AND ar (verified parallel: `connect_linkedin/instagram`, `no_*_accounts`, `disconnect_*` all present in ar.json). Good.
- `settings.integrations` has NO `coming_soon` key (only marketing namespaces do: `en.json:2959, 3308, 3442`). **Plan must add** `settings.integrations.linkedin_coming_soon` / `..._coming_soon_tooltip` (or generic) to en/ar/pseudo.
- target-accounts-select: NO keys at all (B1). `compose.*` namespace exists (`en.json:604`, has `post_to_accounts:657`, `posting_immediately_to:791`, `selected_account:792`) — the 6 new strings belong here; add matching ar + pseudo.

## exactOptionalPropertyTypes (rule 9)

No violations in the audited components. Integrations page (`:65-81`) builds fully-populated objects (all fields present). `TargetAccountsSelect` receives `loading={accountsLoading}` (always boolean) and guards optional `xSubscriptionTier` with `&&` before passing. No `prop={maybeUndefined}` anti-patterns found.

## RTL summary

Composer-publishing-panel correctly uses logical props (`me-`, `ms-`, `ps-`/`pe-` — e.g. `:123,146,301`). Settings + selector use only `gap-*` (direction-agnostic) — no physical `ml-/mr-/pl-/pr-` found. Only RTL defect is the hardcoded `→` (S3) and minor `@username` bidi (N3).
