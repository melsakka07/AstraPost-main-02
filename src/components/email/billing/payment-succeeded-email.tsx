import { Text } from "@react-email/components";
import { getEmailTranslations } from "@/lib/services/email-translations";
import { BaseLayout } from "../base-layout";

interface PaymentSucceededEmailProps {
  userName: string;
  locale?: string;
}

export const PaymentSucceededEmail = ({ userName, locale = "en" }: PaymentSucceededEmailProps) => {
  const t = getEmailTranslations(locale);
  return (
    <BaseLayout preview={t.payment_succeeded.subject} locale={locale}>
      <Text className="text-[14px] leading-[24px] text-black">
        {t.common.greeting.replace("{name}", userName || "there")}
      </Text>
      <Text className="text-[14px] leading-[24px] text-black">{t.payment_succeeded.body}</Text>
      <Text className="text-[14px] leading-[24px] text-black">
        {t.common.thank_you_continued || "Thank you for your continued subscription!"}
      </Text>
    </BaseLayout>
  );
};

export default PaymentSucceededEmail;
