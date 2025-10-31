import axios from "axios";

const BASE_URL = "http://127.0.0.1:5000/api/home";

// -------------------- Dashboard Data --------------------

// Fetch dashboard data (patients with their assigned forms)
export async function fetchLobbyDashboard() {
  const response = await axios.get(`${BASE_URL}/data_grouped`);
  return response.data;
}

// -------------------- Forms --------------------

// Fetch list of all form templates
export async function fetchForms() {
  const response = await axios.get(`${BASE_URL}/forms`);
  return response.data;
}

// Assign multiple forms to a patient
export async function assignFormsToPatient(patientId, formIds, options = {}) {
  const payload = {
    patientId,
    formIds,
    status: options.status || "Active",
    dueDate: options.dueDate || null,
    location: options.location || "GIA HR",
  };
  const response = await axios.post(`${BASE_URL}/assign_forms`, payload);
  return response.data;
}

// Fetch details for a single form, optionally scoped to a patient
export async function fetchFormDetails(formId, patientId = null) {
  const params = {};
  if (patientId && patientId !== "null") {
    params.patientId = patientId;
  }
  const response = await axios.get(`${BASE_URL}/forms/${formId}`, { params });
  return response.data;
}

// Update a form’s responses; returns updated completion percentage
export async function updateForm(formId, payload, patientId = null) {
  const params = {};
  if (patientId && patientId !== "null") {
    params.patientId = patientId;
  }
  const response = await axios.put(`${BASE_URL}/forms/${formId}`, payload, { params });
  return response.data;
}

// -------------------- Patients --------------------

// Archive multiple patients
export async function archivePatients(patientIds = []) {
  if (!Array.isArray(patientIds) || !patientIds.length) {
    throw new Error("No patientIds provided");
  }

  const response = await axios.put(`${BASE_URL}/patients/archive`, {
    patientIds,
  });
  return response.data;
}

//Unarchive patients
export async function unarchivePatients(patientIds = []) {
  if (!Array.isArray(patientIds) || !patientIds.length) {
    throw new Error("No patientIds provided");
  }

  const response = await axios.put(`${BASE_URL}/patients/unarchive`, {
    patientIds,
  });
  return response.data;
}

// -------------------- Analytics --------------------

// Fetch analytics summary for forms
export async function fetchFormsAnalytics(params = {}) {
  try {
    const response = await axios.get(`${BASE_URL}/analytics/forms`, { params });
    return response.data;
  } catch (err) {
    console.error("fetchFormsAnalytics failed:", err);
    return {
      current: {
        Assigned: 0,
        Completed: 0,
        CompletionRate: "0%",
        Within24_Completed: 0,
        Within24_CompletionRate: "0%",
      },
      compare: null,
    };
  }
}

// Fetch analytics summary for patients
export async function fetchPatientsAnalytics(params = {}) {
  try {
    const response = await axios.get(`${BASE_URL}/analytics/patients`, { params });
    return response.data;
  } catch (err) {
    console.error("fetchPatientsAnalytics failed:", err);
    return {
      current: {
        Total: 0,
        Bulk_Import: 0,
        Integration: 0,
        Patient_Self_Scheduling: 0,
        Sent_Forms: 0,
        Staff_Created: 0,
        Staff_Scheduled_Appointments: 0,
        Static_Anonymous_Link: 0,
      },
      compare: null,
    };
  }
}
