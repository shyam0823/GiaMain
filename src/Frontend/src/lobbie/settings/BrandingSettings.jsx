import React from 'react';
import './BrandingSettings.css';

function BrandingSettings() {
  return (
    <>
      {/* Branding Section */}
      <section className="panel">
        <h2>Branding</h2>
        <div className="system-section">
          <h3>System</h3>
          <div className="form-group logo-row">
            <label className="form-label">
              <input type="checkbox" defaultChecked /> Use a custom logo image
            </label>
            <div className="logo-preview">
              <img
                src="https://via.placeholder.com/90x50?text=GIA+Logo"
                alt="GIA Home Care Logo"
              />
            </div>
            <div>
              <button className="secondary">Clear logo</button>
              <button className="secondary">Replace logo</button>
            </div>
            <p className="help-text">
              Your image must be PNG, JPG, JPEG or BMP file under 25 MB.<br />
              Image of size 70 x 100 pixels recommended.
            </p>
            <input
              type="text"
              className="brand-input"
              defaultValue="GIA Home Care Services"
              maxLength={40}
            />
          </div>
          <button className="btn">Save Branding</button>
          <button className="secondary">Reset Logo Branding</button>
        </div>
      </section>

      {/* Email Identity Section */}
      <section className="panel">
        <h2>Email Identity</h2>
        <p className="subtitle">
          Define how you would like emails sent from Lobbie to appear to your patients:
        </p>
        <form>
          <div className="email-identity-row">
            <div className="form-group">
              <label className="form-label">Practice name: *</label>
              <p className="help-text">
                The friendly name that patients see when they receive an email.<br/>
                For example a patient would see "From: Taco &lt;taco@lobbie.com&gt;" if this was changed to "Taco" and the 'from' email address was "taco@lobbie.com"
              </p>
              <input
                type="text"
                defaultValue="GIA Home Care Services"
                className="brand-input"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Practice email 'from' address: *</label>
              <p className="help-text">
                The 'from' address that patients see when they receive an email.<br />
                For example a patient would see "From: Taco &lt;taco@lobbie.com&gt;" if this was changed to "taco@lobbie.com" and the practice name was changed to "Taco."
              </p>
              <input
                type="email"
                defaultValue="giahomecareservices@lobbie.com"
                className="brand-input"
              />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">Reply-to email address: *</label>
            <p className="help-text">
              Whenever a patient receives an email from Lobbie, if they reply to it their response will be sent to this email address.<br />
              For example, if a patient replies to an email from Lobbie and this is set to taco@taco.com, the response will be sent to taco@taco.com.<br />
              Defaults to: 'noreply@lobbie.com'
            </p>
            <input
              type="email"
              defaultValue="info@giahomecareservices.com"
              className="brand-input"
            />
          </div>
          <button className="secondary">Reset Email Branding</button>
        </form>
      </section>
    </>
  );
}

export default BrandingSettings;
