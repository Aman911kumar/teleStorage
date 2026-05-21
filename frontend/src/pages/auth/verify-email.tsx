import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthCard } from "./auth-card";

export default function VerifyEmail() {
  return (
    <AuthCard title="Verify email" subtitle="Enter the OTP sent to your inbox." footer="OTP verification UI is ready for backend wiring.">
      <form className="space-y-4">
        <Input placeholder="6-digit OTP" inputMode="numeric" />
        <Button className="w-full" type="button">Verify</Button>
      </form>
    </AuthCard>
  );
}
