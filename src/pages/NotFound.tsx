import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router";

import { Button } from "@/components/ui/button";
import { Wordmark } from "@/components/keepcraft-ui";

export default function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col bg-nb-paper">
      <div className="pointer-events-none absolute inset-0 nb-grid opacity-60" />
      <header className="relative border-b-[3px] border-nb-ink">
        <div className="mx-auto flex h-16 w-full max-w-[1040px] items-center px-5">
          <Link to="/">
            <Wordmark />
          </Link>
        </div>
      </header>

      <main className="relative flex flex-1 items-center justify-center px-5 py-16">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="nb-panel w-full max-w-lg p-8 text-center"
        >
          <p className="nb-label text-muted-foreground">Error 404</p>
          <p className="mt-2 font-display text-6xl leading-none">404</p>
          <h1 className="mt-4 font-display text-2xl tracking-tight uppercase">
            This chunk is unloaded.
          </h1>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
            The page you asked for does not exist. Head back to the console and
            check on the fleet.
          </p>
          <Button asChild className="mt-6">
            <Link to="/dashboard">
              <ArrowLeft className="size-4" />
              Back to console
            </Link>
          </Button>
        </motion.div>
      </main>
    </div>
  );
}
