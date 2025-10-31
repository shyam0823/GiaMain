import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./EditUserPage.css";
import { getUsers, updateUser } from "../../api/UserApI";
import { fetchLocations } from "../../api/LocationAPi";

function EditUserPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // form fields
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [locationId, setLocationId] = useState("");

  // validation
  const [errors, setErrors] = useState({});

  // locations list
  const [allLocations, setAllLocations] = useState([]);

  const locationsByName = useMemo(() => {
    const m = new Map();
    allLocations.forEach((l) => m.set((l.name || "").toLowerCase(), l));
    return m;
  }, [allLocations]);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);

        const [users, locs] = await Promise.all([getUsers(), fetchLocations()]);
        const normalizedLocs = (locs || []).map((l) => ({
          id: l.id ?? l.location_id ?? l.pk ?? "",
          name: l.name ?? l.location_name ?? l.title ?? "",
        }));
        setAllLocations(normalizedLocs);

        const selected = (users || []).find((u) => String(u.id) === String(id));
        if (!selected) {
          alert("User not found.");
          navigate("/dash/settings/users");
          return;
        }

        const first = (selected.first_name || "").trim();
        const last = (selected.last_name || "").trim();
        const full = (first || last) ? `${first} ${last}`.trim() : (selected.name || "");
        setName(full);
        setEmail(selected.email || "");
        setMobile(selected.mobile_phone || "");

        // preselect location if we can
        let initialId = "";
        const defaultLoc = selected.default_location;

        const userLocNames = Array.isArray(selected.locations) ? selected.locations : [];
        if (userLocNames.length && normalizedLocs.length) {
          const firstName =
            (typeof userLocNames[0] === "string"
              ? userLocNames[0]
              : userLocNames[0]?.name || userLocNames[0]?.location_name || ""
            ).toLowerCase();
          const match = locationsByName.get(firstName);
          if (match?.id != null) initialId = String(match.id);
        }
        if (!initialId && defaultLoc != null && String(defaultLoc).trim() !== "") {
          initialId = String(defaultLoc);
        }
        setLocationId(initialId);
      } catch (e) {
        alert("❌ Failed to load Edit User: " + (e?.message || e));
      } finally {
        setLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, navigate]);

  const validate = () => {
    const next = {};
    if (!name.trim()) next.name = "Name is required.";
    if (!email.trim()) next.email = "Email is required.";
    if (!locationId) next.location = "Please select a location.";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      // show blocking popup specifically for location (your request)
      if (!locationId) {
        alert("Please select a location.");
      }
      return;
    }

    try {
      setSaving(true);
      const trimmed = (name || "").trim();
      const [firstName, ...rest] = trimmed.split(/\s+/);
      const lastName = rest.join(" ");

      const payload = {
        first_name: firstName || "",
        last_name: lastName || "",
        email: (email || "").trim(),
        mobile_phone: (mobile || "").trim(),
        default_location: Number(locationId),
        location_ids: [Number(locationId)],
      };

      await updateUser(id, payload);
      alert("User updated successfully");
      navigate("/dash/settings/users");
    } catch (e) {
      alert("❌ Failed to update: " + (e?.message || e));
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => navigate("/dash/settings/users");

  if (loading) return <p className="edit-user-loading">Loading user...</p>;

  return (
    <div className="edit-user-container">
      <h2>Edit User</h2>

      <div className="edit-form">
        <div className="field">
          <label className="field-label">Name</label>
          <input
            type="text"
            className={`field-input ${errors.name ? "has-error" : ""}`}
            value={name}
            placeholder="Full name"
            onChange={(e) => setName(e.target.value)}
          />
          {errors.name ? <div className="error-text">{errors.name}</div> : null}
        </div>

        <div className="field">
          <label className="field-label">Email</label>
          <input
            type="email"
            className={`field-input ${errors.email ? "has-error" : ""}`}
            value={email}
            placeholder="email@example.com"
            onChange={(e) => setEmail(e.target.value)}
          />
          {errors.email ? <div className="error-text">{errors.email}</div> : null}
        </div>

        <div className="field">
          <label className="field-label">Mobile Number</label>
          <input
            type="tel"
            className="field-input"
            value={mobile}
            placeholder="+91 98765 43210"
            onChange={(e) => setMobile(e.target.value)}
          />
        </div>

        <div className="field">
          <label className="field-label">Location</label>
          <select
            className={`field-select ${errors.location ? "has-error" : ""}`}
            value={locationId}
            onChange={(e) => {
              setLocationId(e.target.value);
              if (errors.location) setErrors((prev) => ({ ...prev, location: undefined }));
            }}
          >
            <option value="">Select a location</option>
            {allLocations.map((loc) => (
              <option key={loc.id} value={loc.id}>
                {loc.name}
              </option>
            ))}
          </select>
          {errors.location ? <div className="error-text">{errors.location}</div> : (
            <div className="hint">Only locations from Settings → Locations are listed.</div>
          )}
        </div>

        <div className="btn-row">
          <button className="cancel-btn" type="button" onClick={handleCancel} disabled={saving}>
            Cancel
          </button>
          <button
            className="save-btn"
            type="button"
            onClick={handleSave}
            disabled={saving || !locationId}  /* also disable until a location is selected */
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default EditUserPage;
