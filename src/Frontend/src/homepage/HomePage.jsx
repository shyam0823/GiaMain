"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import "./HomePage.css"

function HomePage() {
  const navigate = useNavigate()

  const heroImages = [
    "https://thumbs.dreamstime.com/b/close-up-hands-helping-hands-elderly-home-care-close-up-hands-helping-hands-elderly-home-care-mother-daughter-mental-117352153.jpg",
    "https://www.shutterstock.com/image-photo/holding-hands-help-elderly-person-260nw-2433950777.jpg",
    "https://images.pexels.com/photos/3768131/pexels-photo-3768131.jpeg?cs=srgb&dl=pexels-olly-3768131.jpg&fm=jpg",
    "https://www.shutterstock.com/image-photo/woman-doctor-service-help-support-260nw-1688433571.jpg",
    "https://static.vecteezy.com/system/resources/thumbnails/016/341/683/small_2x/homecare-nursing-service-and-elderly-people-cardiology-healthcare-close-up-of-young-hispanic-female-doctor-nurse-check-mature-caucasian-man-patient-heartbeat-using-stethoscope-during-visit-free-photo.jpg",
    "https://media.istockphoto.com/id/1487980045/photo/caregiver-doing-regular-check-up-of-senior-woman-in-her-home.jpg?s=612x612&w=0&k=20&c=Gzw1-TGLxqNnIz_CwMohwk9GIr88zxaP99Il_6f1Q_A=",
  ]

  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % heroImages.length)
    }, 5000) // Change image every 5 seconds

    return () => clearInterval(interval)
  }, [heroImages.length])

  const handleEmployeePortalClick = () => {
    navigate("/login")
  }

  return (
    <div className="homepage-container">
      {/* Header */}
      <header className="homepage-header">
        <div className="logo-section">
          <img
            src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQX-tviCnKExYEC23Ytc1BQZ_oNJxilc9V10Q&s"
            alt="GIA Homecare Services"
            className="home-logo"
          />
          <div className="logo-text">
            <div className="main-title">HOMECARE SERVICES</div>
            <div className="sub-title">Excellent Care just for You</div>
          </div>
        </div>
        <nav className="nav-section">
          <a href="#aboutus">ABOUT US</a>
          <a href="#services">SERVICES</a>
          <a href="#servicearea">SERVICE AREA</a>
          <a href="#referral">REFERRAL</a>
          <a href="#employment">EMPLOYMENT</a>
        </nav>
        <div className="portal-section">
          <button className="employee-portal-btn" onClick={handleEmployeePortalClick}>
            EMPLOYEE PORTAL
          </button>
        </div>
      </header>

      {/* Hero Section */}
      <div className="hero-section">
        <div className="hero-image-container">
          {heroImages.map((image, index) => (
            <img
              key={index}
              src={image || "/placeholder.svg"}
              alt="Homecare"
              className={`homepage-image ${index === currentImageIndex ? "active" : ""}`}
            />
          ))}
        </div>
        <div className="hero-overlay">
          <span className="hero-title">Your Partner in Home-Based Healthcare</span>
        </div>
      </div>

      {/* Half Image - Half Content Section */}
      <section className="care-section">
        <div className="care-image">
          <img src="https://images.pexels.com/photos/7551667/pexels-photo-7551667.jpeg?cs=srgb&dl=pexels-kampus-7551667.jpg&fm=jpg" alt="Care" />
        </div>
        <div className="care-content">
          <h2>Professional Care You Can Trust</h2>
          <div className="care-icon">
            <span role="img" aria-label="dove">
              🕊️
            </span>
          </div>
          <p>
            At <b>GIA Home Care Services (GIAHCS)</b>, we are dedicated to improving the quality of life for those we
            serve through compassionate, personalized, and professional care. Our mission is to empower individuals to
            thrive in the comfort of their homes by providing reliable support tailored to their unique needs. Whether
            it's offering daily assistance, skilled nursing care, or fostering greater independence, we work
            hand-in-hand with families to create solutions that enhance well-being and dignity.
          </p>
        </div>
      </section>

      {/* Services Section */}
      <div className="services-section" id="services">
        <h2 className="services-title">Our Services</h2>
        <div className="services-grid">
          <div className="service-card">
            <div className="service-icon">
              <img src="https://cdn-icons-png.flaticon.com/512/1077/1077012.png" alt="Group Adult Foster Care" />
            </div>
            <h3>Group Adult Foster Care Services</h3>
            <span className="service-more">MORE</span>
          </div>

          <div className="service-card">
            <div className="service-icon">
              <img src="https://cdn-icons-png.flaticon.com/512/2920/2920259.png" alt="Skilled Nursing" />
            </div>
            <h3>Skilled Nursing Services</h3>
            <span className="service-more">MORE</span>
          </div>

          <div className="service-card">
            <div className="service-icon">
              <img src="https://cdn-icons-png.flaticon.com/512/4320/4320355.png" alt="Private Duty Live-In" />
            </div>
            <h3>Private Duty Live-In Services</h3>
            <span className="service-more">MORE</span>
          </div>

          <div className="service-card">
            <div className="service-icon">
              <img src="https://cdn-icons-png.flaticon.com/512/3082/3082048.png" alt="Homemaker Services" />
            </div>
            <h3>Homemaker Services</h3>
            <span className="service-more">MORE</span>
          </div>
        </div>
      </div>

      {/* Why Choose Us */}
      <div className="why-choose-us">
        <div className="why-content">
          <h2 className="why-title">Why Choose Us?</h2>

          <div className="why-item">
            <div className="why-number">1</div>
            <div className="why-text">
              <h3>Comprehensive and Specialized Care Services</h3>
              <p>
                We offer a range of personalized care options, including private duty nursing, adult foster care, and
                group adult foster care. This ensures that each client is cared for in a way that fits their unique
                needs.
              </p>
            </div>
          </div>

          <div className="why-item highlighted">
            <div className="why-number">2</div>
            <div className="why-text">
              <h3>Experienced and Compassionate Team</h3>
              <p>
                Our team is made up of trained caregivers, skilled nurses, and care managers dedicated to delivering
                exceptional service with dignity and respect. We continually invest in training and professional
                development.
              </p>
            </div>
          </div>

          <div className="why-item">
            <div className="why-number">3</div>
            <div className="why-text">
              <h3>Personalized Support and Reliable Caregivers</h3>
              <p>
                Trust and consistency are at the core of our services. Our caregivers provide reliable, compassionate,
                and personalized support that helps clients feel safe and cared for at home.
              </p>
            </div>
          </div>
        </div>

        <div className="why-image">
          <img src="https://static.vecteezy.com/system/resources/previews/043/286/915/non_2x/asian-female-doctor-wearing-surgical-gown-touching-the-arm-of-an-elderly-patient-sitting-on-a-wheelchair-encouraging-do-not-worry-about-treatment-concept-of-medical-services-in-hospitals-photo.jpg" alt="Caregiver assisting elderly woman" />
        </div>
      </div>

      {/* Footer */}
      <footer className="contactus-footer">
        <div className="contactus-info-row">
          <div className="contactus-info-col">
            <h3 className="contactus-heading">Office Location</h3>
            <div className="contactus-icon-circle">
              <span className="contactus-icon">&#128205;</span>
            </div>
            <p>
              997 Millbury Street <br />
              Unit 4, Worcester, MA 01607
            </p>
          </div>
          <div className="contactus-info-col">
            <h3 className="contactus-heading">Phone Number</h3>
            <div className="contactus-icon-circle">
              <span className="contactus-icon">&#128222;</span>
            </div>
            <p>(508) 304-6985</p>
          </div>
          <div className="contactus-info-col">
            <h3 className="contactus-heading">Email Address</h3>
            <div className="contactus-icon-circle">
              <span className="contactus-icon">&#9993;</span>
            </div>
            <p>info@giahomecareservices.com</p>
          </div>
          <div className="contactus-info-col">
            <h3 className="contactus-heading">Office Hours</h3>
            <div className="contactus-icon-circle">
              <span className="contactus-icon">&#128336;</span>
            </div>
            <p>
              Weekdays: 9AM - 5PM <br />
              Weekends: CLOSED
            </p>
          </div>
        </div>

        <div className="contactus-details-map-row">
          <div className="contactus-map-col">
            <iframe
              title="GIA Homecare Office Location"
              src="https://www.google.com/maps?q=997+Millbury+St+Unit+4,+Worcester,+MA+01607&output=embed"
              width="100%"
              height="300"
              frameBorder="0"
              allowFullScreen
              aria-hidden="false"
              tabIndex="0"
            ></iframe>
          </div>
          <div className="contactus-details-col">
            <h2 className="contactus-contact-title">Contact Us</h2>
            <div className="contactus-contact-sub">Feel free to contact us anytime!</div>
            <div className="contactus-detail-row">
              <span className="contactus-icon">&#128205;</span>
              <span className="contactus-detail-label">Address:</span>
              <span className="contactus-detail-value">997 Millbury Street Unit 4, Worcester MA 01607</span>
            </div>
            <div className="contactus-detail-row">
              <span className="contactus-icon">&#9993;</span>
              <span className="contactus-detail-label">Email:</span>
              <span className="contactus-detail-value">info@giahomecareservices.com</span>
            </div>
            <div className="contactus-detail-row">
              <span className="contactus-icon">&#128222;</span>
              <span className="contactus-detail-label">Phone:</span>
              <span className="contactus-detail-value">508-304-6985</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default HomePage
