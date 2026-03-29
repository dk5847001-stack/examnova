import { DEVELOPER_MODE_UNLOCK_PRICE, PLATFORM_MODES } from "../constants/app.constants.js";

function getStoredModeAccess(user) {
  return user?.modeAccess || {};
}

export function isDeveloperUnlocked(user) {
  if (!user) {
    return false;
  }

  if (user.role === "admin") {
    return true;
  }

  const modeAccess = getStoredModeAccess(user);
  return Boolean(modeAccess.developerUnlockedAt || modeAccess.developerUnlockPaymentId);
}

export function getAvailableAccountModes(user) {
  if (!user) {
    return [PLATFORM_MODES.SIMPLE];
  }

  if (user.role === "admin") {
    return [PLATFORM_MODES.PROFESSIONAL, PLATFORM_MODES.DEVELOPER];
  }

  return isDeveloperUnlocked(user)
    ? [PLATFORM_MODES.PROFESSIONAL, PLATFORM_MODES.DEVELOPER]
    : [PLATFORM_MODES.PROFESSIONAL];
}

export function getActiveAccountMode(user) {
  if (!user) {
    return PLATFORM_MODES.SIMPLE;
  }

  if (user.role === "admin") {
    return PLATFORM_MODES.DEVELOPER;
  }

  const modeAccess = getStoredModeAccess(user);
  const availableModes = getAvailableAccountModes(user);

  if (
    modeAccess.currentMode === PLATFORM_MODES.DEVELOPER &&
    availableModes.includes(PLATFORM_MODES.DEVELOPER)
  ) {
    return PLATFORM_MODES.DEVELOPER;
  }

  return PLATFORM_MODES.PROFESSIONAL;
}

export function canAccessProfessionalFeatures(user) {
  if (!user) {
    return false;
  }

  return [PLATFORM_MODES.PROFESSIONAL, PLATFORM_MODES.DEVELOPER].includes(getActiveAccountMode(user));
}

export function canAccessDeveloperFeatures(user) {
  if (!user) {
    return false;
  }

  return getActiveAccountMode(user) === PLATFORM_MODES.DEVELOPER;
}

export function getModeAccessSnapshot(user) {
  const activeMode = getActiveAccountMode(user);
  const availableModes = getAvailableAccountModes(user);
  const developerUnlocked = isDeveloperUnlocked(user);
  const storedModeAccess = getStoredModeAccess(user);

  return {
    currentMode: activeMode,
    availableModes,
    developerUnlocked,
    developerUnlockAmountInr:
      Number(storedModeAccess.developerUnlockAmountInr) || DEVELOPER_MODE_UNLOCK_PRICE,
    developerUnlockedAt: storedModeAccess.developerUnlockedAt || null,
    developerUnlockPaymentId:
      storedModeAccess.developerUnlockPaymentId?.toString?.() ||
      storedModeAccess.developerUnlockPaymentId ||
      null,
    capabilities: {
      canBrowseMarketplace: true,
      canBuyMarketplacePdfs: true,
      canUseAiWorkflow: canAccessProfessionalFeatures(user),
      canGeneratePdfs: canAccessProfessionalFeatures(user),
      canDownloadAccountPdfs: Boolean(user),
      canSellMarketplacePdfs: canAccessDeveloperFeatures(user),
    },
  };
}

export function buildModeAccessErrorDetails(user, requiredMode) {
  const modeAccess = getModeAccessSnapshot(user);

  return {
    requiredMode,
    currentMode: modeAccess.currentMode,
    availableModes: modeAccess.availableModes,
    developerUnlocked: modeAccess.developerUnlocked,
    developerUnlockAmountInr: modeAccess.developerUnlockAmountInr,
    recommendedAction:
      requiredMode === PLATFORM_MODES.DEVELOPER && !modeAccess.developerUnlocked
        ? "unlock_developer_mode"
        : requiredMode === PLATFORM_MODES.DEVELOPER
          ? "switch_to_developer_mode"
          : "login_and_use_professional_mode",
  };
}
