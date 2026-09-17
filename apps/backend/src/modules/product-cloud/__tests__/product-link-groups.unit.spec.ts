import { MedusaError } from "@medusajs/framework/utils"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import {
  adminProductLinkGroupListFilter,
  assertAdminCanDecideProductLink,
  applyProductLinkGroupDecision,
  assertProductsFreeForActivation,
  canonicalValuesKey,
  isActiveConsumableLinkGroup,
  normalizeProductLinkProposal,
  productIdsBlockingActivation,
  proposalPersistenceTouchesCatalogOrOffers,
  serializeProductLinkGroup,
  toPublicProductLinkGroup,
  type ProductLinkProposalInput,
} from "../product-link-groups"

const PRODUCTS = new Set(["prod_A", "prod_B", "prod_C", "prod_D"])

function petrolShirts(
  overrides: Partial<ProductLinkProposalInput> = {}
): ProductLinkProposalInput {
  return {
    name: "Petrol Industries 3-pack T-shirts",
    dimensions: ["Kleur", "Maat"],
    members: [
      {
        product_id: "prod_A",
        values: { Kleur: "Zwart", Maat: "M" },
      },
      {
        product_id: "prod_B",
        values: { Kleur: "Wit", Maat: "M" },
      },
    ],
    note: "Zelfde lijn, andere kleur/maat.",
    ...overrides,
  }
}

function expectInvalid(run: () => unknown, snippet: string) {
  try {
    run()
    throw new Error("expected INVALID_DATA")
  } catch (err) {
    expect(err).toBeInstanceOf(MedusaError)
    expect((err as Error).message).toContain(snippet)
  }
}

