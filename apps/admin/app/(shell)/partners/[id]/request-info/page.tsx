"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button, Notice } from "@europmade/ui";
import {
  PartnerAdminApiError,
  requestAdditionalInfo,
} from "../../../../../lib/partner-admin-api";

export default function PartnerRequestInfoPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) {
      setError("Een specifiek verzoek om aanvullende informatie is verplicht.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await requestAdditionalInfo(id, message.trim());
      router.push("/partners");
    } catch (err) {
      setError(
        err instanceof PartnerAdminApiError
          ? err.message
          : "Verzoek versturen is niet gelukt.",
      );
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="mb-4 text-[11.5px] text-wf-500">
        Partnerbeheer &gt;{" "}
        <b className="font-semibold text-wf-800">Aanvullende informatie</b>
      </p>
      <h1 className="mb-1.5 text-lg font-bold text-wf-900">
        Aanvullende informatie opvragen
      </h1>
      <p className="mb-5 text-xs text-wf-600">
        Benoem specifiek welk onderdeel verduidelijking nodig heeft.
      </p>

      {error && (
        <Notice variant="warning" className="mb-4">
          {error}
        </Notice>
      )}

      <form onSubmit={handleSubmit}>
        <label className="mb-1.5 block text-xs font-semibold text-wf-700">
          Verzoek (verplicht)
        </label>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Bijv. Upload een recentere KvK-uittreksel voor het vestigingsadres"
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
          <Button type="submit" disabled={busy}>
            {busy ? "Bezig…" : "Verzoek versturen"}
          </Button>
        </div>
      </form>
    </div>
  );
}
