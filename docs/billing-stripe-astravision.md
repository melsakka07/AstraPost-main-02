What's safe (verified)

- Our side is bulletproof against cross-traffic. Because both projects subscribe to checkout.session.completed, our endpoint will also receive astrapost's checkout events. That's harmless by design: our handler looks up the session id against AstraVision's transactions table, finds nothing, and returns 200 without touching anything. Foreign events are no-ops.
- Webhooks, API calls, and checkout sessions don't interfere with each other operationally — each endpoint only acts on records it recognizes.

What's worth a look (not urgent)

1. The mirror of the above: astrapost's webhook now receives AstraVision's checkout completions too. Our events are no-ops for us; whether they're no-ops for astrapost depends on its code. Worth a quick check that astrapost's handler quietly ignores session ids it doesn't recognize (most do — it's the standard pattern).
2. Statement descriptor: what customers see on their card statement is account-level by default. If an AstraVision customer sees an "ASTRAPOST"-ish descriptor (or vice versa), that's a recipe for "I don't recognize this charge" → chargebacks. Check Settings → Public details in Stripe; per-charge descriptor overrides are possible if you ever want them.
3. Pooled risk — the one real long-term concern: disputes, refund rates, and fraud metrics are counted per account, not per product. If one product ever has a bad dispute run, Stripe reviews/restricts the whole account, taking both products' payments down together. Payouts and reporting are also mixed, which makes per-product bookkeeping messier.

My recommendation

For your current volume: leave it as is — nothing is broken and nothing will break. When either product grows meaningfully, split them: Stripe lets you create a second account under the same login (free, a few minutes), and migrating AstraVision would just mean swapping the secret key in /admin gateway settings and re-creating our one webhook — a 10-minute job we can do anytime.

I've noted the cross-event nuance in memory alongside the "never touch astrapost's endpoint" rule, so this stays understood in future sessions.

Ran 1 shell command

Both memory records are updated — and with your confirmation that the test email landed, I've officially closed the email incident in my notes too (that was the #1 item from the billing assessment, now resolved).

So to wrap up today's billing work, everything from the assessment's quick-win list is now live on prod:

- ✅ Email delivery working (confirmed by you)
- ✅ Sitewide expiry/renewal banner
- ✅ Stripe webhook backup — registered and enabled (we_1Tp1Ze…)
- ✅ Yearly savings framing on /pricing
- ✅ Early renewal anytime
- ✅ Coupon-limit and downgrade-guard bug fixes + upgrade fairness notice
- ✅ Credit Packs (from earlier today)

The remaining bigger items from the assessment stay on the backlog whenever you want them: downgrade-at-period-end, true upgrade proration, receipt/invoice emails, and an admin revenue (MRR) dashboard.