describe("product link group proposals", () => {
  it("accepts a valid proposal with one dimension", () => {
    const result = normalizeProductLinkProposal(
      {
        name: "Kleurreeks",
        dimensions: ["Kleur"],
        members: [
          { product_id: "prod_A", values: { Kleur: "Zwart" } },
          { product_id: "prod_B", values: { Kleur: "Wit" } },
        ],
      },
      "sel_submitter",
      PRODUCTS
    )
    expect(result.status).toBe("proposed")
    expect(result.dimensions).toEqual(["Kleur"])
    expect(result.members).toHaveLength(2)
    expect(result.members[0].values_key).toBe("Kleur=Zwart")
  })

  it("accepts a valid proposal with multiple dimensions", () => {
    const result = normalizeProductLinkProposal(
      petrolShirts({
        members: [
          { product_id: "prod_A", values: { Kleur: "Zwart", Maat: "M" } },
          { product_id: "prod_B", values: { Kleur: "Wit", Maat: "M" } },
          { product_id: "prod_C", values: { Kleur: "Zwart", Maat: "L" } },
          { product_id: "prod_D", values: { Kleur: "Wit", Maat: "L" } },
        ],
      }),
      "sel_submitter",
      PRODUCTS
    )
    expect(result.dimensions).toEqual(["Kleur", "Maat"])
    expect(result.members).toHaveLength(4)
    expect(canonicalValuesKey(["Kleur", "Maat"], result.members[3].values)).toBe(
      "Kleur=Wit|Maat=L"
    )
  })

  it("keeps multiple standalone product ids", () => {
    const result = normalizeProductLinkProposal(
      petrolShirts(),
      "sel_c",
      PRODUCTS
    )
    expect(result.members.map((m) => m.product_id)).toEqual(["prod_A", "prod_B"])
  })

  it("rejects a duplicate product within the same group", () => {
    expectInvalid(
      () =>
        normalizeProductLinkProposal(
          petrolShirts({
            members: [
              { product_id: "prod_A", values: { Kleur: "Zwart", Maat: "M" } },
              { product_id: "prod_A", values: { Kleur: "Wit", Maat: "M" } },
            ],
          }),
          "sel_c",
          PRODUCTS
        ),
      "twee keer"
    )
  })

  it("rejects a duplicate full value tuple", () => {
    expectInvalid(
      () =>
        normalizeProductLinkProposal(
          petrolShirts({
            members: [
              { product_id: "prod_A", values: { Kleur: "Zwart", Maat: "M" } },
              { product_id: "prod_B", values: { Kleur: "Zwart", Maat: "M" } },
            ],
          }),
          "sel_c",
          PRODUCTS
        ),
      "waardetupel"
    )
  })

  it("rejects a missing dimension value", () => {
    expectInvalid(
      () =>
        normalizeProductLinkProposal(
          petrolShirts({
            members: [
              { product_id: "prod_A", values: { Kleur: "Zwart" } },
              { product_id: "prod_B", values: { Kleur: "Wit", Maat: "M" } },
            ],
          }),
          "sel_c",
          PRODUCTS
        ),
      "Ontbrekende waarde"
    )
  })

  it("rejects an empty dimensions list", () => {
    expectInvalid(
      () =>
        normalizeProductLinkProposal(
          petrolShirts({ dimensions: [] }),
          "sel_c",
          PRODUCTS
        ),
      "Minimaal één dimensie"
    )
  })

  it("rejects a product that does not exist", () => {
    expectInvalid(
      () =>
        normalizeProductLinkProposal(
          petrolShirts({
            members: [
              { product_id: "prod_missing", values: { Kleur: "Zwart", Maat: "M" } },
            ],
          }),
          "sel_c",
          PRODUCTS
        ),
      "bestaat niet"
    )
  })

  it("stores the proposal as proposed", () => {
    const result = normalizeProductLinkProposal(
      petrolShirts(),
      "sel_c",
      PRODUCTS
    )
    expect(result.status).toBe("proposed")
  })

  it("takes seller identity from the auth context, not the body", () => {
    const result = normalizeProductLinkProposal(
      petrolShirts({ submitter_seller_id: "sel_spoof" }),
      "sel_authenticated",
      PRODUCTS
    )
    expect(result.submitter_seller_id).toBe("sel_authenticated")
  })

  it("does not let a seller create an active group", () => {
    expectInvalid(
      () =>
        normalizeProductLinkProposal(
          petrolShirts({ status: "active" }),
          "sel_c",
          PRODUCTS
        ),
      "proposed"
    )
  })

  it("does not describe a Product Cloud product mutation", () => {
    const result = normalizeProductLinkProposal(
      petrolShirts(),
      "sel_c",
      PRODUCTS
    )
    expect(result).not.toHaveProperty("title")
    expect(result).not.toHaveProperty("lifecycle_status")
    expect(
      proposalPersistenceTouchesCatalogOrOffers({
        updateProducts: undefined,
        updateOffers: undefined,
        createProductVariants: undefined,
      })
    ).toBe(false)
  })

  it("does not describe an offer mutation", () => {
    expect(
      proposalPersistenceTouchesCatalogOrOffers({
        updateOffers: true,
      })
    ).toBe(true)
    const result = normalizeProductLinkProposal(
      petrolShirts(),
      "sel_c",
      PRODUCTS
    )
    expect(JSON.stringify(result)).not.toMatch(/base_price|seller_sku|quantity/)
  })

  it("does not require product ownership to submit a link proposal", () => {
    const result = normalizeProductLinkProposal(
      petrolShirts(),
      "sel_not_owner",
      PRODUCTS
    )
    expect(result.submitter_seller_id).toBe("sel_not_owner")
    expect(result.members.map((m) => m.product_id)).toEqual(["prod_A", "prod_B"])
  })

  it("accepts deactivate request without members", () => {
    const result = normalizeProductLinkProposal(
      {
        name: "Deactivering",
        dimensions: [],
        members: [],
        request_kind: "deactivate",
        target_group_id: "plgrp_active",
        note: "Niet meer dezelfde lijn",
      },
      "sel_c",
      PRODUCTS
    )
    expect(result.request_kind).toBe("deactivate")
    expect(result.target_group_id).toBe("plgrp_active")
    expect(result.members).toHaveLength(0)
  })

  it("requires target_group_id for amend", () => {
    expectInvalid(
      () =>
        normalizeProductLinkProposal(
          {
            name: "Amend",
            dimensions: ["Kleur"],
            members: [
              { product_id: "prod_A", values: { Kleur: "Zwart" } },
              { product_id: "prod_B", values: { Kleur: "Wit" } },
            ],
            request_kind: "amend",
          },
          "sel_c",
          PRODUCTS
        ),
      "target_group_id"
    )
  })

  it("does not allow a product to join two active groups", () => {
    expect(
      productIdsBlockingActivation(["prod_A", "prod_B"], ["prod_A"])
    ).toEqual(["prod_A"])
    expect(() =>
      assertProductsFreeForActivation(["prod_A"], ["prod_A"])
    ).toThrow(/actieve koppelgroep/)
    expect(() =>
      assertProductsFreeForActivation(["prod_B"], ["prod_A"])
    ).not.toThrow()
    expect(() =>
      assertProductsFreeForActivation(["prod_A"], ["prod_A"], [
        {
          product_id: "prod_A",
          product_title: "MOEVE Superwuschel badlaken kleur snow",
          group_id: "plgrp_smoke",
          group_name: "Smoke DT990+MOEVE",
        },
      ])
    ).toThrow(
      /MOEVE Superwuschel badlaken kleur snow in Smoke DT990\+MOEVE \(plgrp_smoke\)/
    )
  })
})

