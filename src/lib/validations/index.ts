import { z } from "zod";

export const LoginSchema = z.object({
  email: z.string().trim().email("Please enter a valid college email address"),
  password: z.string().min(1, "Password is required"),
});

export const UserRoleEnum = z.enum([
  "admin",
  "principal",
  "vice_principal",
  "hod",
  "fic",
  "staff",
  "lead",
]);

export const EventOriginEnum = z.enum(["community", "department", "college"]);
export const CommunityScopeEnum = z.enum(["internal", "external"]);

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

export const UpdateCollegeSettingsSchema = z.object({
  collegeName: z
    .string()
    .trim()
    .min(2, "College name must be at least 2 characters")
    .max(255)
    .optional(),
  shortCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(
      /^[A-Z0-9-]{2,20}$/,
      "Short code must be 2–20 uppercase letters/numbers",
    )
    .optional(),
  letterheadSubtitle: z.string().trim().max(255).optional().nullable(),
  logoUrl: SafeUrlSchema.optional().nullable().or(z.literal("")),
  academicYearStartMonth: z.coerce.number().int().min(1).max(12).optional(),
  timezone: z.string().trim().min(2).max(50).optional(),
});

export const CreateDepartmentSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Department name must be at least 2 characters")
    .max(255),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(
      /^[A-Z0-9]{2,20}$/,
      "Code must be 2–20 uppercase letters/numbers (e.g. CSE, ECE)",
    ),
  hodUserId: z
    .string()
    .uuid("Invalid HOD user ID")
    .optional()
    .nullable()
    .or(z.literal("")),
  actingHodUserId: z
    .string()
    .uuid("Invalid Acting HOD user ID")
    .optional()
    .nullable()
    .or(z.literal("")),
  isActive: z.boolean().optional().default(true),
});

export const UpdateDepartmentSchema = z.object({
  name: z.string().trim().min(2).max(255).optional(),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{2,20}$/, "Code must be 2–20 uppercase letters/numbers")
    .optional(),
  hodUserId: z
    .string()
    .uuid("Invalid HOD user ID")
    .optional()
    .nullable()
    .or(z.literal("")),
  actingHodUserId: z
    .string()
    .uuid("Invalid Acting HOD user ID")
    .optional()
    .nullable()
    .or(z.literal("")),
  isActingHodActive: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export const ToggleActingHodSchema = z.object({
  isActingHodActive: z.boolean(),
});

export const ProposeEventSchema = z
  .object({
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
    departmentId: z.string().uuid().optional(),
    coverImageUrl: SafeUrlSchema.optional().nullable().or(z.literal("")),
    externalRegistrationUrl: SafeUrlSchema.optional()
      .nullable()
      .or(z.literal("")),
  })
  .refine(
    (data) =>
      new Date(data.endTime).getTime() > new Date(data.startTime).getTime(),
    {
      message: "End time must be after start time",
      path: ["endTime"],
    },
  );

export const UpdateEventStatusSchema = z.object({
  status: z.enum(["published", "rejected", "pending", "pending_executive"], {
    message: "Status must be 'published', 'rejected', or 'pending_executive'",
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
  email: z.string().trim().email("Please enter a valid college email address"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
  role: UserRoleEnum,
  designation: z
    .string()
    .trim()
    .max(150)
    .optional()
    .nullable()
    .or(z.literal("")),
  departmentId: z
    .string()
    .uuid("Invalid department ID")
    .optional()
    .nullable()
    .or(z.literal("")),
  communityId: z
    .string()
    .uuid("Invalid community ID")
    .optional()
    .nullable()
    .or(z.literal("")),
  communityMemberRole: z.enum(["lead", "fic", "member"]).optional(),
});

export const UpdateUserSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters")
    .optional(),
  role: UserRoleEnum.optional(),
  designation: z
    .string()
    .trim()
    .max(150)
    .optional()
    .nullable()
    .or(z.literal("")),
  departmentId: z
    .string()
    .uuid("Invalid department ID")
    .optional()
    .nullable()
    .or(z.literal("")),
  communityId: z
    .string()
    .uuid("Invalid community ID")
    .optional()
    .nullable()
    .or(z.literal("")),
  communityMemberRole: z.enum(["lead", "fic", "member"]).optional(),
  isActive: z.boolean().optional(),
});

export const UpdateVenueFullSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Venue name must be at least 2 characters")
    .optional(),
  building: z.string().trim().optional(),
  capacity: z.coerce.number().int().positive().optional(),
  address: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
  is_active: z.boolean().optional(),
});

