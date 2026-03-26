import { Navigate, Route, Routes } from "react-router-dom";
import { PublicLayout } from "../components/layout/PublicLayout.jsx";
import { AuthLayout } from "../components/layout/AuthLayout.jsx";
import { DashboardLayout } from "../components/layout/DashboardLayout.jsx";
import { AdminLayout } from "../components/layout/AdminLayout.jsx";
import { MarketplacePage } from "../pages/public/MarketplacePage.jsx";
import { PdfDetailPage } from "../pages/public/PdfDetailPage.jsx";
import { LoginPage } from "../pages/auth/LoginPage.jsx";
import { SignupPage } from "../pages/auth/SignupPage.jsx";
import { VerifyOtpPage } from "../pages/auth/VerifyOtpPage.jsx";
import { ForgotPasswordPage } from "../pages/auth/ForgotPasswordPage.jsx";
import { ResetPasswordPage } from "../pages/auth/ResetPasswordPage.jsx";
import { UserDashboardPage } from "../pages/app/UserDashboardPage.jsx";
import { UploadGeneratePage } from "../pages/app/UploadGeneratePage.jsx";
import { DocumentDetailPage } from "../pages/app/DocumentDetailPage.jsx";
import { QuestionDetectionPage } from "../pages/app/QuestionDetectionPage.jsx";
import { ProfilePage } from "../pages/app/ProfilePage.jsx";
import { WalletPage } from "../pages/app/WalletPage.jsx";
import { AccountSettingsPage } from "../pages/app/AccountSettingsPage.jsx";
import { AnswerGenerationPage } from "../pages/app/AnswerGenerationPage.jsx";
import { PurchasedPdfsPage } from "../pages/app/PurchasedPdfsPage.jsx";
import { GeneratedPdfsPage } from "../pages/app/GeneratedPdfsPage.jsx";
import { GeneratedAnswerDetailPage } from "../pages/app/GeneratedAnswerDetailPage.jsx";
import { ListedPdfsPage } from "../pages/app/ListedPdfsPage.jsx";
import { WithdrawalRequestsPage } from "../pages/app/WithdrawalRequestsPage.jsx";
import { PaymentHistoryPage } from "../pages/app/PaymentHistoryPage.jsx";
import { NotificationsPage } from "../pages/app/NotificationsPage.jsx";
import { AdminDashboardPage } from "../pages/admin/AdminDashboardPage.jsx";
import { AdminAnalyticsPage } from "../pages/admin/AdminAnalyticsPage.jsx";
import { AdminUploadsPage } from "../pages/admin/AdminUploadsPage.jsx";
import { AdminUpcomingPdfsPage } from "../pages/admin/AdminUpcomingPdfsPage.jsx";
import { AdminUsersPage } from "../pages/admin/AdminUsersPage.jsx";
import { AdminListingsPage } from "../pages/admin/AdminListingsPage.jsx";
import { AdminCommercePage } from "../pages/admin/AdminCommercePage.jsx";
import { AdminWithdrawalsPage } from "../pages/admin/AdminWithdrawalsPage.jsx";
import { AdminModerationPage } from "../pages/admin/AdminModerationPage.jsx";
import { AdminNotificationsPage } from "../pages/admin/AdminNotificationsPage.jsx";
import { AdminAuditLogsPage } from "../pages/admin/AdminAuditLogsPage.jsx";
import { AdminProfilePage } from "../pages/admin/AdminProfilePage.jsx";
import { AdminSettingsPage } from "../pages/admin/AdminSettingsPage.jsx";
import { NotFoundPage } from "../pages/shared/NotFoundPage.jsx";
import { ProtectedRoute } from "../guards/ProtectedRoute.jsx";
import { AdminRoute } from "../guards/AdminRoute.jsx";
import { PublicOnlyRoute } from "../guards/PublicOnlyRoute.jsx";
import { ModeRoute } from "../guards/ModeRoute.jsx";
import { PLATFORM_MODES } from "../utils/modes.js";

