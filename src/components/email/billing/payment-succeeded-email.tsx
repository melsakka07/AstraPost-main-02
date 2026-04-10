import { Text } from "@react-email/components";
import { BaseLayout } from "../base-layout";

interface PaymentSucceededEmailProps {
  userName: string;
}

export const PaymentSucceededEmail = ({ userName }: PaymentSucceededEmailProps) => {
  return (
    <BaseLayout preview="Payment succeeded">
      <Text className="text-[14px] leading-[24px] text-black">Hi {userName || "there"},</Text>
      <Text className="text-[14px] leading-[24px] text-black">
        Your subscription payment was successful.
      </Text>
      <Text className="text-[14px] leading-[24px] text-black">
        Thank you for your continued subscription!
      </Text>
    </BaseLayout>
  );
};

export default PaymentSucceededEmail;
