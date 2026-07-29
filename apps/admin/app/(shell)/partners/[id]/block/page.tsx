"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, Notice } from "@europmade/ui";
import {
  blockPartner,
  PartnerAdminApiError,
} from "../../../../../lib/partner-admin-api";

export default function PartnerBlockPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) {
      setError("Een blokkeerreden is verplicht.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await blockPartner(id, reason.trim());
      router.push("/partners");
    } catch (err) {
      setError(
        err instanceof PartnerAdminApiError
          ? err.message
          : "Blokkeren is niet gelukt.",
      );
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="mb-4 text-[11.5px] text-wf-500">
        Partnerbeheer &gt;{" "}
        <b className="font-semibold text-wf-800">Blokkeren</b>
      </p>
      <h1 className="mb-1.5 text-lg font-bold text-wf-900">Partner blokkeren</h1>
      <p className="mb-5 text-xs text-wf-600">
        Ingrijpende actie — reden verplicht.
      </p>

      <Notice variant="warning" className="mb-4">
        Blokkeren is een ingrijpende actie — de partner verliest onmiddellijk
        toegang tot het Seller Dashboard.
      </Notice>

      {error && (
        <Notice variant="warning" className="mb-4">
          {error}
        </Notice>
      )}

      <form onSubmit={handleSubmit}>
        <label className="mb-1.5 block text-xs font-semibold text-wf-700">
          Reden voor blokkering (verplicht)
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Bijv. fraude-signalen, herhaalde schending van platformregels"
          className="mb-4 min-h-[90px] w-full resize-none rounded-[5px] border border-wf-400 px-3 py-2.5 text-[12.5px] text-wf-800"
          required
        />
        <div className="flex justify-end gap-2.5">
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push(`/partners/${id}`)}
          >
            Annuleren
          </Button>
          <Button type="submit" variant="destructive" disabled={busy}>
            {busy ? "Bezig…" : "Partner blokkeren"}
          </Button>
        </div>
      </form>
    </div>
  );
}
