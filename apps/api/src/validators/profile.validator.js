import { ApiError } from "../utils/ApiError.js";
import { normalizeOptionalString, ensureRequiredString } from "./common.js";
import { normalizeAcademicProfile } from "../utils/academicTaxonomy.js";

export function validateProfileUpdate(req, _res, next) {
  try {
    const phone = normalizeOptionalString(req.body?.phone, { maxLength: 30, collapseWhitespace: false });
    if (phone && !/^[0-9+\-() ]{7,20}$/.test(phone)) {
      throw new ApiError(422, "phone must be a valid contact number.");
    }

    const avatarUrl = normalizeOptionalString(req.body?.avatarUrl, { maxLength: 400 });
    if (avatarUrl && !/^https?:\/\//i.test(avatarUrl)) {
      throw new ApiError(422, "avatarUrl must be a valid http or https URL.");
    }

    const academicProfile = normalizeAcademicProfile(req.body || {});

    req.body = {
      name: ensureRequiredString(req.body?.name, "name", { maxLength: 80 }),
      phone,
      avatarUrl,
      bio: normalizeOptionalString(req.body?.bio, { maxLength: 500, collapseWhitespace: false }),
      university: academicProfile.university,
      branch: academicProfile.branch,
      year: academicProfile.year,
      semester: academicProfile.semester,
    };

    return next();
  } catch (error) {
    return next(error);
  }
}
