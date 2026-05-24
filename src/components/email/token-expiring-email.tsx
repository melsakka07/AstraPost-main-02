import { Button, Section, Text } from "@react-email/components";
import { getEmailTranslations } from "@/lib/services/email-translations";
import { BaseLayout } from "./base-layout";

interface AtRiskPosts {
  count: number;
  nextScheduledAt: Date | string | null;
}

interface TokenExpiringEmailProps {
  xUsername: string;
  level: 1 | 2;
  atRiskPosts: AtRiskPosts;
  reconnectUrl: string;
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

export const TokenExpiringEmail = ({
  xUsername,
  level,
  atRiskPosts,
  reconnectUrl,
  locale = "en",
}: TokenExpiringEmailProps) => {
  const t = getEmailTranslations(locale);
  const isUrgent = level === 2;
  const copy = isUrgent ? t.tokenWarning.levelUrgent : t.tokenWarning.levelNotice;

  // Accent palette: amber (level 1, notice) vs red (level 2, urgent).
  // WCAG AA: amber-900 on amber-50 ≈ 9.3:1, red-900 on red-50 ≈ 10.1:1.
  const accent = isUrgent
    ? {
        bg: "bg-[#FEEBEC]",
        border: "border-[#F5C2C7]",
        text: "text-[#842029]",
      }
    : {
        bg: "bg-[#FFF4E5]",
        border: "border-[#FFE0B2]",
        text: "text-[#7A4F01]",
      };

  const subject = copy.subject.replace("{xUsername}", xUsername);
  const heading = copy.heading;
  const body = copy.body.replace("{xUsername}", xUsername);
  const cta = copy.cta;

  const formattedNext = formatNextScheduled(atRiskPosts.nextScheduledAt, locale);
  const atRiskCountKey = atRiskPosts.count === 1 ? "one" : "other";
  const atRiskLine =
    atRiskPosts.count > 0
      ? t.tokenWarning.atRiskPosts[atRiskCountKey].replace("{count}", String(atRiskPosts.count))
      : null;
  const nextLine =
    atRiskPosts.count > 0 && formattedNext
      ? t.tokenWarning.atRiskPosts.nextScheduled.replace("{date}", formattedNext)
      : null;

  return (
    <BaseLayout preview={subject} locale={locale}>
      <Text className="text-[14px] leading-[24px] text-black">{t.common.greeting_no_name}</Text>
      <Text className="text-[16px] leading-[24px] font-semibold text-black">{heading}</Text>
      <Text className="text-[14px] leading-[24px] text-black">{body}</Text>

      {atRiskLine ? (
        <Section className={`my-4 rounded-md border ${accent.border} ${accent.bg} p-4`}>
          <Text className={`m-0 text-[14px] font-medium ${accent.text}`}>{atRiskLine}</Text>
          {nextLine ? (
            <Text className={`m-0 mt-1 text-[13px] ${accent.text}`}>{nextLine}</Text>
          ) : null}
        </Section>
      ) : null}

      <Section className="mt-[32px] mb-[32px] text-center">
        <Button
          className={`rounded ${isUrgent ? "bg-[#B42318]" : "bg-[#000000]"} px-5 py-3 text-center text-[12px] font-semibold text-white no-underline`}
          href={reconnectUrl}
        >
          {cta}
        </Button>
      </Section>
    </BaseLayout>
  );
};

export default TokenExpiringEmail;
