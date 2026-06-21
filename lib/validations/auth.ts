import { z } from "zod";

export const loginSchema = z.object({
  email:      z.string().email("Érvénytelen email cím."),
  password:   z.string().min(1, "A jelszó megadása kötelező."),
  rememberMe: z.boolean().default(false),
});

export const registerSchema = z
  .object({
    name: z.string().min(2, "A név legalább 2 karakter legyen.").max(100),
    email: z.string().email("Érvénytelen email cím."),
    birthDate: z.string().min(1, "A születési dátum megadása kötelező."),
    password: z
      .string()
      .min(8, "A jelszó legalább 8 karakter legyen.")
      .regex(/[A-Z]/, "Legalább egy nagybetűt tartalmazzon.")
      .regex(/[0-9]/, "Legalább egy számot tartalmazzon."),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "A két jelszó nem egyezik.",
    path: ["confirmPassword"],
  })
  .refine(
    (d) => {
      const birth = new Date(d.birthDate);
      const minAge = new Date();
      minAge.setFullYear(minAge.getFullYear() - 18);
      return birth <= minAge;
    },
    { message: "A regisztrációhoz legalább 18 évesnek kell lenned.", path: ["birthDate"] }
  );

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
