import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import PublicLayout from './pages/public/PublicLayout';
import Home from './pages/public/Home';
import GroupsPage from './pages/public/GroupsPage';
import TherapyPage from './pages/public/TherapyPage';
import AssessmentsPage from './pages/public/AssessmentsPage';
import GuidesPage from './pages/public/GuidesPage';
import ResourcesPage from './pages/public/ResourcesPage';
import CommunityPage from './pages/public/CommunityPage';
import PartnersPage from './pages/public/PartnersPage';
import BookPage from './pages/public/BookPage';
import Login from './pages/auth/Login';
import DashboardLayout from './pages/dashboard/DashboardLayout';
import Overview from './pages/dashboard/Overview';
import WebsiteBookings from './pages/dashboard/WebsiteBookings';
import Appointments from './pages/dashboard/Appointments';
import Patients from './pages/dashboard/Patients';
import Client360 from './pages/dashboard/clients/Client360';
import VideoVisits from './pages/dashboard/VideoVisits';
import Billing from './pages/dashboard/Billing';
import Reports from './pages/dashboard/Reports';
import Settings from './pages/dashboard/Settings';
import ClinicalNotes from './pages/dashboard/ClinicalNotes';
import ClinicalAssessments from './pages/dashboard/ClinicalAssessments';
import TreatmentPlans from './pages/dashboard/TreatmentPlans';
import FormsDocuments from './pages/dashboard/FormsDocuments';
import Communication from './pages/dashboard/Communication';
import PortalLayout from './pages/portal/PortalLayout';
import PortalHome from './pages/portal/PortalHome';
import PortalTracking from './pages/portal/PortalTracking';
import PortalAssessments from './pages/portal/PortalAssessments';
import PortalPrescriptions from './pages/portal/PortalPrescriptions';
import PortalDocuments from './pages/portal/PortalDocuments';
import PortalBilling from './pages/portal/PortalBilling';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/groups" element={<GroupsPage />} />
            <Route path="/therapy" element={<TherapyPage />} />
            <Route path="/assessments" element={<AssessmentsPage />} />
            <Route path="/assessments/:id" element={<AssessmentsPage />} />
            <Route path="/guides" element={<GuidesPage />} />
            <Route path="/guides/:slug" element={<GuidesPage />} />
            <Route path="/resources" element={<ResourcesPage />} />
            <Route path="/community" element={<CommunityPage />} />
            <Route path="/partners" element={<PartnersPage />} />
            <Route path="/book" element={<BookPage />} />
          </Route>

          <Route path="/dashboard/login" element={<Login />} />
          <Route path="/dashboard/portal" element={<PortalLayout />}>
            <Route index element={<PortalHome />} />
            <Route path="tracking" element={<PortalTracking />} />
            <Route path="assessments" element={<PortalAssessments />} />
            <Route path="prescriptions" element={<PortalPrescriptions />} />
            <Route path="documents" element={<PortalDocuments />} />
            <Route path="billing" element={<PortalBilling />} />
          </Route>
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<Overview />} />
            <Route path="schedule" element={<Navigate to="/dashboard/appointments" replace />} />
            <Route path="appointments" element={<Appointments />} />
            <Route path="bookings" element={<WebsiteBookings />} />
            <Route path="patients" element={<Patients />} />
            <Route path="patients/:clientId" element={<Client360 />} />
            <Route path="clinical/notes" element={<ClinicalNotes />} />
            <Route path="clinical/assessments" element={<ClinicalAssessments />} />
            <Route path="clinical/plans" element={<TreatmentPlans />} />
            <Route path="clinical/forms" element={<FormsDocuments />} />
            <Route path="communication" element={<Communication />} />
            <Route path="video" element={<VideoVisits />} />
            <Route path="billing" element={<Billing />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={<Settings />} />
          </Route>

          <Route path="/login" element={<Navigate to="/dashboard/login" replace />} />
          <Route path="/portal" element={<Navigate to="/dashboard/portal" replace />} />
          <Route path="/app/*" element={<Navigate to="/dashboard" replace />} />
          <Route path="/app" element={<Navigate to="/dashboard" replace />} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
