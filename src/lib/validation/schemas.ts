import { z } from "zod";
import { formatZodError } from "@/lib/auth/errors";

const emailSchema = z.string().trim().email("Enter a valid email address.");
const passwordSchema = z.string().min(6, "Password must be at least 6 characters.");
const shortText = (label: string, max = 200) =>
  z.string().trim().min(1, `${label} is required.`).max(max, `${label} is too long.`);

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required."),
});

export const registerSchema = z
  .object({
    name: shortText("Name", 120),
    business: z.string().trim().max(120, "Business name is too long.").optional(),
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your password."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your password."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export const settingsSchema = z.object({
  name: shortText("Name", 120),
  business: z.string().trim().max(120).optional(),
  companyAddress: z.string().trim().max(500).optional(),
  website: z
    .string()
    .trim()
    .max(200)
    .optional()
    .refine((v) => !v || /^https?:\/\/.+/i.test(v), "Enter a valid URL (https://…)."),
  contactEmail: z
    .string()
    .trim()
    .refine(
      (v) => v === "" || z.string().email().safeParse(v).success,
      "Enter a valid contact email.",
    ),
  wallet: z.string().trim().min(6, "Wallet address is too short.").max(120),
  brandColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Invalid brand color."),
});

const invoiceItemSchema = z.object({
  description: z.string().trim().min(1, "Item description is required.").max(500),
  quantity: z.number().positive("Quantity must be greater than 0."),
  unitPrice: z.number().min(0, "Unit price cannot be negative."),
});

export const invoiceCreateSchema = z.object({
  title: shortText("Invoice title", 200),
  clientName: shortText("Client name", 120),
  clientEmail: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || emailSchema.safeParse(v).success, "Enter a valid email address."),
  clientCompany: z.string().trim().max(120).optional(),
  description: z.string().trim().max(5000).optional(),
  termsAndConditions: z.string().trim().max(5000).optional(),
  discount: z.number().min(0, "Discount cannot be negative."),
  tax: z.number().min(0, "Tax cannot be negative."),
  items: z.array(invoiceItemSchema).min(1, "Add at least one line item."),
  cryptoWallet: z.string().trim().max(120).optional(),
});

export function firstZodError(error: z.ZodError, preferredField?: string): string {
  return formatZodError(error, preferredField);
}
