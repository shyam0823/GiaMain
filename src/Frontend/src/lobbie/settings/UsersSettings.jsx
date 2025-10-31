import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./UsersSettings.css";
import { getUsers } from "../../api/UserApI";
import { useSearch } from "../../context/SearchContext";

function UsersSettings() {
  const { searchQuery } = useSearch();
  const [activeTab, setActiveTab] = useState("active");
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const buildDisplayName = (u) => {
    const first = (u.first_name || "").trim();
    const last = (u.last_name || "").trim();
    const joined = `${first} ${last}`.trim();
    return joined || u.name || "—";
  };

  const normalizeLocations = (locations) => {
    if (!locations) return [];
    if (Array.isArray(locations)) {
      return locations
        .map((loc) =>
          typeof loc === "object"
            ? loc.name || loc.location_name || loc.title || ""
            : loc
        )
        .filter(Boolean);
    }
    return [locations];
  };

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data = await getUsers();
        const formatted = (data || []).map((u) => ({
          ...u,
          display_name: buildDisplayName(u),
          locations: normalizeLocations(u.locations),
        }));

        const sorted = formatted.sort((a, b) => {
          if (a.created_on && b.created_on) {
            return new Date(b.created_on) - new Date(a.created_on);
          }
          return (b.id || 0) - (a.id || 0);
        });

        setUsers(sorted);
      } catch (err) {
        alert("❌ Failed to fetch users: " + (err?.message || err));
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  useEffect(() => {
    if (location.state?.newUser) {
      const u = location.state.newUser;
      const normalized = {
        ...u,
        display_name: buildDisplayName(u),
        locations: normalizeLocations(u.locations),
      };
      setUsers((prev) => [normalized, ...prev]);
    }
  }, [location.state]);

  const handleAddUser = () => {
    navigate("/dash/settings/users/add");
  };

  const filteredUsers = users
    .filter((u) => (activeTab === "active" ? u.is_active : !u.is_active))
    .filter((u) =>
      [u.display_name, u.email, u.role_group]
        .join(" ")
        .toLowerCase()
        .includes((searchQuery || "").toLowerCase())
    );

  return (
    <section className="users-page">
      <div className="panel users-panel us-card">
        <div className="users-header">
          <h2>Users</h2>
          <button className="add-user-btn" onClick={handleAddUser}>
            + Add New User
          </button>
        </div>

        <div className="users-filters">
          <label className="radio-label">
            <input
              type="radio"
              checked={activeTab === "active"}
              onChange={() => setActiveTab("active")}
            />
            <span className="custom-radio"></span> Active
          </label>
          <label className="radio-label">
            <input
              type="radio"
              checked={activeTab === "inactive"}
              onChange={() => setActiveTab("inactive")}
            />
            <span className="custom-radio"></span> Inactive
          </label>
        </div>

        {loading ? (
          <p>Loading users...</p>
        ) : (
          <table className="users-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Last Login</th>
                <th>Active?</th>
                <th>Roles</th>
                <th>Locations</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td>{user.display_name}</td>
                  <td>{user.email}</td>
                  <td>{user.last_login || "Never"}</td>
                  <td>{user.is_active ? <span className="tick">✓</span> : "—"}</td>
                  <td>{user.role_group || "—"}</td>
                  <td>{user.locations?.length ? user.locations.join(", ") : "—"}</td>
                  <td>
                    <button
                      className="edit-link"
                      onClick={() => navigate(`/dash/settings/users/${user.id}/edit`)}
                    >
                      edit user
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}

export default UsersSettings;