export function AppRouter() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<Navigate to="/marketplace" replace />} />
        <Route path="/marketplace" element={<MarketplacePage />} />
        <Route path="/pdf/:slug" element={<PdfDetailPage />} />
        <Route path="/upcoming" element={<Navigate to="/marketplace" replace />} />
        <Route path="/upcoming/:slug" element={<Navigate to="/marketplace" replace />} />
        <Route path="/university/:slug" element={<Navigate to="/marketplace" replace />} />
        <Route path="/branch/:slug" element={<Navigate to="/marketplace" replace />} />
        <Route path="/semester/:slug" element={<Navigate to="/marketplace" replace />} />
        <Route path="/subject/:slug" element={<Navigate to="/marketplace" replace />} />
        <Route path="/exam-preparation/:slug" element={<Navigate to="/marketplace" replace />} />
        <Route path="/important-questions/:slug" element={<Navigate to="/marketplace" replace />} />
        <Route path="/faq" element={<Navigate to="/marketplace" replace />} />
        <Route path="/resources" element={<Navigate to="/marketplace" replace />} />
      </Route>

      <Route element={<AuthLayout />}>
        <Route path="/login" element={<PublicOnlyRoute><LoginPage /></PublicOnlyRoute>} />
        <Route path="/signup" element={<PublicOnlyRoute><SignupPage /></PublicOnlyRoute>} />
        <Route path="/verify-otp" element={<PublicOnlyRoute><VerifyOtpPage /></PublicOnlyRoute>} />
        <Route path="/forgot-password" element={<PublicOnlyRoute><ForgotPasswordPage /></PublicOnlyRoute>} />
        <Route path="/reset-password" element={<PublicOnlyRoute><ResetPasswordPage /></PublicOnlyRoute>} />
      </Route>

      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <DashboardLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/marketplace" replace />} />
        <Route path="dashboard" element={<UserDashboardPage />} />
        <Route path="upload-generate" element={<ModeRoute requiredMode={PLATFORM_MODES.PROFESSIONAL}><UploadGeneratePage /></ModeRoute>} />
        <Route path="documents/:id" element={<ModeRoute requiredMode={PLATFORM_MODES.PROFESSIONAL}><DocumentDetailPage /></ModeRoute>} />
        <Route path="documents/:id/questions" element={<ModeRoute requiredMode={PLATFORM_MODES.PROFESSIONAL}><QuestionDetectionPage /></ModeRoute>} />
        <Route path="documents/:id/answers" element={<ModeRoute requiredMode={PLATFORM_MODES.PROFESSIONAL}><AnswerGenerationPage /></ModeRoute>} />
        <Route path="generated-pdfs" element={<ModeRoute requiredMode={PLATFORM_MODES.PROFESSIONAL}><GeneratedPdfsPage /></ModeRoute>} />
        <Route path="generated-pdfs/:id" element={<ModeRoute requiredMode={PLATFORM_MODES.PROFESSIONAL}><GeneratedAnswerDetailPage /></ModeRoute>} />
        <Route path="purchased-pdfs" element={<PurchasedPdfsPage />} />
        <Route path="listed-pdfs" element={<ModeRoute requiredMode={PLATFORM_MODES.DEVELOPER}><ListedPdfsPage /></ModeRoute>} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="wallet" element={<ModeRoute requiredMode={PLATFORM_MODES.DEVELOPER}><WalletPage /></ModeRoute>} />
        <Route path="withdrawals" element={<ModeRoute requiredMode={PLATFORM_MODES.DEVELOPER}><WithdrawalRequestsPage /></ModeRoute>} />
        <Route path="payments" element={<PaymentHistoryPage />} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="settings" element={<AccountSettingsPage />} />
      </Route>

      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminLayout />
          </AdminRoute>
        }
      >
        <Route index element={<Navigate to="/admin/profile" replace />} />
        <Route path="dashboard" element={<AdminDashboardPage />} />
        <Route path="analytics" element={<AdminAnalyticsPage />} />
        <Route path="moderation" element={<AdminModerationPage />} />
        <Route path="alerts" element={<AdminNotificationsPage />} />
        <Route path="audit-logs" element={<AdminAuditLogsPage />} />
        <Route path="uploads" element={<AdminUploadsPage />} />
        <Route path="upcoming" element={<AdminUpcomingPdfsPage />} />
        <Route path="users" element={<AdminUsersPage />} />
        <Route path="listings" element={<AdminListingsPage />} />
        <Route path="commerce" element={<AdminCommercePage />} />
        <Route path="withdrawals" element={<AdminWithdrawalsPage />} />
        <Route path="profile" element={<AdminProfilePage />} />
        <Route path="settings" element={<AdminSettingsPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