export const ForgotPasswordSchema = z.object({
  email: z.string().trim().email("Please enter a valid college email address"),
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
    .regex(
      /^[a-z0-9-]+$/,
      "Slug must only contain lowercase letters, numbers, and hyphens",
    )
    .optional()
    .or(z.literal("")),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{2,20}$/, "Code must be 2–20 uppercase letters/numbers")
    .optional()
    .or(z.literal("")),
  scope: CommunityScopeEnum.default("internal"),
  category: EventCategoryEnum,
  description: z.string().trim().optional().nullable().or(z.literal("")),
  logoUrl: SafeUrlSchema.optional().nullable().or(z.literal("")),
  website: SafeUrlSchema.optional().nullable().or(z.literal("")),
  instagram: z.string().trim().optional().nullable().or(z.literal("")),
  leadUserId: z
    .string()
    .uuid("Invalid community lead ID")
    .optional()
    .nullable()
    .or(z.literal("")),
  ficUserIds: z.array(z.string().uuid("Invalid FIC user ID")).optional(),
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
    .regex(
      /^[a-z0-9-]+$/,
      "Slug must only contain lowercase letters, numbers, and hyphens",
    )
    .optional(),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z0-9]{2,20}$/, "Code must be 2–20 uppercase letters/numbers")
    .optional(),
  scope: CommunityScopeEnum.optional(),
  category: EventCategoryEnum.optional(),
  description: z.string().trim().optional().nullable(),
  logoUrl: SafeUrlSchema.optional().nullable().or(z.literal("")),
  website: SafeUrlSchema.optional().nullable().or(z.literal("")),
  instagram: z.string().trim().optional().nullable(),
  leadUserId: z
    .string()
    .uuid("Invalid community lead ID")
    .optional()
    .nullable()
    .or(z.literal("")),
  ficUserIds: z.array(z.string().uuid("Invalid FIC user ID")).optional(),
  status: z.enum(["approved", "pending", "rejected"]).optional(),
});

export const AssignCommunityMemberSchema = z.object({
  userId: z.string().uuid("Invalid user ID"),
  role: z.enum(["lead", "fic", "member"]),
});

export const FundingSourceEnum = z.enum([
  "No Cost",
  "College Fund",
  "Department Fund",
  "Sponsor / External",
  "Self-Funded",
]);

export const EventMentorInputSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Mentor name must be at least 2 characters")
    .max(255),
  roleTitle: z.string().trim().min(2, "Role/designation is required").max(255),
  organization: z.string().trim().min(2, "Organization is required").max(255),
  mentorType: z.enum(["internal", "external"]).default("external"),
});

export const CoHostEntitySchema = z.object({
  entityType: z.enum(["department", "community"]),
  id: z.string().uuid("Invalid co-host ID"),
});

export const WorkspaceEventSchema = z
  .object({
    originType: z.enum(["community", "department"]).default("community"),
    communityId: z
      .string()
      .uuid("Invalid community selection")
      .optional()
      .nullable(),
    departmentId: z
      .string()
      .uuid("Invalid department selection")
      .optional()
      .nullable(),
    coHosts: z
      .array(CoHostEntitySchema)
      .max(10, "Maximum 10 co-hosts supported")
      .optional()
      .default([]),
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
    coverImageUrl: SafeUrlSchema.optional().nullable().or(z.literal("")),
    externalRegistrationUrl: SafeUrlSchema.optional()
      .nullable()
      .or(z.literal("")),
    estimatedBudget: z.coerce
      .number()
      .min(0, "Estimated budget cannot be negative")
      .default(0),
    fundingSource: z.string().trim().min(2).max(100).default("No Cost"),
    mentors: z.array(EventMentorInputSchema).max(20).optional().default([]),
    action: z.enum(["draft", "submit"]).optional().default("submit"),
  })
  .refine(
    (data) =>
      new Date(data.endTime).getTime() > new Date(data.startTime).getTime(),
    {
      message: "End time must be after start time",
      path: ["endTime"],
    },
  )
  .refine(
    (data) =>
      (data.originType === "community" && Boolean(data.communityId)) ||
      (data.originType === "department" && Boolean(data.departmentId)),
    {
      message: "Select the primary Community or Department hosting this event",
      path: ["communityId"],
    },
  );

