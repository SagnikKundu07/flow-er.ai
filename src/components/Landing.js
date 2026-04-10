import React from 'react';
import './Landing.css';

const Landing = ({ onGetStarted }) => {
  return (
    <div className="landing-container">
      <div className="landing-content">
        <div className="landing-header">
          <div className="logo-container">
            <span className="logo-text" onClick={() => window.location.reload()}>flower.ai</span>
          </div>
        </div>
        
        <div className="landing-main">
          <div className="landing-text">
            <h1>
              Streamline<br />
              data flow<br />
              with <span className="highlight">flower</span>
            </h1>
            
            <div className="landing-buttons">
              <button className="feature-button">Validation</button>
              <button className="feature-button">Visualization</button>
              <button className="feature-button disabled">Preparation</button>
            </div>
            
            <div className="action-buttons">
              <button className="get-started-button" onClick={onGetStarted}>
                Get Started
              </button>
              <button className="learn-more-button">
                Learn More
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Landing;
