import { sendSuccess } from "../../utils/apiResponse.js";
import { adminContentService } from "./adminContent.service.js";

export const adminContentController = {
  async listAdminUploads(req, res) {
    const items = await adminContentService.listAdminUploads(req);
    return sendSuccess(res, { items }, "Admin uploaded PDFs fetched successfully.");
  },
  async createAdminUpload(req, res) {
    const item = await adminContentService.createAdminUpload({
      actor: req.user,
      payload: req.body,
      file: req.files?.pdf?.[0] || null,
      coverImageFile: req.files?.coverImage?.[0] || null,
      req,
    });
    return sendSuccess(res, { item }, "Admin PDF uploaded successfully.", 201);
  },
  async updateAdminUpload(req, res) {
    const item = await adminContentService.updateAdminUpload(
      req.params.id,
      req.user,
      req.body,
      req,
      req.files?.pdf?.[0] || null,
      req.files?.coverImage?.[0] || null,
    );
    return sendSuccess(res, { item }, "Admin uploaded PDF updated successfully.");
  },
  async deleteAdminUpload(req, res) {
    const item = await adminContentService.deleteAdminUpload(req.params.id, req.user, req);
    return sendSuccess(res, { item }, "Admin uploaded PDF deleted successfully.");
  },
  async listUpcomingItems(req, res) {
    const items = await adminContentService.listUpcomingItems(req.query, req);
    return sendSuccess(res, { items }, "Upcoming locked PDFs fetched successfully.");
  },
  async createUpcomingItem(req, res) {
    const item = await adminContentService.createUpcomingItem(req.user, req.body, req);
    return sendSuccess(res, { item }, "Upcoming locked PDF created successfully.", 201);
  },
  async updateUpcomingItem(req, res) {
    const item = await adminContentService.updateUpcomingItem(req.params.id, req.user, req.body, req);
    return sendSuccess(res, { item }, "Upcoming locked PDF updated successfully.");
  },
  async updateUpcomingStatus(req, res) {
    const item = await adminContentService.updateUpcomingStatus(req.params.id, req.user, req.body.action, req);
    return sendSuccess(res, { item }, "Upcoming locked PDF status updated successfully.");
  },
  async getUpcomingDetail(req, res) {
    const item = await adminContentService.getUpcomingDetail(req.params.slug, req);
    return sendSuccess(res, { item }, "Upcoming locked PDF detail fetched successfully.");
  },
};
