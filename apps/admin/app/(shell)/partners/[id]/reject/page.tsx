"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, Notice } from "@europmade/ui";
import {
  PartnerAdminApiError,
  rejectPartner,
} from "../../../../../lib/partner-admin-api";

export default function PartnerRejectPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!reason.trim()) {
      setError("Een afkeurreden is verplicht.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await rejectPartner(id, reason.trim());
      router.push("/partners");
    } catch (err) {
      setError(
        err instanceof PartnerAdminApiError
          ? err.message
          : "Afwijzen is niet gelukt.",
      );
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="mb-4 text-[11.5px] text-wf-500">
        Partnerbeheer &gt; <b className="font-semibold text-wf-800">Afwijzen</b>
      </p>
      <h1 className="mb-1.5 text-lg font-bold text-wf-900">Partner afwijzen</h1>
      <p className="mb-5 text-xs text-wf-600">
        Reden verplicht (nooit stilzwijgend).
      </p>

      {error && (
        <Notice variant="warning" className="mb-4">
          {error}
        </Notice>
      )}

      <form onSubmit={handleSubmit}>
        <label className="mb-1.5 block text-xs font-semibold text-wf-700">
          Reden voor afwijzing (verplicht)
        </label>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Bijv. onvolledige of niet-verifieerbare bedrijfsgegevens"
          className="mb-4 min-h-[90px] w-full resize-none rounded-[5px] border border-wf-400 px-3 py-2.5 text-[12.5px] text-wf-800"
          required
        />
        <Notice variant="warning" className="mb-5">
          Verplicht veld — consistent met het platformbrede
          &apos;nooit stilzwijgend&apos;-principe (elke beslissing krijgt een
          vastgelegde reden).
        </Notice>
        <div className="flex justify-end gap-2.5">
          <Button
            type="button"
            variant="secondary"
            onClick={() => router.push(`/partners/${id}`)}
          >
            Annuleren
          </Button>
          <Button type="submit" variant="destructive" disabled={busy}>
            {busy ? "Bezig…" : "Aanvraag afwijzen"}
          </Button>
        </div>
      </form>
    </div>
  );
}
