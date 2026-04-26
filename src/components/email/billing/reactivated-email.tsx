import { Text } from "@react-email/components";
import { getEmailTranslations } from "@/lib/services/email-translations";
import { BaseLayout } from "../base-layout";

interface ReactivatedEmailProps {
  userName: string;
  locale?: string;
}

export const ReactivatedEmail = ({ userName, locale = "en" }: ReactivatedEmailProps) => {
  const t = getEmailTranslations(locale);
  return (
    <BaseLayout preview={t.reactivated.subject} locale={locale}>
      <Text className="text-[14px] leading-[24px] text-black">
        {t.common.greeting.replace("{name}", userName || "there")}
      </Text>
      <Text className="text-[14px] leading-[24px] text-black">{t.reactivated.body}</Text>
      <Text className="text-[14px] leading-[24px] text-black">
        {t.common.thank_you_staying || "Thank you for staying with AstraPost!"}
      </Text>
    </BaseLayout>
  );
};

export default ReactivatedEmail;
