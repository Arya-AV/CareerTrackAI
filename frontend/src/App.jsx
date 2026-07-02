import { Navigate, Route, Routes } from "react-router-dom";
import { LoginPage } from "./routes/LoginPage.jsx";
import { SignupPage } from "./routes/SignupPage.jsx";
import { ForgotPasswordPage } from "./routes/ForgotPasswordPage.jsx";
import { ResetPasswordPage } from "./routes/ResetPasswordPage.jsx";
import { DashboardPage } from "./routes/DashboardPage.jsx";
import { ApplicationsPage } from "./routes/ApplicationsPage.jsx";
import { ApplicationFormPage } from "./routes/ApplicationFormPage.jsx";
import { ApplicationDetailPage } from "./routes/ApplicationDetailPage.jsx";
import { JDAnalyzerPage } from "./routes/JDAnalyzerPage.jsx";
import { ResumeMatchPage } from "./routes/ResumeMatchPage.jsx";
import { RemindersPage } from "./routes/RemindersPage.jsx";
import { NotesPage } from "./routes/NotesPage.jsx";
import { ContactsPage } from "./routes/ContactsPage.jsx";
import { ContactDetailPage } from "./routes/ContactDetailPage.jsx";
import { InterviewRoundDetailPage } from "./routes/InterviewRoundDetailPage.jsx";
import { ResumeVersionsPage } from "./routes/ResumeVersionsPage.jsx";
import { CompaniesPage } from "./routes/CompaniesPage.jsx";
import { CompanyDetailPage } from "./routes/CompanyDetailPage.jsx";
import { SkillGapsPage } from "./routes/SkillGapsPage.jsx";
import { CoachPage } from "./routes/CoachPage.jsx";
import { ToApplyPage } from "./routes/ToApplyPage.jsx";
import { ChannelPostingsPage } from "./routes/ChannelPostingsPage.jsx";
import { ProtectedRoute } from "./auth/ProtectedRoute.jsx";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/app/dashboard" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
      <Route
        path="/app/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/applications"
        element={
          <ProtectedRoute>
            <ApplicationsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/to-apply"
        element={
          <ProtectedRoute>
            <ToApplyPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/channel-postings"
        element={
          <ProtectedRoute>
            <ChannelPostingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/applications/new"
        element={
          <ProtectedRoute>
            <ApplicationFormPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/applications/:id"
        element={
          <ProtectedRoute>
            <ApplicationDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/coach"
        element={
          <ProtectedRoute>
            <CoachPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/skill-gaps"
        element={
          <ProtectedRoute>
            <SkillGapsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/companies"
        element={
          <ProtectedRoute>
            <CompaniesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/companies/:name"
        element={
          <ProtectedRoute>
            <CompanyDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/resume-versions"
        element={
          <ProtectedRoute>
            <ResumeVersionsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/ai/jd-analyzer"
        element={
          <ProtectedRoute>
            <JDAnalyzerPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/ai/resume-match"
        element={
          <ProtectedRoute>
            <ResumeMatchPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/interviews/:interviewRoundId/replay"
        element={
          <ProtectedRoute>
            <InterviewRoundDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/contacts"
        element={
          <ProtectedRoute>
            <ContactsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/contacts/:id"
        element={
          <ProtectedRoute>
            <ContactDetailPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/notes"
        element={
          <ProtectedRoute>
            <NotesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/app/reminders"
        element={
          <ProtectedRoute>
            <RemindersPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
