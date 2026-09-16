"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminShell } from "../../components/admin-shell";
import { getSession, MedusaAdminAuthError } from "../../lib/medusa-admin-auth";

export default function ShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getSession()
      .then((session) => {
        if (cancelled) return;
        if (!session.user?.id) {
          router.replace("/login");
          return;
        }
        setReady(true);
      })
      .catch((err) => {
        if (cancelled) return;
        if (err instanceof MedusaAdminAuthError && err.status === 401) {
          router.replace("/login");
          return;
        }
        router.replace("/login");
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-wf-100 text-sm text-wf-600">
        Laden…
      </div>
    );
  }

  // Mount shell + children only after a valid Medusa user session/token.
  return <AdminShell>{children}</AdminShell>;
}
