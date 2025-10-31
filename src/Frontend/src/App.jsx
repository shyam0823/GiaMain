import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useSearch } from "./context/SearchContext";
import "./theme/typography-and-inputs.css";
import { loadSavedCustomerTheme } from "./Customer/theme"; //  customer themes
import { loadSavedTheme } from "./theme";                  //  admin themes (added)

// Layouts
import Layout from "./lobbie/layout";
import SidebarOnlyLayout from "./SidebarOnlyLayout";
import { SearchProvider } from "./context/SearchContext";
import { ExportProvider } from "./context/ExportContext";

// Dashboard Pages
import LobbieDashboard from "./lobbie/LobbieDashboard";
import AnalyticsPage from "./lobbie/AnalyticsPage";
import FormsPage from "./lobbie/forms/PatientPage";
import SignaturePage from "./lobbie/SignaturePage";
import SendForms from "./lobbie/dashboard/SendForms";
import AppointmentManager from "./lobbie/appointment/AppointmentManager";

// Settings Pages
import SettingsLayout from "./lobbie/settings/SettingsLayout";
import SettingsAccount from "./lobbie/settings/SettingsAccount";
import Automation from "./lobbie/settings/Automation";
import SettingsForms from "./lobbie/settings/SettingsForms";
import BrandingSettings from "./lobbie/settings/BrandingSettings";
import LocationSettings from "./lobbie/settings/LocationSettings";
import ThirdPartyApiSettings from "./lobbie/settings/ThirdPartyApiSettings";
import NotificationsSettings from "./lobbie/settings/NotificationsSettings";
import UsersSettings from "./lobbie/settings/UsersSettings";
import AddUserForm from "./lobbie/settings/AddUserForm";
import FormEditor from "./lobbie/settings/FormEditor";
import EditUserPage from "./lobbie/settings/EditUserPage";

// Auth pages (GIA tabbed UI with logo + theme-aware colors)
import AuthGIA from "./pages/AuthGIA";
import LogoutPage from "./pages/LogoutPage";
import HomePage from "./homepage/HomePage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";

// APIs
import { loginUser } from "./api/LoginApi";
import { registerUser } from "./api/RegisterApi";

// Patient Forms (public routes from email/SMS/QR)
import PatientForm from "./pages/PatientForm";
import PatientFormsList from "./lobbie/forms/PatientFormsList";
import FormPrintView from "./lobbie/forms/FormPrintView";

// Other Pages
import FeedbackDemo from "./lobbie/FeedbackDemo";
import TemplateCreator from "./lobbie/settings/TemplateCreator";
import CustomerAppointment from "./Customer/CustomerAppointment";
import CustomerPage from "./Customer/CustomerPage";
import CustomerLayout from "./Customer/CustomerPageLayout";
import AssignedForms from "./Customer/AssignedForms";
import CustomerSettings from "./Customer/CustomerSettings";
import MedicalHistory from "./pages/MedicalHistory.jsx";
import ProfilePage from "./pages/ProfilePage";

// Correct Uploader import
import Uploader from "./lobbie/settings/Uploader";

function App() {
  const [searchText, setSearchText] = useState("");

  //  Load the correct theme based on current app section (admin vs customer)
  useEffect(() => {
    const path = window.location.pathname || "";
    if (path.startsWith("/customer")) {
      loadSavedCustomerTheme(); // customer theme (scoped to .customer-container)
    }
    if (path.startsWith("/dash")) {
      setTimeout(() => {
        try { loadSavedTheme(); } catch {}
      }, 0);
    }
  }, []);

  return (
    <Router>
      <SearchProvider>
        <ExportProvider>
          <Routes>
            {/* Auth */}
            <Route path="/login" element={<AuthGIA onLogin={loginUser} onRegister={registerUser} />} />
            <Route path="/register" element={<AuthGIA onLogin={loginUser} onRegister={registerUser} />} />
            <Route path="/logout" element={<LogoutPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/" element={<HomePage />} />

            {/* Profile */}
            <Route path="/profile" element={<ProfilePage />} />

            {/* Customer Portal */}
            <Route path="/customer" element={<CustomerLayout />}>
              <Route index element={<CustomerPage customerId={91} />} />
              <Route path="appointment" element={<CustomerAppointment customerId={91} />} />
              <Route path="forms" element={<AssignedForms />} />
              <Route path="assigned-forms" element={<Navigate to="/customer/forms" replace />} />
              <Route path="settings" element={<CustomerSettings />} />
              <Route path="medical-history" element={<MedicalHistory />} />
              <Route path="form/:formId" element={<FormEditor />} />
            </Route>

            {/* Public patient form routes */}
            <Route path="/form/:formId" element={<PatientForm />} />
            <Route path="/form-editor/:formId" element={<FormEditor />} />
            <Route path="/forms-list" element={<PatientFormsList />} />
            <Route path="/print/forms/:formId" element={<FormPrintView />} />

            {/* Admin/Dashboard routes */}
            <Route path="/forms/:formId/edit" element={<FormEditor />} />
            <Route path="dash" element={<Layout onSearch={setSearchText} />}>
              <Route index element={<LobbieDashboard />} context={{ searchText }} />
              <Route path="dashboard" element={<AnalyticsPage />} context={{ searchText }} />
              <Route path="forms" element={<FormsPage />} />
              <Route path="signature" element={<SignaturePage />} />
              <Route path="send-forms" element={<SendForms />} />
              <Route path="appointments" element={<AppointmentManager />} />

              <Route path="settings" element={<SettingsLayout />}>
                <Route index element={<SettingsAccount />} />
                <Route path="account" element={<SettingsAccount />} />
                <Route path="automation" element={<Automation />} />
                <Route path="forms" element={<SettingsForms />} />
                <Route path="forms/:formId" element={<SettingsForms />} />
                <Route path="create-template" element={<TemplateCreator />} />
                <Route path="branding" element={<BrandingSettings />} />
                <Route path="locations" element={<LocationSettings />} />
                <Route path="integrations" element={<ThirdPartyApiSettings />} />
                <Route path="notifications" element={<NotificationsSettings />} />
                <Route path="users" element={<UsersSettings />} />
                <Route path="users/add" element={<AddUserForm />} />
                <Route path="users/:id/edit" element={<EditUserPage />} />
                  <Route path="uploader" element={<Uploader />} />
              </Route>
            </Route>

            {/* Feedback */}
            <Route path="/feedback" element={<SidebarOnlyLayout />}>
              <Route index element={<FeedbackDemo />} />
            </Route>
          </Routes>
        </ExportProvider>
      </SearchProvider>
    </Router>
  );
}

export default App;
