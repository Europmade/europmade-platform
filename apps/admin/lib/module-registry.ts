/**
 * Admin Shell — generiek module-registratiecontract (admin-shell/spec.md §1.9).
 * De Shell kent modules uitsluitend via dit contract.
 */

export interface AdminModuleContract {
  naam: string;
  route: string;
  icoon: string;
  permissie: "Beheerder";
  navigatiepositie: number;
}

export const ADMIN_MODULES: AdminModuleContract[] = [
  {
    naam: "Partnerbeheer",
    route: "/partners",
    icoon: "partners",
    permissie: "Beheerder",
    navigatiepositie: 10,
  },
];

export function modulesSorted() {
  return [...ADMIN_MODULES].sort(
    (a, b) => a.navigatiepositie - b.navigatiepositie,
  );
}
