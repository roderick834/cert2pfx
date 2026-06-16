import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Set --app-height CSS variable from actual window.innerHeight.
// This is the most reliable way to get the true visible viewport height
// on iOS Safari (where 100vh / 100svh / 100dvh all behave inconsistently).
function setAppHeight() {
  document.documentElement.style.setProperty('--app-height', `${window.innerHeight}px`);
}
setAppHeight();
window.addEventListener('resize', setAppHeight);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
