import axios from "axios";

const API_BASE = "http://localhost:5000/api/patients";

// ---------------------------
// GET all patients
// ---------------------------
export async function fetchPatients() {
  try {
    const response = await axios.get(API_BASE);
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error;
  }
}

// ---------------------------
// CREATE patient
// ---------------------------
export async function createPatient(patientData) {
  try {
    const response = await axios.post(API_BASE, patientData);
    return response.data; // full patient object
  } catch (error) {
    throw error.response ? error.response.data : error;
  }
}

// ---------------------------
// UPDATE patient
// ---------------------------
export async function updatePatient(patientId, patientData) {
  try {
    const response = await axios.put(`${API_BASE}/${patientId}`, patientData);
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error;
  }
}

// ---------------------------
// GET single patient
// ---------------------------
export async function fetchPatientById(patientId) {
  try {
    const response = await axios.get(`${API_BASE}/${patientId}`);
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error;
  }
}

// ---------------------------
// DELETE patient
// ---------------------------
export async function deletePatient(patientId) {
  try {
    const response = await axios.delete(`${API_BASE}/${patientId}`);
    return response.data;
  } catch (error) {
    throw error.response ? error.response.data : error;
  }
}

// ---------------------------
// SEND SMS with assigned forms
// ---------------------------
export async function sendSmsToPatient(patientId, forms) {
  try {
    const response = await axios.post(`${API_BASE}/send_sms`, {
      patientId,
      forms,
    });
    return response.data; // { message: "...success..." }
  } catch (error) {
    throw error.response ? error.response.data : error;
  }
}
