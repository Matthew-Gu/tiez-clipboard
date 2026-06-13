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
            <div className="dialog-backdrop" onClick={() => setDeleteConfirmation({ show: false, tagName: null })}>
                <div className="dialog" onClick={(event) => event.stopPropagation()}>
                    <h3 className="dialog__title">{t('confirm_delete')}</h3>
                    <p className="dialog__message">
                        {t('confirm_delete_tag')}<br />
                        <span className="dialog__highlight">{deleteConfirmation.tagName}</span>
                    </p>
                    <div className="dialog__actions">
                        <button className="dialog__button" onClick={() => setDeleteConfirmation({ show: false, tagName: null })}>{t('cancel')}</button>
                        <button className="dialog__button dialog__button--danger" onClick={() => {
                            if (deleteConfirmation.tagName) onDeleteTag(deleteConfirmation.tagName);
                            setDeleteConfirmation({ show: false, tagName: null });
                        }}>{t('delete')}</button>
                    </div>
                </div>
            </div>
        )}

        {itemDeleteConfirmation.show && (
            <div className="dialog-backdrop" onClick={() => setItemDeleteConfirmation({ show: false, id: null })}>
                <div className="dialog" onClick={(event) => event.stopPropagation()}>
                    <h3 className="dialog__title">{t('confirm_delete')}</h3>
                    <p className="dialog__message">{t('confirm_delete_desc') || "确定要删除这条记录吗？"}</p>
                    <div className="dialog__actions">
                        <button className="dialog__button" onClick={() => setItemDeleteConfirmation({ show: false, id: null })}>{t('cancel')}</button>
                        <button className="dialog__button dialog__button--danger" onClick={async () => {
                            if (itemDeleteConfirmation.id) await onDeleteItems(itemDeleteConfirmation.id);
                            setItemDeleteConfirmation({ show: false, id: null });
                        }}>{t('delete')}</button>
                    </div>
                </div>
            </div>
        )}

        {isCreatingItem && (
            <div className="dialog-backdrop" onClick={() => setIsCreatingItem(false)}>
                <div className="dialog" onClick={(event) => event.stopPropagation()}>
                    <h3 className="dialog__title">{t('add_item')}</h3>
                    <div className="dialog__field">
                        <textarea
                            className="dialog__textarea"
                            value={newItemContent}
                            onChange={(event) => setNewItemContent(event.target.value)}
                            placeholder={t('input_content_placeholder')}
                            autoFocus
                        />
                    </div>
                    <div className="dialog__actions">
                        <button className="dialog__button" onClick={() => setIsCreatingItem(false)}>{t('cancel')}</button>
                        <button className="dialog__button dialog__button--primary" onClick={onAddItem}>{t('confirm')}</button>
                    </div>
                </div>
            </div>
        )}

        {editingItem && (
            <div className="dialog-backdrop" onClick={() => setEditingItem(null)}>
                <div className="dialog" onClick={(event) => event.stopPropagation()}>
                    <h3 className="dialog__title">{t('edit_item')}</h3>
                    <div className="dialog__field">
                        <textarea
                            className="dialog__textarea"
                            value={editingItem.content}
                            onChange={(event) => setEditingItem({ ...editingItem, content: event.target.value })}
                            autoFocus
                        />
                    </div>
                    <div className="dialog__actions">
                        <button className="dialog__button" onClick={() => setEditingItem(null)}>{t('cancel')}</button>
                        <button className="dialog__button dialog__button--primary" onClick={onUpdateItem}>{t('save')}</button>
                    </div>
                </div>
            </div>
        )}
    </>
);

export default TagManagerDialogs;