describe("product link group admin decisions", () => {
  it("lets an admin retrieve proposed groups with members and submitter", () => {
    const listed = [
      serializeProductLinkGroup(
        {
          id: "plgrp_1",
          name: "Kleurreeks",
          dimensions: ["Kleur"],
          status: "proposed",
          submitter_seller_id: "sel_c",
          note: "Toelichting",
          created_at: "2026-09-16T12:00:00.000Z",
        },
        [
          {
            id: "plmem_1",
            product_id: "prod_A",
            values: { Kleur: "Zwart" },
            values_key: "Kleur=Zwart",
            is_active_slot: false,
          },
        ]
      ),
    ].filter((g) => g.status === "proposed")
    expect(listed).toHaveLength(1)
    expect(listed[0].submitter_seller_id).toBe("sel_c")
    expect(listed[0].members[0].values).toEqual({ Kleur: "Zwart" })
    expect(listed[0].note).toBe("Toelichting")
    expect(listed[0].created_at).toBeTruthy()
  })

  it("approves a proposed group to active", () => {
    const result = applyProductLinkGroupDecision({
      currentStatus: "proposed",
      decision: "approve",
      decided_by: "user_admin",
      now: new Date("2026-09-16T14:00:00.000Z"),
    })
    expect(result.status).toBe("active")
    expect(result.members_active_slot).toBe(true)
    expect(result.decided_by).toBe("user_admin")
    expect(isActiveConsumableLinkGroup(result, [{ is_active_slot: true }])).toBe(
      true
    )
  })

  it("rejects a proposed group to rejected", () => {
    const result = applyProductLinkGroupDecision({
      currentStatus: "proposed",
      decision: "reject",
      decision_reason: "Niet dezelfde lijn",
      decided_by: "user_admin",
    })
    expect(result.status).toBe("rejected")
    expect(result.members_active_slot).toBe(false)
    expect(result.decision_reason).toBe("Niet dezelfde lijn")
  })

  it("does not let a non-admin decide", () => {
    expect(() =>
      assertAdminCanDecideProductLink("customer")
    ).toThrow(/beheerder/)
    expect(() => assertAdminCanDecideProductLink(undefined)).toThrow(
      /beheerder/
    )
    expect(() => assertAdminCanDecideProductLink("user")).not.toThrow()
  })

  it("does not let active or rejected groups be decided again", () => {
    expectInvalid(
      () =>
        applyProductLinkGroupDecision({
          currentStatus: "active",
          decision: "reject",
          decided_by: "user_admin",
        }),
      "proposed"
    )
    expectInvalid(
      () =>
        applyProductLinkGroupDecision({
          currentStatus: "rejected",
          decision: "approve",
          decided_by: "user_admin",
        }),
      "proposed"
    )
  })

  it("still rejects seller activation of a proposal", () => {
    expectInvalid(
      () =>
        normalizeProductLinkProposal(
          petrolShirts({ status: "active" }),
          "sel_c",
          PRODUCTS
        ),
      "proposed"
    )
  })
})

