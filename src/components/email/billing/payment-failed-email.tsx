import { Button, Section, Text } from "@react-email/components";
import { BaseLayout } from "../base-layout";

interface PaymentFailedEmailProps {
  userName: string;
}

export const PaymentFailedEmail = ({ userName }: PaymentFailedEmailProps) => {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  return (
    <BaseLayout preview="Payment failed — action required">
      <Text className="text-[14px] leading-[24px] text-black">Hi {userName || "there"},</Text>
      <Section className="my-4 rounded-md border border-yellow-200 bg-yellow-50 p-4">
        <Text className="m-0 text-[14px] font-medium text-yellow-800">
          We could not process your payment. Please update your payment method within 7 days to
          avoid service interruption.
        </Text>
      </Section>
      <Section className="mt-[32px] mb-[32px] text-center">
        <Button
          className="rounded bg-[#000000] px-5 py-3 text-center text-[12px] font-semibold text-white no-underline"
          href={`${baseUrl}/dashboard/settings`}
        >
          Update Payment Method
        </Button>
      </Section>
      <Text className="text-[14px] leading-[24px] text-black">
        Your account will remain active during the grace period, but service will be interrupted if
        payment is not updated.
      </Text>
    </BaseLayout>
  );
};

export default PaymentFailedEmail;