export const Stage2ApproveSchema = z.object({
  remarks: z.string().trim().max(1000).optional().nullable(),
});

export const Stage2RejectSchema = z.object({
  rejectionReason: z
    .string()
    .trim()
    .min(5, "Provide a clear rejection reason (minimum 5 characters)")
    .max(1000),
});

export const ExecutiveApproveSchema = z.object({
  overrideLeadTime: z.boolean().optional().default(false),
  overrideReason: z.string().trim().max(500).optional().nullable(),
  remarks: z.string().trim().max(1000).optional().nullable(),
});

export const ExecutiveRejectSchema = z.object({
  rejectionReason: z
    .string()
    .trim()
    .min(5, "Provide a clear rejection reason (minimum 5 characters)")
    .max(1000),
});

export const CollegeEventCreateSchema = z
  .object({
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
    coverImageUrl: SafeUrlSchema.optional().nullable().or(z.literal("")),
    externalRegistrationUrl: SafeUrlSchema.optional()
      .nullable()
      .or(z.literal("")),
    estimatedBudget: z.coerce.number().min(0).default(0),
    fundingSource: z.string().trim().min(2).max(100).default("College Fund"),
    coordinatorId: z
      .string()
      .uuid("Invalid coordinator ID")
      .optional()
      .nullable()
      .or(z.literal("")),
    mentors: z.array(EventMentorInputSchema).max(20).optional().default([]),
    overrideLeadTime: z.boolean().optional().default(false),
    overrideReason: z.string().trim().max(500).optional().nullable(),
    forceRescheduleEventIds: z.array(z.string().uuid()).optional().default([]),
    rescheduleReason: z.string().trim().max(500).optional().nullable(),
  })
  .refine(
    (data) =>
      new Date(data.endTime).getTime() > new Date(data.startTime).getTime(),
    {
      message: "End time must be after start time",
      path: ["endTime"],
    },
  );

export const CancelEventSchema = z.object({
  cancellationReason: z
    .string()
    .trim()
    .min(5, "Provide a brief cancellation reason (minimum 5 characters)")
    .max(500),
});

// ==========================================================================
// Centralized Inferred TypeScript Input Types
// ==========================================================================

export type LoginInput = z.infer<typeof LoginSchema>;
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;

export type UpdateCollegeSettingsInput = z.infer<
  typeof UpdateCollegeSettingsSchema
>;
export type CreateDepartmentInput = z.infer<typeof CreateDepartmentSchema>;
export type UpdateDepartmentInput = z.infer<typeof UpdateDepartmentSchema>;

export type ProposeEventInput = z.infer<typeof ProposeEventSchema>;
export type UpdateEventStatusInput = z.infer<typeof UpdateEventStatusSchema>;
export type ConflictCheckInput = z.infer<typeof ConflictCheckSchema>;

export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;

export type CreateVenueInput = z.infer<typeof CreateVenueSchema>;
export type UpdateVenueInput = z.infer<typeof UpdateVenueSchema>;
export type UpdateVenueFullInput = z.infer<typeof UpdateVenueFullSchema>;

export type CreateCommunityInput = z.infer<typeof CreateCommunitySchema>;
export type UpdateCommunityFullInput = z.infer<
  typeof UpdateCommunityFullSchema
>;
export type AssignCommunityMemberInput = z.infer<
  typeof AssignCommunityMemberSchema
>;
export type EventMentorInput = z.infer<typeof EventMentorInputSchema>;
export type CoHostEntityInput = z.infer<typeof CoHostEntitySchema>;
export type WorkspaceEventInput = z.infer<typeof WorkspaceEventSchema>;
export type CollegeEventCreateInput = z.infer<typeof CollegeEventCreateSchema>;
