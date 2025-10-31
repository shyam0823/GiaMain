import axios from "axios";

const API_BASE_URL = "http://localhost:5000/api"; // adjust if backend runs elsewhere

// Create new user
export const createUser = async (userData) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/users`, userData, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    return response.data;
  } catch (err) {
    console.error("CreateUser API error:", err);

    let msg = "Unknown error";
    if (err.response) {
      msg = err.response.data?.error || JSON.stringify(err.response.data);
    } else if (err.request) {
      msg = "No response from server";
    } else {
      msg = err.message;
    }
    throw new Error(msg);
  }
};
