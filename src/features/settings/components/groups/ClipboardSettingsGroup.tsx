import { useEffect, useState } from "react";
import type { ComponentType, ReactNode } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
    notifySettingsChanged,
    runSettingWrite,
    saveSetting
} from "../../../../shared/ipc/commands";
import { APP_SETTING_KEYS } from "../../../../shared/ipc/contracts";
import { focusClipboardWindow } from "../../../../shared/lib/focus";
import { ChevronDown, ChevronRight } from "lucide-react";
import { getHotkeyDisplayTokens } from "../../../../shared/lib/hotkeyDisplay";
import type { QuickPasteModifier } from "../../../app/types";
import HotkeyRecorder from "../HotkeyRecorder";

interface LabelWithHintProps {
    label: string;
    hint?: string | ReactNode;
    hintKey: string;
}

interface ClipboardSettingsGroupProps {
    t: (key: string) => string;
    collapsed: boolean;
    onToggle: () => void;
    LabelWithHint: ComponentType<LabelWithHintProps>;
    persistent: boolean;
    setPersistent: (val: boolean) => void;
    persistentLimitEnabled: boolean;
    setPersistentLimitEnabled: (val: boolean) => void;
    persistentLimit: number;
    setPersistentLimit: (val: number) => void;
    saveAppSetting: (key: string, val: string) => void;
    deduplicate: boolean;
    setDeduplicate: (val: boolean) => void;
    captureFiles: boolean;
    setCaptureFiles: (val: boolean) => void;
    searchHotkey: string;
    isRecordingSearch: boolean;
    setIsRecordingSearch: (val: boolean) => void;
    updateSearchHotkey: (key: string) => void;
    quickPasteModifier: QuickPasteModifier;
    setQuickPasteModifier: (val: QuickPasteModifier) => void;
    deleteAfterPaste: boolean;
    setDeleteAfterPaste: (val: boolean) => void;
    moveToTopAfterPaste: boolean;
    setMoveToTopAfterPaste: (val: boolean) => void;
    sequentialMode: boolean;
    setSequentialModeState: (val: boolean) => void;
    sequentialHotkey: string;
    isRecordingSequential: boolean;
    setIsRecordingSequential: (val: boolean) => void;
    updateSequentialHotkey: (key: string) => void;
    checkHotkeyConflict: (newHotkey: string, mode: 'main' | 'sequential' | 'search') => boolean;
    privacyProtection: boolean;
    setPrivacyProtection: (val: boolean) => void;
    privacyProtectionKinds: string[];
    setPrivacyProtectionKinds: (val: string[]) => void;
    privacyProtectionCustomRules: string;
    setPrivacyProtectionCustomRules: (val: string) => void;
    sensitiveMaskPrefixVisible: number;
    setSensitiveMaskPrefixVisible: (val: number) => void;
    sensitiveMaskSuffixVisible: number;
    setSensitiveMaskSuffixVisible: (val: number) => void;
    sensitiveMaskEmailDomain: boolean;
    setSensitiveMaskEmailDomain: (val: boolean) => void;
    privacyKindsOpen: boolean;
    setPrivacyKindsOpen: (val: boolean) => void;
    privacyRulesOpen: boolean;
    setPrivacyRulesOpen: (val: boolean) => void;
    isRecording: boolean;
    setIsRecording: (val: boolean) => void;
    hotkeyParts: string[];
    updateHotkey: (key: string) => void;
    hotkey: string;
    appSettings: Record<string, string>;
    theme: string;
    colorMode: string;
}

