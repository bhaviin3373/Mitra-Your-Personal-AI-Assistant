
import React from 'react';
import ReactDOM from 'react-dom/client';
// FIX: Changed import to be a named import as App is now a named export.
import { App } from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);