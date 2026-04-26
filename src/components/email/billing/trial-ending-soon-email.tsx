import { Button, Section, Text } from "@react-email/components";
import { getEmailTranslations } from "@/lib/services/email-translations";
import { BaseLayout } from "../base-layout";

interface TrialEndingSoonEmailProps {
  userName: string;
  locale?: string;
}

export const TrialEndingSoonEmail = ({ userName, locale = "en" }: TrialEndingSoonEmailProps) => {
  const t = getEmailTranslations(locale);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return (
    <BaseLayout preview={t.trial_ending_soon.subject} locale={locale}>
      <Text className="text-[14px] leading-[24px] text-black">
        {t.common.greeting.replace("{name}", userName || "there")}
      </Text>
      <Text className="text-[14px] leading-[24px] text-black">{t.trial_ending_soon.body}</Text>
      <Section className="mt-[32px] mb-[32px] text-center">
        <Button
          className="rounded bg-[#000000] px-5 py-3 text-center text-[12px] font-semibold text-white no-underline"
          href={`${baseUrl}/dashboard/settings`}
        >
          {t.trial_ending_soon.cta}
        </Button>
      </Section>
      <Text className="text-[14px] leading-[24px] text-black">
        {t.trial_ending_soon.without_payment ||
          "Without a payment method on file, your account will be moved to the Free plan when your trial ends."}
      </Text>
      <Text className="text-[14px] leading-[24px] text-black">
        {t.common.thank_you_trying || "Thank you for trying AstraPost!"}
      </Text>
    </BaseLayout>
  );
};

export default TrialEndingSoonEmail;
