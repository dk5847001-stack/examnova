import { sendSuccess } from "../../utils/apiResponse.js";
import { ApiError } from "../../utils/ApiError.js";
import { createStorageClient } from "../../lib/index.js";
import { adminContentService } from "../admin-content/adminContent.service.js";
import { publicUpdatesService } from "./publicUpdates.service.js";

const storageClient = createStorageClient();

export const publicController = {
  async getMedia(req, res) {
    const storageKey = String(req.query?.key || "").trim();
    if (!storageKey) {
      throw new ApiError(400, "Media key is required.");
    }
    if (storageKey.length > 300) {
      throw new ApiError(400, "Media key is too long.");
    }

    try {
      const file = await storageClient.read({ storageKey });
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.type(file.contentType || "application/octet-stream");
      return res.send(file.buffer);
    } catch {
      throw new ApiError(404, "Media file not found.");
    }
  },
  getUniversityLanding(_req, res) {
    return sendSuccess(res, { items: [] }, "Public university landing stub is wired.");
  },
  getSubjectLanding(_req, res) {
    return sendSuccess(res, { items: [] }, "Public subject landing stub is wired.");
  },
  async listUpcomingLockedPdfs(req, res) {
    const items = await adminContentService.listUpcomingItems({ ...req.query, mode: "public" }, req);
    return sendSuccess(res, { items }, "Upcoming locked PDFs fetched successfully.");
  },
  async getUpcomingLockedPdfDetail(req, res) {
    const item = await adminContentService.getUpcomingDetail(req.params.slug, req);
    return sendSuccess(res, { item }, "Upcoming locked PDF detail fetched successfully.");
  },
  async listPlatformUpdates(_req, res) {
    const items = await publicUpdatesService.listPlatformUpdates();
    return sendSuccess(res, { items }, "Platform updates fetched successfully.");
  },
};
