import axios from "axios";

export const registerUser = async (formData) => {
  try {
    const response = await axios.post("http://127.0.0.1:5000/api/register", formData, {
      headers: { "Content-Type": "application/json" },
    });

    // Example assumes backend returns JSON with a 'success' boolean field
    if (response.data && response.data.success === true) {
      return {
        success: true,
        message: response.data.message || "User registered successfully!",
        user: response.data.user || null,
      };
    } else {
      return {
        success: false,
        message: response.data.message || "Registration failed due to server error.",
      };
    }
  } catch (error) {
    // You can also extract server-provided error message if available
    const message =
      (error.response && error.response.data && error.response.data.message) ||
      "Registration failed due to network or server error.";
    return {
      success: false,
      message,
    };
  }
};

