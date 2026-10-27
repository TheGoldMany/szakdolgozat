import { describe, it, expect } from "vitest";
import { registerSchema } from "@/lib/validations/auth";

const base = {
  name: "Teszt Elek",
  email: "teszt@example.com",
  password: "Jelszo123",
  confirmPassword: "Jelszo123",
};

describe("registerSchema: nagykorúsági nyilatkozat", () => {
  it("elfogadja, ha nyilatkozott", () => {
    expect(registerSchema.safeParse({ ...base, acceptTerms: true }).success).toBe(true);
  });

  it("elutasítja nyilatkozat nélkül", () => {
    const r = registerSchema.safeParse({ ...base, acceptTerms: false });
    expect(r.success).toBe(false);
    expect(r.success ? [] : r.error.issues.map((i) => i.path[0])).toContain("acceptTerms");
  });

  it("születési dátumot nem kér és nem ad tovább", () => {
    const r = registerSchema.safeParse({ ...base, acceptTerms: true, birthDate: "2000-01-01" });
    expect(r.success && "birthDate" in r.data).toBe(false);
  });
});
