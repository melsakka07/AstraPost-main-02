import { Button, Section, Text } from "@react-email/components";
import { getEmailTranslations } from "@/lib/services/email-translations";
import { BaseLayout } from "../base-layout";

interface CancelScheduledEmailProps {
  userName: string;
  periodEndDate: string;
  locale?: string;
}

export const CancelScheduledEmail = ({
  userName,
  periodEndDate,
  locale = "en",
}: CancelScheduledEmailProps) => {
  const t = getEmailTranslations(locale);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return (
    <BaseLayout preview={t.cancel_scheduled.subject} locale={locale}>
      <Text className="text-[14px] leading-[24px] text-black">
        {t.common.greeting.replace("{name}", userName || "there")}
      </Text>
      <Text className="text-[14px] leading-[24px] text-black">
        {t.cancel_scheduled.body.replace("{date}", periodEndDate)}
      </Text>
      <Text className="text-[14px] leading-[24px] text-black">
        {t.cancel_scheduled.access_until_end ||
          "You'll continue to have full access to all features until that date. After that, your account will be moved to the Free plan."}
      </Text>
      <Section className="mt-[32px] mb-[32px] text-center">
        <Button
          className="rounded bg-[#000000] px-5 py-3 text-center text-[12px] font-semibold text-white no-underline"
          href={`${baseUrl}/dashboard/settings`}
        >
          {t.common.button.manage_subscription}
        </Button>
      </Section>
      <Text className="text-[14px] leading-[24px] text-black">
        {t.cancel_scheduled.reactivate_before_end ||
          "If you change your mind, you can reactivate at any time from your account settings before the cancellation date."}
      </Text>
      <Text className="text-[14px] leading-[24px] text-black">
        {t.common.thank_you_customer || "Thank you for being an AstraPost customer."}
      </Text>
    </BaseLayout>
  );
};

export default CancelScheduledEmail;
