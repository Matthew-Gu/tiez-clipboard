import React from "react";
import ReactDOM from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import App from "./App";
import AdvancedSettingsWindow from "./features/settings/components/AdvancedSettingsWindow";
import "./index.css";
import "./styles/components/index.css";
import "./styles/themes/load";

const params = new URLSearchParams(window.location.search);
const isAdvancedSettingsWindow = params.get("window") === "advanced-settings";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    {isAdvancedSettingsWindow
      ? <AdvancedSettingsWindow />
      : (
        <MemoryRouter>
          <App />
        </MemoryRouter>
      )}
  </React.StrictMode>,
);
