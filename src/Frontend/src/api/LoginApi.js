import axios from "axios";

export const loginUser = async (email, password) => {
  try {
    const response = await axios.post("http://127.0.0.1:5000/api/login", {
      email,    // use email, not username
      password,
    });
    return response.data;
  } catch (err) {
    console.error(err);
    return {
      success: false,
      message: err.response?.data?.message || "Login failed",
    };
  }
};
