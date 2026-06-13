import React from "react";
import ReactDOM from "react-dom/client";
import { MemoryRouter } from "react-router-dom";
import App from "./App";
import AdvancedSettingsWindow from "./features/settings/components/AdvancedSettingsWindow";
import "./index.less";
import "./styles/components/index.less";
import "./styles/themes/load";
import "./features/tag/styles/index.less";

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
