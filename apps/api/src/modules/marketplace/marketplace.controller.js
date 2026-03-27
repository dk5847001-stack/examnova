import { sendSuccess } from "../../utils/apiResponse.js";
import { marketplaceService } from "./marketplace.service.js";

export const marketplaceController = {
  async getPublicListings(req, res) {
    const payload = await marketplaceService.getPublicListings(req.query, req);
    return sendSuccess(res, payload, "Public marketplace listings fetched successfully.");
  },
  async getListingDetail(req, res) {
    const payload = await marketplaceService.getPublicListingDetail(req.params.slug, req);
    return sendSuccess(res, payload, "Marketplace listing detail fetched successfully.");
  },
  async createListing(req, res) {
    const listing = await marketplaceService.createListing(
      req.auth.userId,
      req.body,
      req,
      req.files?.coverImage?.[0] || null,
    );
    return sendSuccess(res, { listing }, "Marketplace listing created successfully.", 201);
  },
  async getMyListings(req, res) {
    const items = await marketplaceService.listMyListings(req.auth.userId, req);
    return sendSuccess(res, { items }, "Seller marketplace listings fetched successfully.");
  },
  async updateListing(req, res) {
    const listing = await marketplaceService.updateListing(
      req.auth.userId,
      req.params.id,
      req.body,
      req,
      req.files?.coverImage?.[0] || null,
    );
    return sendSuccess(res, { listing }, "Marketplace listing updated successfully.");
  },
  async getEligibleGeneratedPdfs(req, res) {
    const items = await marketplaceService.listEligibleGeneratedPdfs(req.auth.userId);
    return sendSuccess(res, { items }, "Eligible generated PDFs fetched successfully.");
  },
};
