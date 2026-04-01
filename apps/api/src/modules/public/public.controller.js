import { sendSuccess } from "../../utils/apiResponse.js";
import { ApiError } from "../../utils/ApiError.js";
import { createStorageClient } from "../../lib/index.js";
import { adminContentService } from "../admin-content/adminContent.service.js";

const storageClient = createStorageClient();

export const publicController = {
  async getMedia(req, res) {
    const storageKey = String(req.query?.key || "").trim();
    if (!storageKey) {
      throw new ApiError(400, "Media key is required.");
    }

    let absolutePath = "";
    try {
      absolutePath = await storageClient.resolveExisting(storageKey);
    } catch {
      throw new ApiError(404, "Media file not found.");
    }

    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    res.setHeader("X-Content-Type-Options", "nosniff");
    return res.sendFile(absolutePath);
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
};
