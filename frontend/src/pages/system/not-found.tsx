import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-4 text-center">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-accent">404</p>
        <h1 className="mt-3 text-4xl font-semibold text-white">Page not found</h1>
        <p className="mt-3 text-muted">This route does not exist or has moved.</p>
        <Link to="/"><Button className="mt-6">Back home</Button></Link>
      </div>
    </main>
  );
}
