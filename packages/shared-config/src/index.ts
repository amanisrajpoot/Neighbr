export enum RoleCode {
  SUPER_ADMIN = "super_admin",
  SOCIETY_ADMIN = "society_admin",
  COMMITTEE = "committee",
  RESIDENT = "resident",
  GUARD = "guard",
  STAFF = "staff",
  FACILITY_MANAGER = "facility_manager",
}

export enum UnitMembershipType {
  OWNER = "owner",
  TENANT = "tenant",
  FAMILY = "family",
}

export enum GateType {
  ENTRY = "entry",
  EXIT = "exit",
  ENTRY_EXIT = "entry_exit",
}

export enum VisitorPassType {
  GUEST = "guest",
  DELIVERY = "delivery",
  CAB = "cab",
  SERVICE = "service",
  STAFF = "staff",
  RECURRING = "recurring",
}

export enum VisitorStatus {
  CREATED = "CREATED",
  INVITED = "INVITED",
  APPROVAL_PENDING = "APPROVAL_PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  ARRIVED = "ARRIVED",
  CHECKED_IN = "CHECKED_IN",
  CHECKED_OUT = "CHECKED_OUT",
  EXPIRED = "EXPIRED",
  CANCELLED = "CANCELLED",
}

export enum NoticeCategory {
  GENERAL = "general",
  MAINTENANCE = "maintenance",
  SECURITY = "security",
  EVENT = "event",
  EMERGENCY = "emergency",
}

export enum NoticePriority {
  LOW = "low",
  NORMAL = "normal",
  HIGH = "high",
  URGENT = "urgent",
}

export enum StaffType {
  MAID = "maid",
  COOK = "cook",
  DRIVER = "driver",
  PLUMBER = "plumber",
  ELECTRICIAN = "electrician",
  CLEANER = "cleaner",
  GARDENER = "gardener",
  OTHER = "other",
}

export enum VehicleType {
  CAR = "car",
  BIKE = "bike",
  SCOOTER = "scooter",
  BICYCLE = "bicycle",
  EV = "ev",
}

export enum SOSType {
  MEDICAL = "medical",
  FIRE = "fire",
  SECURITY = "security",
  OTHER = "other",
}

export const API_CONSTANTS = {
  VERSION_PREFIX: "/api/v1",
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  OTP_LENGTH: 6,
  OTP_EXPIRY_SECONDS: 300,
};
