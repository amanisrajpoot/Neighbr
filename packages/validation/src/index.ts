import { z } from "zod";
import {
  VisitorPassType,
  GateType,
  UnitMembershipType,
  NoticeCategory,
  NoticePriority,
  StaffType,
  VehicleType,
  SOSType,
} from "@neighbr/shared-config";

// Indian 10-digit phone regex (or international with + prefix)
export const phoneSchema = z
  .string()
  .min(10, "Phone must be at least 10 digits")
  .max(15, "Phone must not exceed 15 characters")
  .regex(/^(\+\d{1,3}[- ]?)?\d{10}$/, "Invalid phone number format");

export const requestOtpSchema = z.object({
  phone: phoneSchema,
});

export const verifyOtpSchema = z.object({
  phone: phoneSchema,
  otp: z.string().length(6, "OTP must be 6 digits"),
  device_id: z.string().min(1, "Device ID is required"),
  device_name: z.string().optional(),
  platform: z.enum(["ios", "android", "web"]),
  push_token: z.string().optional(),
  app_version: z.string().optional(),
});

export const createSocietySchema = z.object({
  name: z.string().min(2, "Society name is required"),
  slug: z.string().min(2).regex(/^[a-z0-9-]+$/, "Slug must be lowercase alphanumeric with hyphens"),
  address_line1: z.string().optional(),
  address_line2: z.string().optional(),
  city: z.string().min(1, "City is required"),
  state: z.string().min(1, "State is required"),
  pincode: z.string().min(6).max(10, "Invalid pincode"),
  country: z.string().default("IN"),
});

export const createBuildingSchema = z.object({
  name: z.string().min(1, "Building name is required"),
  code: z.string().optional(),
  total_floors: z.number().int().nonnegative().default(0),
  sort_order: z.number().int().default(0),
});

export const createUnitSchema = z.object({
  building_id: z.string().uuid("Invalid building ID"),
  floor_id: z.string().uuid("Invalid floor ID").optional(),
  unit_number: z.string().min(1, "Unit number is required"),
  unit_type: z.string().default("apartment"),
  area_sqft: z.number().positive().optional(),
});

export const createVisitorPassSchema = z.object({
  unit_id: z.string().uuid("Invalid unit ID"),
  pass_type: z.nativeEnum(VisitorPassType),
  visitor_name: z.string().min(1, "Visitor name is required"),
  visitor_phone: phoneSchema.optional(),
  visitor_company: z.string().optional(),
  purpose: z.string().optional(),
  vehicle_number: z.string().optional(),
  gate_restriction: z.string().uuid().optional(),
  valid_from: z.string().datetime("Valid ISO datetime required"),
  valid_until: z.string().datetime("Valid ISO datetime required"),
  is_recurring: z.boolean().default(false),
  notes: z.string().optional(),
});

export const gateCheckInSchema = z.object({
  pass_id: z.string().uuid().optional(),
  qr_token: z.string().optional(),
  visitor_name: z.string().optional(),
  visitor_phone: phoneSchema.optional(),
  visitor_photo_url: z.string().url().optional(),
  unit_id: z.string().uuid().optional(),
  vehicle_number: z.string().optional(),
  idempotency_key: z.string().min(1, "Idempotency key required"),
  is_offline: z.boolean().default(false),
});

export const createNoticeSchema = z.object({
  title: z.string().min(2, "Title is required"),
  body: z.string().min(5, "Body is required"),
  category: z.nativeEnum(NoticeCategory).default(NoticeCategory.GENERAL),
  priority: z.nativeEnum(NoticePriority).default(NoticePriority.NORMAL),
  target_type: z.enum(["all", "building", "floor", "unit"]).default("all"),
  target_ids: z.array(z.string().uuid()).default([]),
  expires_at: z.string().datetime().optional(),
  send_push: z.boolean().default(false),
});

export const createSOSEventSchema = z.object({
  unit_id: z.string().uuid().optional(),
  sos_type: z.nativeEnum(SOSType),
  message: z.string().optional(),
  location: z.record(z.unknown()).optional(),
});
