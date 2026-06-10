import { RotateCcw } from "lucide-react";

interface SettingsFooterProps {
  t: (key: string) => string;
  onResetSettings: () => void;
}

const SettingsFooter = ({ t, onResetSettings }: SettingsFooterProps) => (
  <div
    className="settings-footer"
    style={{
      marginTop: "16px",
      marginBottom: "32px",
      display: "flex",
      justifyContent: "center"
    }}
  >
    <button
      type="button"
      className="reset-btn"
      style={{
        width: "auto",
        minWidth: "144px",
        padding: "0 18px"
      }}
      onClick={onResetSettings}
    >
      <RotateCcw size={16} />
      <span style={{ fontSize: "13px", fontWeight: 600 }}>{t("reset_defaults")}</span>
    </button>
  </div>
);

export default SettingsFooter;
