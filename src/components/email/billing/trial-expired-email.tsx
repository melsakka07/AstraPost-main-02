import { Button, Section, Text } from "@react-email/components";
import { getEmailTranslations } from "@/lib/services/email-translations";
import { BaseLayout } from "../base-layout";

interface TrialExpiredEmailProps {
  userName: string;
  locale?: string;
}

export const TrialExpiredEmail = ({ userName, locale = "en" }: TrialExpiredEmailProps) => {
  const t = getEmailTranslations(locale);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return (
    <BaseLayout preview={t.trial_expired.subject} locale={locale}>
      <Text className="text-[14px] leading-[24px] text-black">
        {t.common.greeting.replace("{name}", userName || "there")}
      </Text>
      <Text className="text-[14px] leading-[24px] text-black">{t.trial_expired.body}</Text>
      <Section className="mt-[32px] mb-[32px] text-center">
        <Button
          className="rounded bg-[#000000] px-5 py-3 text-center text-[12px] font-semibold text-white no-underline"
          href={`${baseUrl}/dashboard/settings`}
        >
          {t.common.button.upgrade_now}
        </Button>
      </Section>
      <Text className="text-[14px] leading-[24px] text-black">
        {t.trial_expired.upgrade_description}
      </Text>
      <Text className="text-[14px] leading-[24px] text-black">
        {t.common.closing}
        <br />
        {t.common.closing_team}
      </Text>
    </BaseLayout>
  );
};

export default TrialExpiredEmail;
