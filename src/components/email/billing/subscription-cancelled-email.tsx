import { Button, Section, Text } from "@react-email/components";
import { getEmailTranslations } from "@/lib/services/email-translations";
import { BaseLayout } from "../base-layout";

interface SubscriptionCancelledEmailProps {
  userName: string;
  locale?: string;
}

export const SubscriptionCancelledEmail = ({
  userName,
  locale = "en",
}: SubscriptionCancelledEmailProps) => {
  const t = getEmailTranslations(locale);
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return (
    <BaseLayout preview={t.subscription_cancelled.subject} locale={locale}>
      <Text className="text-[14px] leading-[24px] text-black">
        {t.common.greeting.replace("{name}", userName || "there")}
      </Text>
      <Text className="text-[14px] leading-[24px] text-black">{t.subscription_cancelled.body}</Text>
      <Section className="mt-[32px] mb-[32px] text-center">
        <Button
          className="rounded bg-[#000000] px-5 py-3 text-center text-[12px] font-semibold text-white no-underline"
          href={`${baseUrl}/dashboard/settings`}
        >
          {t.subscription_cancelled.resubscribe}
        </Button>
      </Section>
      <Text className="text-[14px] leading-[24px] text-black">
        {t.subscription_cancelled.resubscribe_anytime ||
          "You can resubscribe at any time from your account settings."}
      </Text>
      <Text className="text-[14px] leading-[24px] text-black">
        {t.common.thank_you_customer || "Thank you for being an AstraPost customer."}
      </Text>
    </BaseLayout>
  );
};

export default SubscriptionCancelledEmail;
