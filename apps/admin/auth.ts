import NextAuth from "next-auth";

/**
 * Auth.js — basisconfiguratie.
 *
 * Dit bestand configureert uitsluitend de Auth.js-infrastructuur zelf.
 * Er is nadrukkelijk GEEN provider, geen inlogpagina en geen enkele route in
 * deze app die dit daadwerkelijk aanroept — conform de opdracht-scope
 * ("Geen login, geen registratie"). De echte provider(s) (bijv. credentials-
 * of e-mailverificatie, consistent met de bevroren Authenticatie-specificatie
 * in docs/03-functional-specs/authenticatie/) worden pas toegevoegd zodra
 * authenticatie als functionaliteit wordt gebouwd.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [],
  pages: {
    // Placeholder-pad, wordt pas relevant zodra er daadwerkelijk een inlogscherm bestaat.
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
});
