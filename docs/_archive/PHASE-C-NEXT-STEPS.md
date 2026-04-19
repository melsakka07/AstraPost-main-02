# Phase C — Next Steps & Recommendations

**Date:** 2026-04-17  
**Status:** Ready to Begin  
**Completion Target:** 100% audit (all 43 tasks)

---

## Current State

- ✅ **Phase A:** 100% complete (9 tasks)
- ✅ **Phase B:** 89% complete (17/19 tasks done)
  - Remaining: B-F01 (composer), B-U02 (progressive disclosure), B-D03 (cleanup)
- ⏳ **Phase C:** 15 tasks ready to begin

---

## Recommended Immediate Actions

### 1. Start Wave 1 (Quick Wins) — 1 Day

**Objective:** Build momentum with 6 quick wins

**Recommended approach:**

```bash
# Spawn 3 agents in parallel:
- db-migrator: C-B01 (remove redundant index) + C-B02 (input sanitization) + C-B04 (file validation)
- frontend-dev: C-F03 (mobile nav parity)
- convention-enforcer: C-D01 + C-D02 (docs cleanup)
```

**Expected outcome:** 6/15 Phase C tasks done, momentum for Wave 2

**Time investment:** 1 day wall time

### 2. Determine B-F01 Strategy

**Decision point:** Should you invest in B-F01 (composer decomposition) now or later?

**Option A: Complete B-F01 now** (recommended)

- **Pros:**
  - Finishes Phase B (95%+ completion)
  - Composer is foundational for many features
  - ~1-2 days of focused work
- **Cons:**
  - Delays Phase C start
  - Large, complex component (risky)
- **Timing:** After Wave 1 complete

**Option B: Defer B-F01 to Phase C or later**

- **Pros:**
  - Phase C starts immediately after Wave 1
  - Lower risk (Phase C is simpler)
  - Can return to B-F01 with fresh perspective
- **Cons:**
  - Phase B remains at 89%
  - B-U02 (progressive disclosure) also blocked
- **Timing:** After Phase C Wave 3

**Recommendation:** **Option A** — Invest in B-F01 soon. Composer is used in many flows; a clean decomposition will unblock future work.

### 3. Phase C Wave 2 (After Wave 1) — 3 Days

```bash
# Sequential with Wave 1 completion
- backend-dev: C-B03 (hash IPs)
- frontend-dev: C-U02 (avatar upload) + C-U03 (changelog)
- Tests + verification
```

**Outcome:** 9/15 Phase C tasks complete (60%)

### 4. Phase C Wave 3 (Large Components) — 4 Days

```bash
# Most complex work
# High priority first:
- C-F01: Fix hydration mismatch (1 day, technical debt)
- C-F02: Image optimization (1.5 days, performance)
- C-F04: RTL support (1.5 days, i18n)

# Lower priority but valuable:
- C-U01: Command palette (1 day)
- C-U04: Settings route split (1 day)
```

**Outcome:** 15/15 Phase C tasks complete (100%)

---

## Timeline Options

### Option 1: Fast Track (Recommended)

```
Day 1: Phase C Wave 1 (6 tasks) + start B-F01
Day 2-3: B-F01 completion + Phase C Wave 2 (3 tasks)
Day 4-7: Phase C Wave 3 (6 tasks)
Day 8: Verification & testing

Total: 8 days to 100% audit completion
```

### Option 2: Phased Approach

```
Day 1: Phase C Wave 1 (6 tasks)
Day 2-4: Phase C Wave 2 + 3 (9 tasks)
Day 5-6: B-F01 completion
Day 7: B-U02 + B-D03 (final Phase B tasks)
Day 8: Final verification

Total: 8 days to 100% audit completion
```

### Option 3: Conservative

```
Day 1: Phase C Wave 1 (6 tasks)
Day 2-3: Phase C Wave 2 (3 tasks)
Day 4-6: Phase C Wave 3 (6 tasks)
Day 7: Phase C verification
Day 8-10: Return to Phase B (B-F01, B-U02, B-D03)

Total: 10 days to 100% audit completion
```

