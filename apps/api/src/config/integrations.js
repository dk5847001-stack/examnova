import { env } from "./env.js";

export const integrationConfig = {
  ai: {
    provider: env.aiProvider,
    model: env.aiModel,
    enabled: Boolean(env.aiApiKey),
  },
  email: {
    provider: "brevo",
    enabled: Boolean(env.brevoApiKey && env.brevoSenderEmail),
  },
  payments: {
    provider: "razorpay",
    enabled: Boolean(env.razorpayKeyId && env.razorpayKeySecret),
  },
  storage: {
    provider: env.fileStorageDisk,
    cloudinaryEnabled: Boolean(env.cloudinaryCloudName && env.cloudinaryApiKey && env.cloudinaryApiSecret),
    bucket: env.fileStorageBucket,
  },
};
