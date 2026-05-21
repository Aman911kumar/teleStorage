import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AuthCard } from "./auth-card";

export default function ForgotPassword() {
  return (
    <AuthCard title="Reset password" subtitle="Enter your email to receive an OTP." footer={<Link to="/login" className="text-accent">Back to login</Link>}>
      <form className="space-y-4">
        <Input placeholder="Email address" />
        <Button className="w-full" type="button">Send OTP</Button>
      </form>
    </AuthCard>
  );
}
