import { z } from "zod";

export const LoginSchema = z.object({
  email: z.string().trim().email("Please enter a valid campus email address"),
  password: z.string().min(1, "Password is required"),
});

export const EventCategoryEnum = z.enum([
  "Tech",
  "Career",
  "Arts",
  "Social",
  "Sports",
  "Academic",
  "Workshop",
]);

export const TARGET_AUDIENCE_OPTIONS = [
  "All Students",
  "1st Year",
  "2nd Year",
  "3rd Year",
  "Final Year",
  "Postgraduate",
  "Faculty & Staff",
] as const;

export const TargetAudienceEnum = z.enum(TARGET_AUDIENCE_OPTIONS);

export const SafeUrlSchema = z
  .string()
  .trim()
  .url("Invalid URL format")
  .refine((url) => /^https?:\/\//i.test(url), {
    message: "URL must start with http:// or https://",
  });

export const ProposeEventSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Title must be at least 3 characters")
    .max(150, "Title cannot exceed 150 characters"),
  category: EventCategoryEnum,
  targetAudience: z
    .array(TargetAudienceEnum)
    .min(1, "Select at least one target audience")
    .default(["All Students"]),
  venueId: z.string().uuid("Invalid venue selection"),
  startTime: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid start time timestamp",
  }),
  endTime: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid end time timestamp",
  }),
  description: z
    .string()
    .trim()
    .min(10, "Description must be at least 10 characters"),
  communityId: z.string().uuid().optional(),
  coverImageUrl: SafeUrlSchema.optional().nullable().or(z.literal("")),
  externalRegistrationUrl: SafeUrlSchema.optional().nullable().or(z.literal("")),
}).refine(
  (data) => new Date(data.endTime).getTime() > new Date(data.startTime).getTime(),
  {
    message: "End time must be after start time",
    path: ["endTime"],
  }
);

export const UpdateEventStatusSchema = z.object({
  status: z.enum(["published", "rejected", "pending"], {
    message: "Status must be 'published', 'rejected', or 'pending'",
  }),
  rejectionReason: z.string().trim().optional().nullable(),
});

export const CreateVenueSchema = z.object({
  name: z.string().trim().min(2, "Venue name must be at least 2 characters"),
  building: z.string().trim().optional().default("Campus"),
  capacity: z.coerce.number().int().positive().default(100),
  address: z.string().trim().optional(),
  notes: z.string().trim().optional(),
});

export const UpdateVenueSchema = z.object({
  id: z.string().uuid("Invalid venue ID"),
  is_active: z.boolean({ message: "is_active must be a boolean" }),
});


export const ConflictCheckSchema = z.object({
  venueId: z.string().uuid("Invalid venue ID"),
  startTime: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid start time ISO format",
  }),
  endTime: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid end time ISO format",
  }),
  category: z.string().optional(),
  targetAudience: z.array(TargetAudienceEnum).optional(),
  excludeEventId: z.string().uuid().optional(),
});

export const CreateUserSchema = z.object({
  fullName: z.string().trim().min(2, "Full name must be at least 2 characters"),
  email: z.string().trim().email("Please enter a valid campus email address"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
  role: z.enum(["admin", "principal", "vice_principal", "organizer"], {
    message: "Role must be 'admin', 'principal', 'vice_principal', or 'organizer'",
  }),
  communityId: z.string().uuid("Invalid community ID").optional().nullable().or(z.literal("")),
});

export const UpdateUserSchema = z.object({
  fullName: z.string().trim().min(2, "Full name must be at least 2 characters").optional(),
  role: z.enum(["admin", "principal", "vice_principal", "organizer"]).optional(),
  communityId: z.string().uuid("Invalid community ID").optional().nullable().or(z.literal("")),
});

export const UpdateVenueFullSchema = z.object({
  name: z.string().trim().min(2, "Venue name must be at least 2 characters").optional(),
  building: z.string().trim().optional(),
  capacity: z.coerce.number().int().positive().optional(),
  address: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
  is_active: z.boolean().optional(),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().trim().email("Please enter a valid campus email address"),
});

export const ResetPasswordSchema = z
  .object({
    password: z.string().min(6, "Password must be at least 6 characters long"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const CreateCommunitySchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Community name must be at least 2 characters")
    .max(100, "Community name cannot exceed 100 characters"),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]+$/, "Slug must only contain lowercase letters, numbers, and hyphens")
    .optional()
    .or(z.literal("")),
  category: EventCategoryEnum,
  description: z.string().trim().optional().nullable().or(z.literal("")),
  logoUrl: SafeUrlSchema.optional().nullable().or(z.literal("")),
  website: SafeUrlSchema.optional().nullable().or(z.literal("")),
  instagram: z.string().trim().optional().nullable().or(z.literal("")),
  leadUserId: z.string().uuid("Invalid community lead ID").optional().nullable().or(z.literal("")),
});

export const UpdateCommunityFullSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Community name must be at least 2 characters")
    .max(100, "Community name cannot exceed 100 characters")
    .optional(),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9-]+$/, "Slug must only contain lowercase letters, numbers, and hyphens")
    .optional(),
  category: EventCategoryEnum.optional(),
  description: z.string().trim().optional().nullable(),
  logoUrl: SafeUrlSchema.optional().nullable().or(z.literal("")),
  website: SafeUrlSchema.optional().nullable().or(z.literal("")),
  instagram: z.string().trim().optional().nullable(),
  leadUserId: z.string().uuid("Invalid community lead ID").optional().nullable().or(z.literal("")),
  status: z.enum(["approved", "pending", "rejected"]).optional(),
});

// ==========================================================================
// Centralized Inferred TypeScript Input Types (Single Source of Truth)
// ==========================================================================

export type LoginInput = z.infer<typeof LoginSchema>;
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;

export type ProposeEventInput = z.infer<typeof ProposeEventSchema>;
export type UpdateEventStatusInput = z.infer<typeof UpdateEventStatusSchema>;
export type ConflictCheckInput = z.infer<typeof ConflictCheckSchema>;

export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;

export type CreateVenueInput = z.infer<typeof CreateVenueSchema>;
export type UpdateVenueInput = z.infer<typeof UpdateVenueSchema>;
export type UpdateVenueFullInput = z.infer<typeof UpdateVenueFullSchema>;

export type CreateCommunityInput = z.infer<typeof CreateCommunitySchema>;
export type UpdateCommunityFullInput = z.infer<typeof UpdateCommunityFullSchema>;



