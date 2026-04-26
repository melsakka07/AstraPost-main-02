import * as React from "react";
import {
  Body,
  Container,
  Head,
  Html,
  Preview,
  Section,
  Text,
  Tailwind,
} from "@react-email/components";
import { getEmailTranslations } from "@/lib/services/email-translations";

interface BaseLayoutProps {
  preview?: string;
  children: React.ReactNode;
  locale?: string;
}

export const BaseLayout = ({ preview, children, locale = "en" }: BaseLayoutProps) => {
  const t = getEmailTranslations(locale);
  const isRtl = locale === "ar";

  return (
    <Html dir={isRtl ? "rtl" : "ltr"} lang={locale}>
      <Head />
      <Preview>{preview || ""}</Preview>
      <Tailwind>
        <Body className="mx-auto my-auto bg-white font-sans">
          <Container className="mx-auto my-[40px] max-w-[465px] rounded border border-solid border-[#eaeaea] p-[20px]">
            <Section className="mt-[32px]">
              <Text className="mx-0 my-[30px] p-0 text-center text-[24px] font-normal text-black">
                <strong>AstraPost</strong>
              </Text>
            </Section>
            {children}
            <Section>
              <Text className="text-center text-[12px] leading-[24px] text-[#666666]">
                {t.common.all_rights_reserved || "© 2026 AstraPost. All rights reserved."}
              </Text>
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
};
