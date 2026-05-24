import { Button, Section, Text } from "@react-email/components";
import { getEmailTranslations } from "@/lib/services/email-translations";
import { BaseLayout } from "./base-layout";

interface AtRiskPosts {
  count: number;
  nextScheduledAt: Date | string | null;
}

interface AccountDeactivatedEmailProps {
  xUsername: string;
  reconnectUrl: string;
  atRiskPosts: AtRiskPosts;
  locale?: string;
}

function formatNextScheduled(value: Date | string | null, locale: string): string | null {
  if (value === null) return null;
  if (typeof value === "string") return value;
  try {
    return value.toLocaleDateString(locale === "ar" ? "ar" : "en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value.toISOString();
  }
}

export const AccountDeactivatedEmail = ({
  xUsername,
  reconnectUrl,
  atRiskPosts,
  locale = "en",
}: AccountDeactivatedEmailProps) => {
  const t = getEmailTranslations(locale);

  const formattedNext = formatNextScheduled(atRiskPosts.nextScheduledAt, locale);
  const atRiskCountKey = atRiskPosts.count === 1 ? "one" : "other";
  const atRiskLine =
    atRiskPosts.count > 0
      ? t.accountDeactivated.atRiskPosts[atRiskCountKey].replace(
          "{count}",
          String(atRiskPosts.count)
        )
      : null;
  const nextLine =
    atRiskPosts.count > 0 && formattedNext
      ? t.accountDeactivated.atRiskPosts.nextScheduled.replace("{date}", formattedNext)
      : null;

  return (
    <BaseLayout
      preview={t.account_deactivated.subject.replace("{username}", xUsername)}
      locale={locale}
    >
      <Text className="text-[14px] leading-[24px] text-black">{t.common.greeting_no_name}</Text>

      {/* Paused badge — strong red accent for deactivation */}
      <Section className="my-2 text-center">
        <Text className="m-0 inline-block rounded-full bg-[#B42318] px-3 py-1 text-[11px] font-semibold tracking-wide text-white uppercase">
          {t.common.paused}
        </Text>
      </Section>

      <Text className="text-[14px] leading-[24px] text-black">
        {t.account_deactivated.body.replace("{username}", `@${xUsername}`)}
      </Text>

      <Section className="my-4 rounded-md border border-[#F5C2C7] bg-[#FEEBEC] p-4">
        <Text className="m-0 text-[14px] font-medium text-[#842029]">
          {t.account_deactivated.impact}
        </Text>
        {atRiskLine ? (
          <Text className="m-0 mt-2 text-[14px] font-medium text-[#842029]">{atRiskLine}</Text>
        ) : null}
        {nextLine ? <Text className="m-0 mt-1 text-[13px] text-[#842029]">{nextLine}</Text> : null}
      </Section>

      <Section className="mt-[32px] mb-[32px] text-center">
        <Button
          className="rounded bg-[#B42318] px-5 py-3 text-center text-[12px] font-semibold text-white no-underline"
          href={reconnectUrl}
        >
          {t.account_deactivated.cta}
        </Button>
      </Section>
    </BaseLayout>
  );
};

export default AccountDeactivatedEmail;
