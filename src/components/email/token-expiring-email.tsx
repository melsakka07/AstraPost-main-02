import { Button, Section, Text } from "@react-email/components";
import { getEmailTranslations } from "@/lib/services/email-translations";
import { BaseLayout } from "./base-layout";

interface TokenExpiringEmailProps {
  xUsername: string;
  hoursUntilExpiry: number;
  reconnectUrl: string;
  locale?: string;
}

export const TokenExpiringEmail = ({
  xUsername,
  hoursUntilExpiry,
  reconnectUrl,
  locale = "en",
}: TokenExpiringEmailProps) => {
  const t = getEmailTranslations(locale);
  return (
    <BaseLayout preview={t.token_expiring.subject.replace("{username}", xUsername)} locale={locale}>
      <Text className="text-[14px] leading-[24px] text-black">{t.common.greeting_no_name}</Text>
      <Text className="text-[14px] leading-[24px] text-black">
        {t.token_expiring.body
          .replace("{username}", `@${xUsername}`)
          .replace("{hours}", String(hoursUntilExpiry))}
      </Text>
      <Section className="my-4 rounded-md border border-amber-200 bg-amber-50 p-4">
        <Text className="m-0 text-[14px] font-medium text-amber-800">
          {t.token_expiring.impact}
        </Text>
      </Section>
      <Section className="mt-[32px] mb-[32px] text-center">
        <Button
          className="rounded bg-[#000000] px-5 py-3 text-center text-[12px] font-semibold text-white no-underline"
          href={reconnectUrl}
        >
          {t.token_expiring.cta}
        </Button>
      </Section>
    </BaseLayout>
  );
};

export default TokenExpiringEmail;
