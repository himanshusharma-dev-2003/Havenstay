import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { GoogleOAuthProvider } from "@react-oauth/google";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID || "316696097984-hb5ctdt8spesioir3jqjml9s5r0ndth3.apps.googleusercontent.com"}>
      <App />
    </GoogleOAuthProvider>
  </React.StrictMode>
);
