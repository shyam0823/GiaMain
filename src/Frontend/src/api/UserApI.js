import axios from "axios";

//Set your backend base URL here (adjust if needed)
const API_BASE_URL = "http://localhost:5000/api";

// --------------------------
//Helper: Auth headers
// --------------------------
const authHeaders = () => ({
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("token")}`,
});

// --------------------------
//Get all users
// --------------------------
export const getUsers = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/users`, {
      headers: authHeaders(),
    });
    return response.data;
  } catch (err) {
    console.error("GetUsers API error:", err);
    handleError(err);
  }
};

// --------------------------
//Get user by id (for edit page)
// --------------------------
export const getUserById = async (userId) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/users/${userId}`, {
      headers: authHeaders(),
    });
    return response.data;
  } catch (err) {
    console.error("GetUserById API error:", err);
    handleError(err);
  }
};

// --------------------------
//Create new user
// --------------------------
export const createUser = async (userData) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/users`, userData, {
      headers: authHeaders(),
    });
    return response.data;
  } catch (err) {
    console.error("CreateUser API error:", err);
    handleError(err);
  }
};

// --------------------------
//Update user
//  - Tries PUT first
//  - If server returns 405 Method Not Allowed, auto-retries with PATCH
// --------------------------
export const updateUser = async (userId, userData) => {
  try {
    const response = await axios.put(`${API_BASE_URL}/users/${userId}`, userData, {
      headers: authHeaders(),
    });
    return response.data;
  } catch (err) {
    // If backend doesn't allow PUT, try PATCH automatically
    if (err?.response?.status === 405) {
      try {
        const patchRes = await axios.patch(`${API_BASE_URL}/users/${userId}`, userData, {
          headers: authHeaders(),
        });
        return patchRes.data;
      } catch (patchErr) {
        console.error("UpdateUser (PATCH fallback) API error:", patchErr);
        handleError(patchErr);
      }
    }
    console.error("UpdateUser API error:", err);
    handleError(err);
  }
};

// --------------------------
//Delete user
// --------------------------
export const deleteUser = async (userId) => {
  try {
    const response = await axios.delete(`${API_BASE_URL}/users/${userId}`, {
      headers: authHeaders(),
    });
    return response.data;
  } catch (err) {
    console.error("DeleteUser API error:", err);
    handleError(err);
  }
};

// --------------------------
// Common Error Handler
// --------------------------
function handleError(err) {
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
