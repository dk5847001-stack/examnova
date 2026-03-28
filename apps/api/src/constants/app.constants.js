export const APP_NAME = "ExamNova AI";
export const API_PREFIX = "/api/v1";
export const API_VERSION = "v1";
export const USER_ROLES = {
  STUDENT: "student",
  SELLER: "seller",
  ADMIN: "admin",
};

export const PLATFORM_MODES = {
  SIMPLE: "simple",
  PROFESSIONAL: "professional",
  DEVELOPER: "developer",
};

export const USER_STATUS = {
  ACTIVE: "active",
  PENDING_VERIFICATION: "pending_verification",
  BLOCKED: "blocked",
  SUSPENDED: "suspended",
};

export const PURCHASE_TYPES = {
  PRIVATE_PDF: "private_pdf",
  MARKETPLACE: "marketplace",
};

export const PAYMENT_PURPOSES = {
  PRIVATE_PDF: "private_pdf",
  MARKETPLACE: "marketplace",
  DEVELOPER_MODE_UNLOCK: "developer_mode_unlock",
};

export const PAYMENT_CONTEXT_TYPES = {
  PRIVATE_PDF: "private_pdf",
  MARKETPLACE: "marketplace",
  ACCOUNT_MODE: "account_mode",
};

export const DEVELOPER_MODE_UNLOCK_PRICE = 10;

export const MARKETPLACE_SPLIT = {
  ADMIN_PERCENT: 30,
  SELLER_PERCENT: 70,
};

export const MARKETPLACE_COVER_SEALS = ["new", "premium", "popular", "updated"];
export const MARKETPLACE_LISTING_CATEGORIES = ["semester_exam", "cia_exam"];
export const MARKETPLACE_LISTING_CATEGORY_LIMIT = 5;

export const PAYMENT_STATUS = {
  PENDING: "pending",
  PAID: "paid",
  FAILED: "failed",
  REFUNDED: "refunded",
};

export const LISTING_VISIBILITY = {
  DRAFT: "draft",
  PUBLISHED: "published",
  LOCKED_UPCOMING: "locked_upcoming",
  ARCHIVED: "archived",
};
