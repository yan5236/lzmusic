import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import TrayApp from './tray/TrayApp';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const isTrayWindow = ['#tray', '#/tray'].includes(window.location.hash);
const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    {isTrayWindow ? <TrayApp /> : <App />}
  </React.StrictMode>
);
