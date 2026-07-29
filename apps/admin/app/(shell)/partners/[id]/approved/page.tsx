"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@europmade/ui";
import { formatRoles, getPartner } from "../../../../../lib/partner-admin-api";

export default function PartnerApprovedPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [name, setName] = useState("Partner");
  const [roles, setRoles] = useState("");

  useEffect(() => {
    getPartner(id)
      .then(({ partner }) => {
        setName(partner.company?.legal_name ?? "Partner");
        setRoles(formatRoles(partner));
      })
      .catch(() => {
        // Scherm blijft bruikbaar zonder detail.
      });
  }, [id]);

  return (
    <div>
      <p className="mb-4 text-[11.5px] text-wf-500">
        Partnerbeheer &gt;{" "}
        <b className="font-semibold text-wf-800">Goedgekeurd</b>
      </p>
      <div className="px-4 py-11 text-center tablet:px-10">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-wf-900 text-2xl text-white">
          ✓
        </div>
        <h1 className="mb-2.5 text-lg font-bold text-wf-900">
          Partner goedgekeurd
        </h1>
        <p className="mx-auto mb-5 max-w-md text-[12.5px] leading-relaxed text-wf-600">
          {name} is goedgekeurd als {roles || "partner"} en kan nu inloggen op
          het Seller Dashboard.
        </p>
        <div className="mx-auto mb-5 max-w-md rounded-md border border-wf-300 bg-white px-4 py-3 text-left text-[11.5px] leading-relaxed text-wf-700">
          Deze actie wordt vastgelegd in de Audit Log (wie/wanneer) en de
          partner ontvangt een notificatie zodra de notificatiemodule actief
          is.
        </div>
        <Button onClick={() => router.push("/partners")}>
          Terug naar Partnerbeheer
        </Button>
      </div>
    </div>
  );
}