**Recommendation:** **Option 1 or 2** — 8 days to finish. Don't stretch Phase C out; momentum is high.

---

## Success Metrics

### For Phase C Completion

- [ ] All 15 tasks implemented
- [ ] `pnpm run check` passes
- [ ] `pnpm test` passes (237+ tests)
- [ ] Lighthouse scores stable
- [ ] No new console errors/warnings
- [ ] Mobile nav complete
- [ ] RTL support verified

### For Full Audit Completion (Phase A+B+C)

- [ ] 43/43 tasks complete
- [ ] Build clean and passing
- [ ] Code quality baseline: no new technical debt
- [ ] Documentation up-to-date
- [ ] All features tested and verified

---

## Risk Mitigation

### B-F01 Risk (Composer Decomposition)

**Risk:** Large component, many interdependencies

**Mitigation:**

1. Create sub-components first (scaffolding), keep main monolithic
2. Extract one section at a time, test after each
3. Use context/store for state instead of prop drilling
4. Maintain 100% test coverage (verify in suite)
5. Dedicated session with fresh context

### Phase C Complexity

**Risk:** Wave 3 has several architectural changes (RTL, hydration, settings routing)

**Mitigation:**

1. Do C-F01 (hydration) early — technical debt
2. Test RTL after C-F04 on real device/browser
3. Settings split (C-U04) uses existing patterns
4. Image optimization (C-F02) is standalone

---

## Handoff Notes

### For Next Session

If picking up later:

1. **Current commit:** `fddc3e8` (Phase B Wave 3 complete)
2. **Next task:** Phase C Wave 1 (C-B01, C-B02, C-B04, C-F03, C-D01, C-D02)
3. **Plan file:** `.claude/plans/2026-04-17-phase-c-implementation.md`
4. **Test status:** 237/237 passing, lint clean, typecheck clean
5. **No blockers:** Ready to spawn agents immediately

### Agents to Use

**Wave 1:**

- `db-migrator`: C-B01, C-B02, C-B04
- `frontend-dev`: C-F03
- `convention-enforcer`: C-D01, C-D02

**Wave 2:**

- `backend-dev`: C-B03
- `frontend-dev`: C-U02, C-U03

**Wave 3:**

- `frontend-dev`: C-F01, C-F02, C-F04, C-U01, C-U04

**General-purpose for testing:**

- Run tests after each wave

---

## What Success Looks Like

### At Phase C Completion

```
✅ Backend Security:
   - IP hashing in affiliate clicks
   - File size validation on uploads
   - Input sanitization on AI endpoints
   - Redundant indexes removed

✅ Frontend Quality:
   - Hydration mismatch fixed (no ssr:false workarounds)
   - Images optimized (WebP, srcsets, <10% size)
   - RTL tested and working
   - Mobile navigation complete

✅ UX Delights:
   - Command palette for power users (Cmd+K)
   - Avatar uploads in profile
   - In-app changelog for feature discovery
   - Settings well-organized

✅ Code Quality:
   - 237+ tests passing
   - Lint clean
   - TypeScript strict
   - No technical debt added
```

### At Audit Completion

**All 43 tasks done:**

- 9 from Phase A (Error boundaries, logging, tracing)
- 19 from Phase B (Indexes, validation, decomposition, documentation)
- 15 from Phase C (Security, optimization, UX)

**Impact:**

- Production-ready codebase
- Comprehensive observability
- User-friendly experience
- Secure & performant
- Well-documented

---

## Questions to Answer

Before starting Phase C:

1. **B-F01 Priority:** Do you want to tackle composer decomposition soon or after Phase C?
   - Answer this before starting Wave 1

2. **Timeline Pressure:** Is 8-10 days to 100% audit feasible for your schedule?
   - If not, we can prioritize Phase C tasks by value

3. **Parallel vs Sequential:** Any preference between Wave 1 in parallel vs sequential?
   - Parallel is faster but uses more agent capacity

---

**You're in excellent shape. Phase C is straightforward, well-scoped, and low-risk. Ready to proceed when you are.**
