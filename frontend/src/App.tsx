import { lazy, Suspense, useEffect } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { ProtectedRoute } from "@/router/protected-route";
import { PublicLayout } from "@/layouts/public-layout";
import { AuthLayout } from "@/layouts/auth-layout";
import { DashboardLayout } from "@/layouts/dashboard-layout";
import { Skeleton } from "@/components/ui/skeleton";
import { NetworkBanner } from "@/components/network-banner";
import { useUiStore } from "@/store/ui-store";

const Landing = lazy(() => import("@/pages/public/landing"));
const MarketingPage = lazy(() => import("@/pages/public/marketing-page"));
const Features = lazy(() => import("@/pages/public/features"));
const PublicDocs = lazy(() => import("@/pages/public/docs"));
const Pricing = lazy(() => import("@/pages/public/pricing"));
const Contact = lazy(() => import("@/pages/public/contact"));
const Login = lazy(() => import("@/pages/auth/login"));
const Signup = lazy(() => import("@/pages/auth/signup"));
const ForgotPassword = lazy(() => import("@/pages/auth/forgot-password"));
const ResetPassword = lazy(() => import("@/pages/auth/reset-password"));
const VerifyEmail = lazy(() => import("@/pages/auth/verify-email"));
const Dashboard = lazy(() => import("@/pages/app/dashboard"));
const SimpleAppPage = lazy(() => import("@/pages/app/simple-app-page"));
const Workspaces = lazy(() => import("@/pages/app/workspaces"));
const ApiAccess = lazy(() => import("@/pages/app/api-access"));
const Analytics = lazy(() => import("@/pages/app/analytics"));
const Docs = lazy(() => import("@/pages/app/docs"));
const Media = lazy(() => import("@/pages/app/media"));
const Profile = lazy(() => import("@/pages/app/profile"));
const Admin = lazy(() => import("@/pages/admin/admin"));
const NotFound = lazy(() => import("@/pages/system/not-found"));

function Loader() {
  return <div className="mx-auto grid min-h-screen max-w-7xl gap-4 p-6"><Skeleton className="h-12 w-64" /><Skeleton className="h-80" /></div>;
}

export default function App() {
  const setCommandOpen = useUiStore((state) => state.setCommandOpen);
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setCommandOpen]);

  return (
    <Suspense fallback={<Loader />}>
      <NetworkBanner />
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<Landing />} />
          <Route path="features" element={<Features />} />
          <Route path="docs" element={<PublicDocs />} />
          <Route path="pricing" element={<Pricing />} />
          <Route path="contact" element={<Contact />} />
          <Route path="privacy" element={<MarketingPage title="Privacy Policy" />} />
          <Route path="terms" element={<MarketingPage title="Terms" />} />
        </Route>
        <Route element={<AuthLayout />}>
          <Route path="login" element={<Login />} />
          <Route path="signup" element={<Signup />} />
          <Route path="forgot-password" element={<ForgotPassword />} />
          <Route path="reset-password" element={<ResetPassword />} />
          <Route path="verify-email" element={<VerifyEmail />} />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="app" element={<Dashboard />} />
            <Route path="app/media" element={<Media />} />
            <Route path="app/uploads" element={<SimpleAppPage kind="uploads" />} />
            <Route path="app/workspaces" element={<Workspaces />} />
            <Route path="app/api-access" element={<ApiAccess />} />
            <Route path="app/optimization" element={<SimpleAppPage kind="optimization" />} />
            <Route path="app/analytics" element={<Analytics />} />
            <Route path="app/docs" element={<Docs />} />
            <Route path="app/profile" element={<Profile />} />
            <Route path="app/settings" element={<SimpleAppPage kind="settings" />} />
            <Route path="admin" element={<Admin />} />
          </Route>
        </Route>
        <Route path="/dashboard" element={<Navigate to="/app" replace />} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: {
            background: "rgba(13,17,24,0.94)",
            color: "#fff",
            border: "1px solid rgba(148,163,184,0.18)",
            borderRadius: "10px",
            boxShadow: "0 18px 60px rgba(0,0,0,0.28)",
            backdropFilter: "blur(16px)"
          },
          success: { iconTheme: { primary: "#34d399", secondary: "#071018" } },
          error: { iconTheme: { primary: "#fb7185", secondary: "#071018" } }
        }}
      />
    </Suspense>
  );
}
