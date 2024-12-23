import zod from "zod";

export const emailSchema = zod
  .string()
  .email({ message: "Invalid email address" });
export const passwordSchema = zod
  .string()
  .min(8)
  .regex(
    /^(?:(?=.*\d)(?=.*[a-z])(?=.*[A-Z]).*)$/,
    "Password must contain at least one uppercase letter, one lowercase letter, and one number."
  );