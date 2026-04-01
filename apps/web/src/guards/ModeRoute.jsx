import { ModeGateCard } from "../components/ui/ModeGateCard.jsx";
import { useAuth } from "../hooks/useAuth.js";
import {
  hasDeveloperAccess,
  hasProfessionalAccess,
  normalizeModeAccess,
  PLATFORM_MODES,
} from "../utils/modes.js";

export function ModeRoute({ children, requiredMode = PLATFORM_MODES.PROFESSIONAL }) {
  const { status, user, role } = useAuth();

  if (status === "loading") {
    return <div className="route-loader">Checking account mode...</div>;
  }

  if (role === "admin") {
    return children;
  }

  const modeAccess = normalizeModeAccess(user);
  const hasAccess =
    requiredMode === PLATFORM_MODES.DEVELOPER
      ? hasDeveloperAccess(modeAccess)
      : hasProfessionalAccess(modeAccess);

  if (hasAccess) {
    return children;
  }

  return <ModeGateCard modeAccess={modeAccess} requiredMode={requiredMode} />;
}