const ClipboardSettingsGroup = (props: ClipboardSettingsGroupProps) => {
    const quickPasteOptions: Array<{ value: QuickPasteModifier; label: string }> = [
        { value: "disabled", label: props.t("quick_paste_modifier_disabled") },
        { value: "ctrl", label: props.t("quick_paste_modifier_ctrl") },
        { value: "alt", label: props.t("quick_paste_modifier_alt") },
        { value: "shift", label: props.t("quick_paste_modifier_shift") },
        { value: "win", label: props.t("quick_paste_modifier_win") }
    ];
    const [persistentLimitDraft, setPersistentLimitDraft] = useState(
        props.persistentLimit.toString()
    );
    const [maskSettingsOpen, setMaskSettingsOpen] = useState(false);

    useEffect(() => {
        setPersistentLimitDraft(props.persistentLimit.toString());
    }, [props.persistentLimit, props.persistentLimitEnabled]);

    const commitPersistentLimit = (rawValue?: string) => {
        const source = rawValue ?? persistentLimitDraft;
        const parsed = parseInt(source, 10);
        if (!Number.isFinite(parsed)) {
            setPersistentLimitDraft(props.persistentLimit.toString());
            return;
        }
        const clamped = Math.max(50, Math.min(99999, parsed));
        props.setPersistentLimit(clamped);
        props.saveAppSetting('persistent_limit', clamped.toString());
        if (clamped.toString() !== source) {
            setPersistentLimitDraft(clamped.toString());
        }
    };

    const renderHotkeyCaps = (hotkey: string) => {
        const tokens = getHotkeyDisplayTokens(hotkey);
        if (tokens.length === 0) {
            return <div className="hotkey-recorder__key" style={{ width: '8em', opacity: 0.5 }}>{props.t('not_set')}</div>;
        }
        const compactLabel = tokens.map((token) => token.label).join(" + ");
        return <div className="hotkey-recorder__key hotkey-recorder__key--chord">{compactLabel}</div>;
    };

    return (
        <div className={`settings-group ${props.collapsed ? 'settings-group--collapsed' : ''}`}>
            <div className="settings-group__header" onClick={props.onToggle}>
                <h3 style={{ margin: 0 }}>{props.t('clipboard_settings')}</h3>
                {props.collapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
            </div>
            {!props.collapsed && (
                <div className="settings-group__content">
                    <div className="settings-group__item">
                        <props.LabelWithHint
                            label={props.t('persistent_storage')}
                            hint={props.t('persistent_hint')}
                            hintKey="persistent_storage"
                        />
                        <label className="ui-switch">
                            <input
                                className="ui-switch__input"
                                type="checkbox"
                                checked={props.persistent}
                                onChange={(e) => props.setPersistent(e.target.checked)}
                            />
                            <div className="ui-switch__track"><div className="ui-switch__icon ui-switch__icon--left" /><div className="ui-switch__icon ui-switch__icon--right" /></div>
                        </label>
                    </div>
                    {props.persistent && (
                        <>
                            <div className="settings-group__item">
                                <props.LabelWithHint
                                    label={props.t('persistent_limit_enabled')}
                                    hint={props.t('persistent_limit_enabled_hint')}
                                    hintKey="persistent_limit_enabled"
                                />
                                <label className="ui-switch">
                                    <input
                                        className="ui-switch__input"
                                        type="checkbox"
                                        checked={props.persistentLimitEnabled}
                                        onChange={(e) => {
                                            props.setPersistentLimitEnabled(e.target.checked);
                                            props.saveAppSetting('persistent_limit_enabled', e.target.checked.toString());
                                        }}
                                    />
                                    <div className="ui-switch__track"><div className="ui-switch__icon ui-switch__icon--left" /><div className="ui-switch__icon ui-switch__icon--right" /></div>
                                </label>
                            </div>
                            {props.persistentLimitEnabled && (
                                <div className="settings-group__item">
                                    <props.LabelWithHint
                                        label={props.t('persistent_limit')}
                                        hint={props.t('persistent_limit_hint')}
                                        hintKey="persistent_limit"
                                    />
                                    <input
                                        type="number"
                                        value={persistentLimitDraft}
                                        onFocus={(e) => {
                                            e.target.select();
                                            focusClipboardWindow().catch(console.error);
                                        }}
                                        onChange={(e) => {
                                            const next = e.target.value;
                                            if (next === "") {
                                                setPersistentLimitDraft("");
                                                return;
                                            }
                                            if (!/^\d+$/.test(next)) return;
                                            setPersistentLimitDraft(next);
                                        }}
                                        onBlur={() => {
                                            commitPersistentLimit();
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                commitPersistentLimit(e.currentTarget.value);
                                                e.currentTarget.blur();
                                            }
                                        }}
                                        style={{
                                            width: '90px',
                                            padding: '4px 8px',
                                            borderRadius: '4px',
                                            border: '1px solid var(--border-color)',
                                            background: 'var(--input-bg)',
                                            color: 'var(--text-color)',
                                            fontSize: '14px'
                                        }}
                                    />
                                </div>
                            )}
                        </>
                    )}
                    <div className="settings-group__item">
                        <props.LabelWithHint
                            label={props.t('merge_duplicates')}
                            hint={props.t('merge_duplicates_hint') || "Time limit to prevent accidental multiple copies"}
                            hintKey="merge_duplicates"
                        />
                        <label className="ui-switch">
                            <input
                                className="ui-switch__input"
                                type="checkbox"
                                checked={props.deduplicate}
                                onChange={(e) => props.setDeduplicate(e.target.checked)}
                            />
                            <div className="ui-switch__track"><div className="ui-switch__icon ui-switch__icon--left" /><div className="ui-switch__icon ui-switch__icon--right" /></div>
                        </label>
                    </div>
                    <div className="settings-group__item">
                        <div className="settings-group__label-group">
                            <span className="settings-group__label">{props.t('capture_files')}</span>
                        </div>
                        <label className="ui-switch">
                            <input
                                className="ui-switch__input"
                                type="checkbox"
                                checked={props.captureFiles}
                                onChange={(e) => props.setCaptureFiles(e.target.checked)}
                            />
                            <div className="ui-switch__track"><div className="ui-switch__icon ui-switch__icon--left" /><div className="ui-switch__icon ui-switch__icon--right" /></div>
                        </label>
                    </div>
                    <div className="settings-group__item">
                        <div className="settings-group__label-group">
                            <span className="settings-group__label">{props.t('search_hotkey_label')}</span>
                            <span className="hint">{props.isRecordingSearch ? props.t('hotkey_recording_esc') : props.t('hotkey_click_hint')}</span>
                        </div>
                        <HotkeyRecorder
                            hotkey={props.searchHotkey}
                            isRecording={props.isRecordingSearch}
                            waitingLabel={props.t('waiting_for_input')}
                            renderHotkey={renderHotkeyCaps}
                            setIsRecording={props.setIsRecordingSearch}
                            updateHotkey={props.updateSearchHotkey}
                        />
                    </div>
                    <div className="settings-group__item">
                        <props.LabelWithHint
                            label={props.t('quick_paste_modifier')}
                            hint={props.t('quick_paste_modifier_hint')}
                            hintKey="quick_paste_modifier"
                        />
                        <select
                            value={props.quickPasteModifier}
                            onChange={(e) => {
                                const value = e.target.value as QuickPasteModifier;
                                props.setQuickPasteModifier(value);
                                saveSetting(APP_SETTING_KEYS.quickPasteModifier, value).catch(console.error);
                            }}
                            style={{
                                padding: '4px 8px',
                                borderRadius: '4px',
                                border: '1px solid var(--border-color)',
                                background: 'var(--input-bg)',
                                color: 'var(--text-color)',
                                fontSize: '14px',
                                minWidth: '140px'
                            }}
                        >
                            {quickPasteOptions.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="settings-group__item">
                        <props.LabelWithHint
                            label={props.t('delete_after_paste')}
                            hint={props.t('delete_after_paste_hint')}
                            hintKey="delete_after_paste"
                        />
                        <label className="ui-switch">
                            <input
                                className="ui-switch__input"
                                type="checkbox"
                                checked={props.deleteAfterPaste}
                                onChange={(e) => {
                                    const val = e.target.checked;
                                    props.setDeleteAfterPaste(val);
                                    props.saveAppSetting('delete_after_paste', String(val));
                                }}
                            />
                            <div className="ui-switch__track"><div className="ui-switch__icon ui-switch__icon--left" /><div className="ui-switch__icon ui-switch__icon--right" /></div>
                        </label>
                    </div>
                    <div className="settings-group__item">
                        <props.LabelWithHint
                            label={props.t('move_to_top_after_paste')}
                            hint={props.t('move_to_top_after_paste_hint')}
                            hintKey="move_to_top_after_paste"
                        />
                        <label className="ui-switch">
                            <input
                                className="ui-switch__input"
                                type="checkbox"
                                checked={props.moveToTopAfterPaste}
                                onChange={(e) => {
                                    const val = e.target.checked;
                                    props.setMoveToTopAfterPaste(val);
                                    props.saveAppSetting('move_to_top_after_paste', String(val));
                                }}
                            />
                            <div className="ui-switch__track"><div className="ui-switch__icon ui-switch__icon--left" /><div className="ui-switch__icon ui-switch__icon--right" /></div>
                        </label>
                    </div>
                    <div className="settings-group__item">
                        <props.LabelWithHint
                            label={props.t('sequential_paste_mode')}
                            hint={props.t('sequential_paste_hint')}
                            hintKey="sequential_paste_mode"
                        />
                        <label className="ui-switch">
                            <input
                                className="ui-switch__input"
                                type="checkbox"
                                checked={props.sequentialMode}
                                onChange={(e) => {
                                    const val = e.target.checked;
                                    props.setSequentialModeState(val);
                                    runSettingWrite(
                                        () => invoke('set_sequential_mode', { enabled: val }),
                                        notifySettingsChanged
                                    ).catch(console.error);
                                    if (val) {
                                        if (props.checkHotkeyConflict(props.sequentialHotkey, 'sequential')) {
                                            props.updateSequentialHotkey("");
                                        }
                                    }
                                }}
                            />
                            <div className="ui-switch__track"><div className="ui-switch__icon ui-switch__icon--left" /><div className="ui-switch__icon ui-switch__icon--right" /></div>
                        </label>
                    </div>

                    {props.sequentialMode && (
                        <div className="settings-group__item">
                            <div className="settings-group__label-group">
                                <span className="settings-group__label">{props.t('sequential_paste_hotkey_label')}</span>
                                <span className="hint">{props.isRecordingSequential ? props.t('hotkey_recording_esc') : props.t('hotkey_click_hint')}</span>
                            </div>
                            <HotkeyRecorder
                                hotkey={props.sequentialHotkey}
                                isRecording={props.isRecordingSequential}
                                waitingLabel={props.t('waiting_for_input')}
                                renderHotkey={renderHotkeyCaps}
                                setIsRecording={props.setIsRecordingSequential}
                                updateHotkey={props.updateSequentialHotkey}
                            />
                        </div>
                    )}

                    <div className="settings-group__item">
                        <props.LabelWithHint
                            label={props.t('privacy_protection')}
                            hint={props.t('privacy_protection_hint')}
                            hintKey="privacy_protection"
                        />
                        <label className="ui-switch">
                            <input
                                className="ui-switch__input"
                                type="checkbox"
                                checked={props.privacyProtection}
                                onChange={(e) => {
                                    const val = e.target.checked;
                                    props.setPrivacyProtection(val);
                                    runSettingWrite(
                                        () => invoke('set_privacy_protection', { enabled: val }),
                                        notifySettingsChanged
                                    ).catch(console.error);
                                }}
                            />
                            <div className="ui-switch__track"><div className="ui-switch__icon ui-switch__icon--left" /><div className="ui-switch__icon ui-switch__icon--right" /></div>
                        </label>
                    </div>

                    <div className="settings-group__item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <button
                                type="button"
                                className="ui-button ui-button--icon"
                                onClick={() => props.setPrivacyKindsOpen(!props.privacyKindsOpen)}
                                style={{ width: '24px', height: '24px' }}
                            >
                                {props.privacyKindsOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                            </button>
                            <props.LabelWithHint
                                label={props.t('privacy_protection_kinds')}
                                hint={props.t('privacy_protection_kinds_hint')}
                                hintKey="privacy_protection_kinds"
                            />
                        </div>
                        {props.privacyKindsOpen && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginLeft: '30px' }}>
                                {[
                                    { id: 'url', label: props.t('privacy_kind_url') || '链接 / URL' },
                                    { id: 'phone', label: props.t('privacy_kind_phone') },
                                    { id: 'idcard', label: props.t('privacy_kind_idcard') },
                                    { id: 'email', label: props.t('privacy_kind_email') },
                                    { id: 'secret', label: props.t('privacy_kind_secret') },
                                    { id: 'password', label: props.t('privacy_kind_password') || "Strong Password" },
                                ].map(opt => {
                                    const checked = props.privacyProtectionKinds.includes(opt.id);
                                    return (
                                        <label key={opt.id} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <input
                                                className="ui-switch__input"
                                                type="checkbox"
                                                checked={checked}
                                                onChange={(e) => {
                                                    const next = e.target.checked
                                                        ? [...props.privacyProtectionKinds, opt.id]
                                                        : props.privacyProtectionKinds.filter(t => t !== opt.id);
                                                    props.setPrivacyProtectionKinds(next);
                                                    runSettingWrite(
                                                        () => invoke('set_privacy_protection_kinds', { kinds: next }),
                                                        notifySettingsChanged
                                                    ).catch(console.error);
                                                }}
                                            />
                                            <span style={{ fontSize: '12px', color: 'var(--text-primary)' }}>{opt.label}</span>
                                        </label>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="settings-group__item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <button
                                type="button"
                                className="ui-button ui-button--icon"
                                onClick={() => props.setPrivacyRulesOpen(!props.privacyRulesOpen)}
                                style={{ width: '24px', height: '24px' }}
                            >
                                {props.privacyRulesOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                            </button>
                            <props.LabelWithHint
                                label={props.t('privacy_protection_custom_rules')}
                                hint={props.t('privacy_protection_custom_rules_hint')}
                                hintKey="privacy_protection_custom_rules"
                            />
                        </div>
                        {props.privacyRulesOpen && (
                            <textarea
                                className="ui-input"
                                style={{ width: 'calc(100% - 30px)', maxWidth: '100%', minHeight: '80px', padding: '8px', borderRadius: '0', marginLeft: '30px', boxSizing: 'border-box' }}
                                placeholder={props.t('privacy_protection_custom_rules_placeholder')}
                                value={props.privacyProtectionCustomRules}
                                onFocus={() => focusClipboardWindow().catch(console.error)}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    props.setPrivacyProtectionCustomRules(val);
                                    runSettingWrite(
                                        () => invoke('set_privacy_protection_custom_rules', { rules: val }),
                                        notifySettingsChanged
                                    ).catch(console.error);
                                }}
                            />
                        )}
                    </div>

                    <div className="settings-group__item" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <button
                                type="button"
                                className="ui-button ui-button--icon"
                                onClick={() => setMaskSettingsOpen(!maskSettingsOpen)}
                                style={{ width: '24px', height: '24px' }}
                            >
                                {maskSettingsOpen ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                            </button>
                            <span className="settings-group__label">{props.t('sensitive_mask_settings')}</span>
                        </div>
                        {maskSettingsOpen && (
                            <div style={{ width: 'calc(100% - 30px)', marginLeft: '30px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <div className="settings-group__item" style={{ padding: 0, borderBottom: 'none' }}>
                                    <span className="settings-group__label">{props.t('sensitive_mask_prefix_visible')}</span>
                                    <input
                                        type="number"
                                        className="ui-input"
                                        style={{ width: '60px', padding: '4px 8px', textAlign: 'center' }}
                                        min={0}
                                        max={20}
                                        value={props.sensitiveMaskPrefixVisible}
                                        onChange={(e) => {
                                            const val = Math.min(20, Math.max(0, parseInt(e.target.value) || 0));
                                            props.setSensitiveMaskPrefixVisible(val);
                                            saveSetting(APP_SETTING_KEYS.sensitiveMaskPrefixVisible, val.toString()).catch(console.error);
                                        }}
                                    />
                                </div>
                                <div className="settings-group__item" style={{ padding: 0, borderBottom: 'none' }}>
                                    <span className="settings-group__label">{props.t('sensitive_mask_suffix_visible')}</span>
                                    <input
                                        type="number"
                                        className="ui-input"
                                        style={{ width: '60px', padding: '4px 8px', textAlign: 'center' }}
                                        min={0}
                                        max={20}
                                        value={props.sensitiveMaskSuffixVisible}
                                        onChange={(e) => {
                                            const val = Math.min(20, Math.max(0, parseInt(e.target.value) || 0));
                                            props.setSensitiveMaskSuffixVisible(val);
                                            saveSetting(APP_SETTING_KEYS.sensitiveMaskSuffixVisible, val.toString()).catch(console.error);
                                        }}
                                    />
                                </div>
                                <div className="settings-group__item" style={{ padding: 0, borderBottom: 'none' }}>
                                    <props.LabelWithHint
                                        label={props.t('sensitive_mask_email_domain')}
                                        hint={props.t('sensitive_mask_email_domain_hint')}
                                        hintKey="sensitive_mask_email_domain"
                                    />
                                    <label className="ui-switch">
                                        <input
                                            type="checkbox"
                                            checked={props.sensitiveMaskEmailDomain}
                                            onChange={(e) => {
                                                props.setSensitiveMaskEmailDomain(e.target.checked);
                                                saveSetting(APP_SETTING_KEYS.sensitiveMaskEmailDomain, e.target.checked.toString()).catch(console.error);
                                            }}
                                        />
                                        <span className="slider" />
                                    </label>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="settings-group__item settings-group__item--borderless">
                        <div className="settings-group__label-group">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                <span className="settings-group__label">{props.t('global_hotkey')}</span>
                            </div>
                            <span className="hint">{props.isRecording ? props.t('hotkey_recording_esc') : props.t('hotkey_click_hint')}</span>
                        </div>

                        <HotkeyRecorder
                            hotkey={props.hotkey}
                            isRecording={props.isRecording}
                            waitingLabel={props.t('waiting_for_input')}
                            renderHotkey={renderHotkeyCaps}
                            setIsRecording={props.setIsRecording}
                            updateHotkey={props.updateHotkey}
                        />
                    </div>

                </div>
            )}
        </div>
    );
};

export default ClipboardSettingsGroup;
