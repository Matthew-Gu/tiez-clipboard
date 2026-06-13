interface DeleteConfirmation {
    show: boolean;
    tagName: string | null;
}

interface ItemDeleteConfirmation {
    show: boolean;
    id: number | null;
}

interface EditingItem {
    id: number;
    content: string;
}

interface TagManagerDialogsProps {
    t: (key: string) => string;
    theme: string;
    deleteConfirmation: DeleteConfirmation;
    itemDeleteConfirmation: ItemDeleteConfirmation;
    isCreatingItem: boolean;
    newItemContent: string;
    editingItem: EditingItem | null;
    setDeleteConfirmation: (value: DeleteConfirmation) => void;
    setItemDeleteConfirmation: (value: ItemDeleteConfirmation) => void;
    setIsCreatingItem: (value: boolean) => void;
    setNewItemContent: (value: string) => void;
    setEditingItem: (value: EditingItem | null) => void;
    onDeleteTag: (tagName: string) => void;
    onDeleteItems: (id: number) => Promise<void>;
    onAddItem: () => Promise<void>;
    onUpdateItem: () => Promise<void>;
}

const TagManagerDialogs = ({
    t,
    theme,
    deleteConfirmation,
    itemDeleteConfirmation,
    isCreatingItem,
    newItemContent,
    editingItem,
    setDeleteConfirmation,
    setItemDeleteConfirmation,
    setIsCreatingItem,
    setNewItemContent,
    setEditingItem,
    onDeleteTag,
    onDeleteItems,
    onAddItem,
    onUpdateItem
}: TagManagerDialogsProps) => (
    <>
        {deleteConfirmation.show && (
            <div className="modal-overlay" onClick={() => setDeleteConfirmation({ show: false, tagName: null })}>
                <div className={`confirm-dialog tag-manager__dialog theme-${theme}`} onClick={(event) => event.stopPropagation()}>
                    <h3>{t('confirm_delete')}</h3>
                    <p>
                        {t('confirm_delete_tag')}<br />
                        <span className="tag-manager__highlight" style={{ marginTop: '8px', display: 'inline-block' }}>{deleteConfirmation.tagName}</span>
                    </p>
                    <div className="confirm-dialog-buttons">
                        <button className="confirm-dialog-button" onClick={() => setDeleteConfirmation({ show: false, tagName: null })}>{t('cancel')}</button>
                        <button className="confirm-dialog-button primary" onClick={() => {
                            if (deleteConfirmation.tagName) onDeleteTag(deleteConfirmation.tagName);
                            setDeleteConfirmation({ show: false, tagName: null });
                        }}>{t('delete')}</button>
                    </div>
                </div>
            </div>
        )}

        {itemDeleteConfirmation.show && (
            <div className="modal-overlay" onClick={() => setItemDeleteConfirmation({ show: false, id: null })}>
                <div className={`confirm-dialog tag-manager__dialog theme-${theme}`} onClick={(event) => event.stopPropagation()}>
                    <h3>{t('confirm_delete')}</h3>
                    <p>{t('confirm_delete_desc') || "确定要删除这条记录吗？"}</p>
                    <div className="confirm-dialog-buttons">
                        <button className="confirm-dialog-button" onClick={() => setItemDeleteConfirmation({ show: false, id: null })}>{t('cancel')}</button>
                        <button className="confirm-dialog-button primary" onClick={async () => {
                            if (itemDeleteConfirmation.id) await onDeleteItems(itemDeleteConfirmation.id);
                            setItemDeleteConfirmation({ show: false, id: null });
                        }}>{t('delete')}</button>
                    </div>
                </div>
            </div>
        )}

        {isCreatingItem && (
            <div className="modal-overlay" onClick={() => setIsCreatingItem(false)}>
                <div className={`confirm-dialog tag-manager__dialog theme-${theme}`} onClick={(event) => event.stopPropagation()}>
                    <h3>{t('add_item')}</h3>
                    <div className="modal-input-field">
                        <textarea
                            className="tag-manager__textarea"
                            value={newItemContent}
                            onChange={(event) => setNewItemContent(event.target.value)}
                            placeholder={t('input_content_placeholder')}
                            autoFocus
                        />
                    </div>
                    <div className="confirm-dialog-buttons">
                        <button className="confirm-dialog-button" onClick={() => setIsCreatingItem(false)}>{t('cancel')}</button>
                        <button className="confirm-dialog-button primary" onClick={onAddItem}>{t('confirm')}</button>
                    </div>
                </div>
            </div>
        )}

        {editingItem && (
            <div className="modal-overlay" onClick={() => setEditingItem(null)}>
                <div className={`confirm-dialog tag-manager__dialog theme-${theme}`} onClick={(event) => event.stopPropagation()}>
                    <h3>{t('edit_item')}</h3>
                    <div className="modal-input-field">
                        <textarea
                            className="tag-manager__textarea"
                            value={editingItem.content}
                            onChange={(event) => setEditingItem({ ...editingItem, content: event.target.value })}
                            autoFocus
                        />
                    </div>
                    <div className="confirm-dialog-buttons">
                        <button className="confirm-dialog-button" onClick={() => setEditingItem(null)}>{t('cancel')}</button>
                        <button className="confirm-dialog-button primary" onClick={onUpdateItem}>{t('save')}</button>
                    </div>
                </div>
            </div>
        )}
    </>
);

export default TagManagerDialogs;
