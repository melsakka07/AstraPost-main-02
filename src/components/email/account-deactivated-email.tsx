import { Button, Section, Text } from "@react-email/components";
import { getEmailTranslations } from "@/lib/services/email-translations";
import { BaseLayout } from "./base-layout";

interface AccountDeactivatedEmailProps {
  xUsername: string;
  reconnectUrl: string;
  locale?: string;
}

export const AccountDeactivatedEmail = ({
  xUsername,
  reconnectUrl,
  locale = "en",
}: AccountDeactivatedEmailProps) => {
  const t = getEmailTranslations(locale);
  return (
    <BaseLayout
      preview={t.account_deactivated.subject.replace("{username}", xUsername)}
      locale={locale}
    >
      <Text className="text-[14px] leading-[24px] text-black">{t.common.greeting_no_name}</Text>
      <Text className="text-[14px] leading-[24px] text-black">
        {t.account_deactivated.body.replace("{username}", `@${xUsername}`)}
      </Text>
      <Section className="my-4 rounded-md border border-red-200 bg-red-50 p-4">
        <Text className="m-0 text-[14px] font-medium text-red-800">
          {t.account_deactivated.impact}
        </Text>
      </Section>
      <Section className="mt-[32px] mb-[32px] text-center">
        <Button
          className="rounded bg-[#000000] px-5 py-3 text-center text-[12px] font-semibold text-white no-underline"
          href={reconnectUrl}
        >
          {t.account_deactivated.cta}
        </Button>
      </Section>
    </BaseLayout>
  );
};

export default AccountDeactivatedEmail;
