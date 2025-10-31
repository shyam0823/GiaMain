import axios from "axios";

//Base API URL (adjust if backend changes)
const API_BASE = "http://127.0.0.1:5000/api/locations";

//Common headers
const headers = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${localStorage.getItem("token")}`,
};

//Error handler for all API calls
function handleError(err) {
  let msg = "Unknown error";
  if (err.response) {
    msg = err.response.data?.error || JSON.stringify(err.response.data);
  } else if (err.request) {
    msg = "No response from server";
  } else {
    msg = err.message;
  }
  console.error("Location API error:", msg);
  throw new Error(msg);
}

// --------------------------
//Get all locations
// --------------------------
export async function fetchLocations() {
  try {
    const res = await axios.get(API_BASE, { headers });
    return res.data;
  } catch (err) {
    handleError(err);
  }
}

// --------------------------
//Get single location by ID
// --------------------------
export async function fetchLocation(id) {
  try {
    const res = await axios.get(`${API_BASE}/${id}`, { headers });
    return res.data;
  } catch (err) {
    handleError(err);
  }
}

// --------------------------
//Create new location
// --------------------------
export async function createLocation(location) {
  try {
    const res = await axios.post(API_BASE, location, { headers });
    return res.data;
  } catch (err) {
    handleError(err);
  }
}

// --------------------------
//Update existing location
//  - Uses PUT by default
//  - Auto-fallbacks to PATCH if 405
// --------------------------
export async function updateLocation(id, location) {
  try {
    const res = await axios.put(`${API_BASE}/${id}`, location, { headers });
    return res.data;
  } catch (err) {
    if (err?.response?.status === 405) {
      try {
        const patchRes = await axios.patch(`${API_BASE}/${id}`, location, { headers });
        return patchRes.data;
      } catch (patchErr) {
        handleError(patchErr);
      }
    }
    handleError(err);
  }
}

// --------------------------
//Delete location
// --------------------------
export async function deleteLocation(id) {
  try {
    const res = await axios.delete(`${API_BASE}/${id}`, { headers });
    return res.data;
  } catch (err) {
    handleError(err);
  }
}
