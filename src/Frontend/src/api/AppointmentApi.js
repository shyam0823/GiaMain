import axios from "axios";

const BASE_URL = "http://127.0.0.1:5000/api";

//Add new appointment
export const addAppointmentApi = async (appointmentData) => {
  try {
    const response = await axios.post(`${BASE_URL}/book_appointment`, appointmentData);
    return response.data;
  } catch (error) {
    throw error;
  }
};

//Fetch all appointments
export const getAppointmentsApi = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/appointment`);
    return response.data;
  } catch (error) {
    throw error;
  }
};

//Cancel appointment (DELETE)
export const cancelAppointmentApi = async (id) => {
  try {
    const response = await axios.delete(`${BASE_URL}/appointment/${id}`);
    return response.data; // { ok: true, deleted: id }
  } catch (error) {
    throw error;
  }
};

//Postpone appointment (PUT)
export const postponeAppointmentApi = async (id, payload) => {
  try {
    const response = await axios.put(`${BASE_URL}/appointment/${id}/postpone`, payload);
    return response.data;
  } catch (error) {
    throw error;
  }
};
