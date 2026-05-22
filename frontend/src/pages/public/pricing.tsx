import { Check, HelpCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Seo } from "@/components/seo";

const plans = [
  { name: "Self-hosted", monthly: 0, text: "Run TeleStore with your own Telegram bot and channel.", features: ["Unlimited workspaces", "Telegram storage", "Media dashboard", "Local queue mode"] },
  { name: "Pro Ops", monthly: 19, text: "For teams that want managed deployment and monitoring.", features: ["Health monitoring", "Priority updates", "Backup guidance", "Advanced analytics"] },
  { name: "Scale", monthly: 49, text: "For high-volume media workflows and custom infrastructure.", features: ["Worker scaling", "Cache tuning", "Migration support", "Custom provider planning"] }
];

export default function Pricing() {
  const [yearly, setYearly] = useState(true);
  return (
    <>
      <Seo title="Pricing - TeleStore" description="Simple pricing structure for a self-hosted Telegram media cloud." />
      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <section className="mx-auto max-w-3xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent">Pricing</p>
          <h1 className="mt-4 text-4xl font-semibold tracking-tight text-white sm:text-6xl">Start self-hosted. Scale when you need help.</h1>
          <div className="mt-8 inline-flex rounded-md border border-border bg-panel p-1">
            <button className={`rounded px-4 py-2 text-sm ${!yearly ? "bg-panel-2 text-white" : "text-muted"}`} onClick={() => setYearly(false)}>Monthly</button>
            <button className={`rounded px-4 py-2 text-sm ${yearly ? "bg-panel-2 text-white" : "text-muted"}`} onClick={() => setYearly(true)}>Yearly</button>
          </div>
        </section>

        <section className="mt-12 grid gap-5 lg:grid-cols-3">
          {plans.map((plan, index) => (
            <Card key={plan.name} className={`p-6 ${index === 1 ? "border-accent/60 bg-panel-2" : ""}`}>
              <h2 className="text-xl font-semibold text-white">{plan.name}</h2>
              <p className="mt-2 min-h-12 text-sm leading-6 text-muted">{plan.text}</p>
              <p className="mt-6 text-4xl font-semibold text-white">${yearly ? Math.round(plan.monthly * 10) : plan.monthly}<span className="text-sm font-normal text-muted">/{yearly ? "yr" : "mo"}</span></p>
              <Button className="mt-6 w-full" variant={index === 1 ? "primary" : "secondary"}>{index === 0 ? "Deploy now" : "Contact sales"}</Button>
              <div className="mt-6 space-y-3">
                {plan.features.map((feature) => <p key={feature} className="flex items-center gap-2 text-sm text-slate-200"><Check size={15} className="text-accent" />{feature}</p>)}
              </div>
            </Card>
          ))}
        </section>

        <section className="mt-12 overflow-hidden rounded-xl border border-border bg-panel">
          <table className="w-full min-w-180 text-left text-sm">
            <thead className="bg-panel-2 text-muted"><tr><th className="p-4">Feature</th><th>Self-hosted</th><th>Pro Ops</th><th>Scale</th></tr></thead>
            <tbody className="divide-y divide-border">
              {["Workspace onboarding", "Encrypted token storage", "Upload optimization", "Deployment assistance"].map((row, index) => <tr key={row}><td className="p-4 text-white">{row}</td><td>{index < 3 ? "Included" : "Docs"}</td><td>Included</td><td>Included</td></tr>)}
            </tbody>
          </table>
        </section>

        <section className="mt-12 grid gap-4 md:grid-cols-2">
          {["Do I pay Telegram?", "Can I run this locally?", "Can I change my bot later?", "Is the token encrypted?"].map((q) => (
            <Card key={q} className="p-5"><HelpCircle className="text-accent" /><h3 className="mt-4 font-semibold text-white">{q}</h3><p className="mt-2 text-sm text-muted">Yes. The platform is designed to be simple, self-hosted and transparent.</p></Card>
          ))}
        </section>
      </main>
    </>
  );
}
