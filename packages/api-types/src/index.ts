import {
  RoleCode,
  UnitMembershipType,
  GateType,
  VisitorPassType,
  VisitorStatus,
  NoticeCategory,
  NoticePriority,
  StaffType,
  VehicleType,
  SOSType,
} from "@neighbr/shared-config";

// Base API Response Format
export interface ApiResponse<T> {
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    field_errors?: Array<{ field: string; message: string }>;
  };
  request_id?: string;
}

// User & Auth
export interface User {
  id: string;
  phone: string;
  phone_verified: boolean;
  email?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
  is_active: boolean;
  is_platform_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserDevice {
  id: string;
  user_id: string;
  device_id: string;
  device_name?: string | null;
  platform: "ios" | "android" | "web";
  push_token?: string | null;
  app_version?: string | null;
  is_active: boolean;
  last_active_at?: string | null;
  created_at: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

// Society & Hierarchy
export interface Society {
  id: string;
  name: string;
  slug: string;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  country: string;
  logo_url?: string | null;
  cover_image_url?: string | null;
  total_units: number;
  is_active: boolean;
  settings?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Building {
  id: string;
  society_id: string;
  name: string;
  code?: string | null;
  total_floors: number;
  total_units: number;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface Floor {
  id: string;
  building_id: string;
  society_id: string;
  name: string;
  floor_number: number;
  sort_order: number;
  created_at: string;
}

export interface Unit {
  id: string;
  society_id: string;
  building_id: string;
  floor_id?: string | null;
  unit_number: string;
  unit_type: string;
  area_sqft?: number | null;
  is_occupied: boolean;
  is_active: boolean;
  created_at: string;
}

export interface UnitMembership {
  id: string;
  user_id: string;
  society_id: string;
  unit_id?: string | null;
  role_id: string;
  role_code: RoleCode;
  membership_type?: UnitMembershipType | null;
  is_primary: boolean;
  is_active: boolean;
  society?: Society;
  unit?: Unit;
  created_at: string;
}

// Gate & Guard
export interface Gate {
  id: string;
  society_id: string;
  name: string;
  code?: string | null;
  gate_type: GateType;
  is_active: boolean;
  is_online: boolean;
  last_heartbeat_at?: string | null;
  created_at: string;
}

export interface GuardProfile {
  id: string;
  user_id: string;
  society_id: string;
  employee_id?: string | null;
  photo_url?: string | null;
  is_active: boolean;
  user?: User;
  created_at: string;
}

// Visitors & Passes
export interface VisitorProfile {
  id: string;
  phone?: string | null;
  name: string;
  photo_url?: string | null;
  company?: string | null;
  created_at: string;
}

export interface VisitorPass {
  id: string;
  society_id: string;
  unit_id: string;
  visitor_id?: string | null;
  issued_by: string;
  pass_type: VisitorPassType;
  visitor_name: string;
  visitor_phone?: string | null;
  visitor_company?: string | null;
  purpose?: string | null;
  vehicle_number?: string | null;
  qr_token: string;
  qr_token_expires_at?: string | null;
  valid_from: string;
  valid_until: string;
  is_recurring: boolean;
  status: VisitorStatus;
  notes?: string | null;
  created_at: string;
}

export interface VisitorEvent {
  id: string;
  society_id: string;
  pass_id?: string | null;
  visitor_id?: string | null;
  unit_id?: string | null;
  gate_id?: string | null;
  guard_id?: string | null;
  event_type: VisitorStatus | string;
  visitor_name?: string | null;
  visitor_phone?: string | null;
  visitor_photo_url?: string | null;
  vehicle_number?: string | null;
  entry_method?: string | null;
  notes?: string | null;
  is_offline: boolean;
  occurred_at: string;
  created_at: string;
}

// Staff
export interface StaffProfile {
  id: string;
  society_id: string;
  name: string;
  phone?: string | null;
  photo_url?: string | null;
  staff_type: StaffType;
  is_active: boolean;
  created_at: string;
}

// Vehicle
export interface VehicleProfile {
  id: string;
  society_id: string;
  unit_id?: string | null;
  user_id?: string | null;
  registration_number: string;
  vehicle_type: VehicleType;
  make?: string | null;
  model?: string | null;
  color?: string | null;
  parking_slot?: string | null;
  sticker_id?: string | null;
  is_active: boolean;
  created_at: string;
}

// Notice & SOS
export interface Notice {
  id: string;
  society_id: string;
  title: string;
  body: string;
  category: NoticeCategory;
  priority: NoticePriority;
  image_url?: string | null;
  document_url?: string | null;
  target_type: "all" | "building" | "floor" | "unit";
  published_at?: string | null;
  expires_at?: string | null;
  created_by?: string | null;
  is_active: boolean;
  created_at: string;
}

export interface SOSEvent {
  id: string;
  society_id: string;
  triggered_by: string;
  unit_id?: string | null;
  sos_type: SOSType;
  message?: string | null;
  status: "active" | "acknowledged" | "resolved";
  created_at: string;
}

// Helpdesk
export interface HelpdeskTicket {
  id: string;
  society_id: string;
  unit_id?: string | null;
  created_by: string;
  assigned_to?: string | null;
  category: string;
  priority: "low" | "normal" | "high" | "urgent";
  title: string;
  description: string;
  status: "OPEN" | "ASSIGNED" | "IN_PROGRESS" | "RESOLVED" | "CLOSED" | "REOPENED";
  resolution_notes?: string | null;
  rating?: number | null;
  sla_due_at?: string | null;
  created_at: string;
}

// Amenities
export interface Amenity {
  id: string;
  society_id: string;
  name: string;
  code: string;
  category: string;
  description?: string | null;
  capacity_per_slot: number;
  slot_duration_minutes: number;
  open_time: string;
  close_time: string;
  is_paid: boolean;
  price_per_slot: number;
  is_active: boolean;
}

export interface AmenityBooking {
  id: string;
  society_id: string;
  amenity_id: string;
  user_id: string;
  unit_id?: string | null;
  booking_date: string;
  start_time: string;
  end_time: string;
  guest_count: number;
  status: "CONFIRMED" | "CANCELLED" | "COMPLETED";
  qr_pass: string;
  created_at: string;
}

// Billing & Invoices
export interface Invoice {
  id: string;
  society_id: string;
  unit_id: string;
  invoice_number: string;
  billing_period: string;
  due_date: string;
  subtotal: number;
  tax_amount: number;
  penalty_amount: number;
  total_amount: number;
  paid_amount: number;
  status: "UNPAID" | "PAID" | "OVERDUE" | "PARTIAL";
  line_items: Array<{ title: string; amount: number; category: string }>;
  created_at: string;
  paid_at?: string | null;
}

// Community & Polls
export interface CommunityPost {
  id: string;
  society_id: string;
  author_id: string;
  unit_id?: string | null;
  title: string;
  content: string;
  category: string;
  images: string[];
  likes_count: number;
  is_pinned: boolean;
  created_at: string;
}

export interface CommunityPoll {
  id: string;
  society_id: string;
  created_by: string;
  question: string;
  description?: string | null;
  options: string[];
  total_votes: number;
  is_active: boolean;
  created_at: string;
}

// Marketplace & Services
export interface MarketplaceListing {
  id: string;
  society_id: string;
  seller_id: string;
  unit_id?: string | null;
  title: string;
  description: string;
  category: string;
  price: number;
  is_free: boolean;
  images: string[];
  status: "ACTIVE" | "SOLD" | "RESERVED" | "REMOVED";
  created_at: string;
}

export interface VendorService {
  id: string;
  society_id: string;
  vendor_name: string;
  category: string;
  description?: string | null;
  contact_phone: string;
  is_verified: boolean;
  rating: number;
  review_count: number;
  pricing_starts_at: number;
  is_active: boolean;
}

// IoT & Automations
export interface IoTDevice {
  id: string;
  society_id: string;
  gate_id?: string | null;
  name: string;
  device_type: string;
  ip_address?: string | null;
  mac_address?: string | null;
  status: "ONLINE" | "OFFLINE" | "DEGRADED";
  firmware_version: string;
  last_heartbeat_at: string;
  created_at: string;
}

export interface AutomationRule {
  id: string;
  society_id: string;
  name: string;
  description?: string | null;
  trigger_event: string;
  conditions: Record<string, unknown>;
  action_type: string;
  action_payload: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
}

