import { Button, Section, Text } from "@react-email/components";
import { BaseLayout } from "../base-layout";

interface TrialEndingSoonEmailProps {
  userName: string;
}

export const TrialEndingSoonEmail = ({ userName }: TrialEndingSoonEmailProps) => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return (
    <BaseLayout preview="Your trial ends soon">
      <Text className="text-[14px] leading-[24px] text-black">Hi {userName || "there"},</Text>
      <Text className="text-[14px] leading-[24px] text-black">
        Your trial ends in 3 days. Add a payment method to keep your access.
      </Text>
      <Section className="mt-[32px] mb-[32px] text-center">
        <Button
          className="rounded bg-[#000000] px-5 py-3 text-center text-[12px] font-semibold text-white no-underline"
          href={`${baseUrl}/dashboard/settings`}
        >
          Add Payment Method
        </Button>
      </Section>
      <Text className="text-[14px] leading-[24px] text-black">
        Without a payment method on file, your account will be moved to the Free plan when your
        trial ends.
      </Text>
      <Text className="text-[14px] leading-[24px] text-black">Thank you for trying AstraPost!</Text>
    </BaseLayout>
  );
};

export default TrialEndingSoonEmail;
