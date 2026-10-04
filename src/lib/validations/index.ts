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

export const ProposeEventSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "Title must be at least 3 characters")
    .max(150, "Title cannot exceed 150 characters"),
  category: EventCategoryEnum,
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
  coverImageUrl: z.string().url().optional().nullable().or(z.literal("")),
  externalRegistrationUrl: z.string().url().optional().nullable().or(z.literal("")),
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

export const ConflictCheckSchema = z.object({
  venueId: z.string().uuid("Invalid venue ID"),
  startTime: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid start time ISO format",
  }),
  endTime: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid end time ISO format",
  }),
  category: z.string().optional(),
  excludeEventId: z.string().uuid().optional(),
});

export const CreateUserSchema = z.object({
  fullName: z.string().trim().min(2, "Full name must be at least 2 characters"),
  email: z.string().trim().email("Please enter a valid campus email address"),
  password: z.string().min(6, "Password must be at least 6 characters long"),
  role: z.enum(["admin", "principal", "organizer"], {
    message: "Role must be 'admin', 'principal', or 'organizer'",
  }),
  communityId: z.string().uuid("Invalid community ID").optional().nullable().or(z.literal("")),
});

