import { z } from "zod";

/**
 * A bcrypt 72 bájt után csendben levágja a jelszót. Bájtban mérünk, mert az
 * ékezetes betű UTF-8-ban két bájt. `TextEncoder`, mert ezt a sémát a
 * böngészőbeli űrlap is futtatja, ahol `Buffer` nincs.
 */
const fitsBcrypt = (p: string) => new TextEncoder().encode(p).length <= 72;

export const loginSchema = z.object({
  email:      z.string().email("Érvénytelen email cím."),
  password:   z.string().min(1, "A jelszó megadása kötelező."),
  rememberMe: z.boolean().default(false),
});

export const registerSchema = z
  .object({
    name: z.string().min(2, "A név legalább 2 karakter legyen.").max(100),
    email: z.string().email("Érvénytelen email cím."),
    password: z
      .string()
      .min(8, "A jelszó legalább 8 karakter legyen.")
      .regex(/[A-Z]/, "Legalább egy nagybetűt tartalmazzon.")
      .regex(/[0-9]/, "Legalább egy számot tartalmazzon.")
      .refine(fitsBcrypt, "A jelszó túl hosszú (legfeljebb 72 bájt)."),
    confirmPassword: z.string(),
    // Születési dátum helyett nyilatkozat: a korhatárhoz csak az kell, hogy
    // betöltötte-e a 18. évét, a pontos dátum felesleges személyes adat lenne
    // (GDPR 5. cikk (1) c), és ellenőrizni úgysem tudnánk.
    acceptTerms: z.literal(true, {
      errorMap: () => ({ message: "A regisztrációhoz nyilatkoznod kell a korodról, és el kell fogadnod az ÁSZF-et." }),
    }),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "A két jelszó nem egyezik.",
    path: ["confirmPassword"],
  });

export const shelterRegisterSchema = z
  .object({
    // Menhely adatok
    shelterName: z.string().min(2, "A menhely neve legalább 2 karakter legyen.").max(120),
    city:        z.string().min(1, "A város megadása kötelező."),
    address:     z.string().min(2, "A cím megadása kötelező."),
    zipCode:     z.string().optional(),
    phone:       z.string().optional(),
    shelterEmail: z.string().email("Érvénytelen email cím.").optional().or(z.literal("")),
    description: z.string().max(2000).optional(),
    // Admin fiók
    adminName: z.string().min(2, "A név legalább 2 karakter legyen.").max(100),
    email:     z.string().email("Érvénytelen email cím."),
    password: z
      .string()
      .min(8, "A jelszó legalább 8 karakter legyen.")
      .regex(/[A-Z]/, "Legalább egy nagybetűt tartalmazzon.")
      .regex(/[0-9]/, "Legalább egy számot tartalmazzon.")
      .refine(fitsBcrypt, "A jelszó túl hosszú (legfeljebb 72 bájt)."),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "A két jelszó nem egyezik.",
    path: ["confirmPassword"],
  });

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ShelterRegisterInput = z.infer<typeof shelterRegisterSchema>;
