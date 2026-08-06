"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminShell } from "../../components/admin-shell";
import { listPartners } from "../../lib/partner-admin-api";

export default function ShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listPartners({ tab: "all", limit: 1 })
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch(() => {
        if (!cancelled) router.replace("/login");
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  // Always mount AdminShell + children so the App Router page slot stays alive.
  return (
    <>
      <AdminShell>{children}</AdminShell>
      {!ready ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-wf-100/80 text-sm text-wf-600">
          Laden…
        </div>
      ) : null}
    </>
  );
}
