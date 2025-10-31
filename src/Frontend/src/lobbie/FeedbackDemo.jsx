import React, { useState } from "react";
import "./FeedbackDemo.css";


function FeedbackDemo() {
  const [visible, setVisible] = useState(true);

  if (!visible) return null; // hide component when closed

  return (
    <div className="feedback-demo-container">
      {/* ===== Left Info Section ===== */}
      <div className="feedback-info">
        <h1 className="feedback-title">
          Get more reviews <br />
          on your Google <br />
          Business profile <br />
          with <span className="highlight">SocialNPS</span>
        </h1>

        <p className="feedback-description">
          We help practices get more visibility online by prompting happy
          patients to write local reviews on Google and other social media.
        </p>

        <ul className="feedback-features">
          <li>
            <span className="feedback-icon">✔️</span>
            Send an NPS survey after every patient visit
          </li>
          <li>
            <span className="feedback-icon">✔️</span>
            Automatically request reviews at set times via email or text
          </li>
          <li>
            <span className="feedback-icon">✔️</span>
            Get valuable feedback on what’s working and what isn’t in your
            organization
          </li>
        </ul>

        <button className="feedback-demo-btn">Schedule a demo</button>
      </div>

      {/* ===== Right Section (Phone + Reviews) ===== */}
      <div className="feedback-right">
        <div className="feedback-phone">
          <img
            src="https://i.ibb.co/C0g63LS/phone-nps.png"
            alt="NPS Survey Phone"
          />
        </div>

        <div className="feedback-reviews">
          <div className="feedback-review-card">
            <div className="review-header">
              <span className="review-name">Dan Greenfield</span>
              <span className="review-stars">★★★★★</span>
              <span className="review-days">2 days ago</span>
            </div>
            <div className="review-text">
              An excellent experience. Dr. Miller has always been attentive and
              at the top of his game.
            </div>
          </div>

          <div className="feedback-review-card">
            <div className="review-header">
              <span className="review-name">Sidney Johnson</span>
              <span className="review-stars">★★★★★</span>
              <span className="review-days">4 days ago</span>
            </div>
            <div className="review-text">
              My children have received nothing but the best from the doctors,
              whether it was a scheduled well visit or an impromptu sick visit.
              We have always been met with courteous and compassionate doctors.
            </div>
          </div>

          <div className="feedback-review-card">
            <div className="review-header">
              <span className="review-name">Mia Eriksen</span>
              <span className="review-stars">★★★★★</span>
              <span className="review-days">8 days ago</span>
            </div>
            <div className="review-text">
              So from the people on the phone to the ladies at the front desk,
              everyone is so nice. Dr. Torres is such a wonderful person. She
              was so kind and gentle. She took great care of me and my dad.
              Definitely would recommend seeing her. She makes you feel very
              comfortable.
            </div>
          </div>
        </div>
      </div>

      {/* ===== Close Button ===== */}
      <button
        className="feedback-close-btn"
        onClick={() => setVisible(false)}
      >
        Close ×
      </button>
    </div>
  );
}

export default FeedbackDemo;
