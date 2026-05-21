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
const VerifyEmail = lazy(() => import("@/pages/auth/verify-email"));
const Dashboard = lazy(() => import("@/pages/app/dashboard"));
const SimpleAppPage = lazy(() => import("@/pages/app/simple-app-page"));
const Workspaces = lazy(() => import("@/pages/app/workspaces"));
const Analytics = lazy(() => import("@/pages/app/analytics"));
const Docs = lazy(() => import("@/pages/app/docs"));
const Media = lazy(() => import("@/pages/app/media"));
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
          <Route path="verify-email" element={<VerifyEmail />} />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route element={<DashboardLayout />}>
            <Route path="app" element={<Dashboard />} />
            <Route path="app/media" element={<Media />} />
            <Route path="app/uploads" element={<SimpleAppPage kind="uploads" />} />
            <Route path="app/workspaces" element={<Workspaces />} />
            <Route path="app/optimization" element={<SimpleAppPage kind="optimization" />} />
            <Route path="app/analytics" element={<Analytics />} />
            <Route path="app/docs" element={<Docs />} />
            <Route path="app/profile" element={<SimpleAppPage kind="profile" />} />
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
          style: { background: "#111722", color: "#fff", border: "1px solid #222838" },
          success: { iconTheme: { primary: "#34d399", secondary: "#071018" } },
          error: { iconTheme: { primary: "#fb7185", secondary: "#071018" } }
        }}
      />
    </Suspense>
  );
}