describe("public product link group", () => {
  const members = [
    {
      product_id: "prod_A",
      product_title: "Zwart",
      values: { Kleur: "Zwart" },
      is_active_slot: true,
    },
    {
      product_id: "prod_B",
      product_title: "Wit",
      values: { Kleur: "Wit" },
      is_active_slot: true,
    },
  ]

  it("exposes an active consumable group", () => {
    const pub = toPublicProductLinkGroup({
      id: "plgrp_active",
      name: "Kleurreeks",
      dimensions: ["Kleur"],
      status: "active",
      members,
    })
    expect(pub?.id).toBe("plgrp_active")
    expect(pub?.members).toHaveLength(2)
  })

  it("hides proposed and rejected groups from customers", () => {
    expect(
      toPublicProductLinkGroup({
        id: "plgrp_prop",
        name: "X",
        dimensions: ["Kleur"],
        status: "proposed",
        members: members.map((m) => ({ ...m, is_active_slot: false })),
      })
    ).toBeNull()
    expect(
      toPublicProductLinkGroup({
        id: "plgrp_rej",
        name: "X",
        dimensions: ["Kleur"],
        status: "rejected",
        members: members.map((m) => ({ ...m, is_active_slot: false })),
      })
    ).toBeNull()
  })

  it("hides active groups with fewer than two public members", () => {
    expect(
      toPublicProductLinkGroup({
        id: "plgrp_active",
        name: "Kleurreeks",
        dimensions: ["Kleur"],
        status: "active",
        members: [members[0]],
      })
    ).toBeNull()
  })
})

describe("admin product link group list filter", () => {
  it("defaults to proposed for missing or unknown status", () => {
    expect(adminProductLinkGroupListFilter(undefined)).toEqual({
      status: "proposed",
    })
    expect(adminProductLinkGroupListFilter("proposed")).toEqual({
      status: "proposed",
    })
    expect(adminProductLinkGroupListFilter(["proposed"])).toEqual({
      status: "proposed",
    })
    expect(adminProductLinkGroupListFilter({ $eq: "proposed" })).toEqual({
      status: "proposed",
    })
    expect(adminProductLinkGroupListFilter({ bogus: true })).toEqual({
      status: "proposed",
    })
    expect(adminProductLinkGroupListFilter("nope")).toEqual({
      status: "proposed",
    })
  })

  it("keeps active, rejected and all", () => {
    expect(adminProductLinkGroupListFilter("active")).toEqual({
      status: "active",
    })
    expect(adminProductLinkGroupListFilter("rejected")).toEqual({
      status: "rejected",
    })
    expect(adminProductLinkGroupListFilter("all")).toEqual({})
  })
})

describe("admin product link review wiring", () => {
  const adminRoot = join(process.cwd(), "../admin")
  const listPage = readFileSync(
    join(adminRoot, "app/(shell)/product-cloud/product-links/page.tsx"),
    "utf8"
  )
  const productsPage = readFileSync(
    join(adminRoot, "app/(shell)/product-cloud/products/page.tsx"),
    "utf8"
  )
  const apiSrc = readFileSync(
    join(adminRoot, "lib/product-link-admin-api.ts"),
    "utf8"
  )
  const routeSrc = readFileSync(
    join(
      process.cwd(),
      "src/api/admin/product-cloud/product-link-groups/route.ts"
    ),
    "utf8"
  )
  const serviceSrc = readFileSync(
    join(process.cwd(), "src/modules/product-cloud/service.ts"),
    "utf8"
  )

  it("uses the admin proposed queue API and renders rows", () => {
    expect(listPage).toContain('useState("proposed")')
    expect(listPage).toContain("listProductLinkGroups(status)")
    expect(listPage).toContain("res.product_link_groups")
    expect(listPage).toContain("/product-cloud/product-links/")
    expect(productsPage).toContain('href="/product-cloud/product-links"')
    expect(apiSrc).toContain("/admin/product-cloud/product-link-groups?status=")
    expect(routeSrc).toContain("adminProductLinkGroupListFilter")
    expect(routeSrc).toContain("listSerializedProductLinkGroups")
    expect(serviceSrc).toContain("group_name")
  })
})
