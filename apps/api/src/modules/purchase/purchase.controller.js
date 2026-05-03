import { sendSuccess } from "../../utils/apiResponse.js";
import { purchaseService } from "./purchase.service.js";

export const purchaseController = {
  async listBuyerPurchases(req, res) {
    const items = await purchaseService.listBuyerPurchases(req.auth.userId);
    return sendSuccess(res, { items }, "Buyer library fetched successfully.");
  },
  async getBuyerPurchase(req, res) {
    const purchase = await purchaseService.getBuyerPurchase(req.auth.userId, req.params.id);
    return sendSuccess(res, { purchase }, "Purchased PDF detail fetched successfully.");
  },
  async downloadBuyerPurchase(req, res) {
    const file = await purchaseService.getPurchaseDownload(req.auth.userId, req.params.id);
    res.setHeader("Cache-Control", "private, no-store, max-age=0");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.type(file.contentType || "application/pdf");
    res.attachment(file.downloadName);
    return res.send(file.buffer);
  },
  async downloadGuestPurchase(req, res) {
    const rawTokenHeader = req.headers["x-guest-purchase-token"];
    const token = Array.isArray(rawTokenHeader) ? rawTokenHeader[0] || "" : rawTokenHeader || "";
    const file = await purchaseService.getGuestPurchaseDownload(req.params.id, token);
    res.setHeader("Cache-Control", "private, no-store, max-age=0");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.type(file.contentType || "application/pdf");
    res.attachment(file.downloadName);
    return res.send(file.buffer);
  },
};
