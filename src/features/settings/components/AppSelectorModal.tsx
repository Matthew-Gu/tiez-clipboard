import { AnimatePresence, motion } from "framer-motion";
import { open } from "@tauri-apps/plugin-dialog";
import { X } from "lucide-react";
import AppSelector from "./AppSelector";
import type { InstalledAppOption } from "../../app/types";

interface AppSelectorModalProps {
    show: string | null;
    installedApps: InstalledAppOption[];
    theme: string;
    colorMode: string;
    t: (key: string) => string;
    onClose: () => void;
    onSave: (type: string, val: string) => void;
}

const AppSelectorModal = ({ show, installedApps, theme, colorMode, t, onClose, onSave }: AppSelectorModalProps) => (
    <AnimatePresence>
        {show && (
            <div className="dialog-backdrop" onClick={onClose}>
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    className="dialog dialog--selector"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="dialog__header">
                        <h3 className="dialog__title">{t('select_app_title')}</h3>
                        <button className="ui-button ui-button--icon dialog__close" onClick={onClose}>
                            <X size={18} />
                        </button>
                    </div>

                    <div className="selector-container">
                        <AppSelector
                            type={show}
                            installedApps={installedApps}
                            theme={theme}
                            colorMode={colorMode}
                            onSelect={(val) => {
                                if (show) onSave(show, val);
                                onClose();
                            }}
                            t={t}
                        />
                    </div>

                    <div className="dialog__selector-actions">
                        <button
                            className="ui-button ui-button--icon dialog__selector-action"
                            onClick={async () => {
                                try {
                                    const selected = await open({
                                        multiple: false,
                                        filters: [{
                                            name: 'Applications',
                                            extensions: ['exe', 'cmd', 'bat', 'lnk']
                                        }]
                                    });
                                    if (selected && show) {
                                        onSave(show, selected as string);
                                        onClose();
                                    }
                                } catch (err) { console.error(err); }
                            }}
                        >
                            {t('browse_file')}
                        </button>
                        <button
                            className="ui-button ui-button--icon dialog__selector-action dialog__button--danger"
                            onClick={onClose}
                        >
                            {t('cancel')}
                        </button>
                    </div>
                </motion.div>
            </div>
        )}
    </AnimatePresence>
);

export default AppSelectorModal;
