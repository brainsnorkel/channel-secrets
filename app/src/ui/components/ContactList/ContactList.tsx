import React, { useState } from 'react';
import './ContactList.css';

export interface Contact {
  id: string;
  nickname: string;
  handle: string;
  status: 'idle' | 'sending' | 'receiving';
  unreadCount?: number;
}

export interface ContactListProps {
  contacts: Contact[];
  selectedId?: string;
  onSelect: (id: string) => void;
  onAddContact: () => void;
  onDelete: (id: string) => void;
  onEdit?: (id: string, nickname: string) => void;
}

export const ContactList: React.FC<ContactListProps> = ({
  contacts,
  selectedId,
  onSelect,
  onAddContact,
  onDelete,
  onEdit,
}) => {
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const getInitials = (nickname: string): string => {
    return nickname
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const getStatusLabel = (status: Contact['status']): string => {
    switch (status) {
      case 'sending':
        return 'Sending...';
      case 'receiving':
        return 'Monitoring';
      default:
        return '';
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, contactId: string) => {
    e.stopPropagation();
    setDeleteConfirmId(contactId);
  };

  const confirmDelete = (contactId: string) => {
    onDelete(contactId);
    setDeleteConfirmId(null);
  };

  const cancelDelete = () => {
    setDeleteConfirmId(null);
  };

  const handleEditClick = (e: React.MouseEvent, contact: Contact) => {
    e.stopPropagation();
    setEditingId(contact.id);
    setEditValue(contact.nickname);
  };

  const handleEditSave = (contactId: string) => {
    if (onEdit && editValue.trim()) {
      onEdit(contactId, editValue.trim());
    }
    setEditingId(null);
    setEditValue('');
  };

  const handleEditCancel = () => {
    setEditingId(null);
    setEditValue('');
  };

  const handleEditKeyDown = (e: React.KeyboardEvent, contactId: string) => {
    if (e.key === 'Enter') {
      handleEditSave(contactId);
    } else if (e.key === 'Escape') {
      handleEditCancel();
    }
  };

  return (
    <div className="contact-list">
      <div className="contact-list__header">
        <h2 className="contact-list__title">Channels</h2>
      </div>

      <div className="contact-list__content">
        {contacts.length === 0 ? (
          <div className="contact-list__empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="9" cy="7" r="4" strokeWidth="2"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <p>No channels yet</p>
            <p className="contact-list__empty-hint">Add a contact to start communicating securely</p>
          </div>
        ) : (
          <ul className="contact-list__items">
            {contacts.map(contact => (
              <li
                key={contact.id}
                className={`contact-list__item ${selectedId === contact.id ? 'contact-list__item--selected' : ''}`}
                onClick={() => onSelect(contact.id)}
              >
                <div className="contact-list__avatar">
                  {getInitials(contact.nickname)}
                </div>

                <div className="contact-list__info">
                  {editingId === contact.id ? (
                    <input
                      type="text"
                      className="contact-list__edit-input"
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      onKeyDown={(e) => handleEditKeyDown(e, contact.id)}
                      onBlur={() => handleEditSave(contact.id)}
                      autoFocus
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <div className="contact-list__name-wrapper">
                      <span className="contact-list__name">{contact.nickname}</span>
                      {contact.unreadCount && contact.unreadCount > 0 && (
                        <span className="contact-list__badge">{contact.unreadCount}</span>
                      )}
                    </div>
                  )}
                  <span className="contact-list__handle">@{contact.handle}</span>
                  {contact.status !== 'idle' && (
                    <div className="contact-list__status">
                      <span className={`contact-list__status-dot contact-list__status-dot--${contact.status}`} />
                      <span className="contact-list__status-label">{getStatusLabel(contact.status)}</span>
                    </div>
                  )}
                </div>

                <div className="contact-list__actions">
                  {onEdit && editingId !== contact.id && (
                    <button
                      className="contact-list__action-button contact-list__action-button--edit"
                      onClick={(e) => handleEditClick(e, contact)}
                      aria-label="Edit contact"
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  )}
                  <button
                    className="contact-list__action-button contact-list__action-button--delete"
                    onClick={(e) => handleDeleteClick(e, contact.id)}
                    aria-label="Delete contact"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <polyline points="3 6 5 6 21 6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="contact-list__footer">
        <button className="contact-list__add-button" onClick={onAddContact}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="8.5" cy="7" r="4" strokeWidth="2"/>
            <line x1="20" y1="8" x2="20" y2="14" strokeWidth="2" strokeLinecap="round"/>
            <line x1="23" y1="11" x2="17" y2="11" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          Add Contact
        </button>
      </div>

      {deleteConfirmId && (
        <div className="contact-list__modal-overlay" onClick={cancelDelete}>
          <div className="contact-list__modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="contact-list__modal-title">Delete Channel</h3>
            <p className="contact-list__modal-message">
              Delete channel with{' '}
              <strong>{contacts.find(c => c.id === deleteConfirmId)?.nickname}</strong>?
              This cannot be undone.
            </p>
            <div className="contact-list__modal-actions">
              <button
                className="contact-list__modal-button contact-list__modal-button--cancel"
                onClick={cancelDelete}
              >
                Cancel
              </button>
              <button
                className="contact-list__modal-button contact-list__modal-button--delete"
                onClick={() => confirmDelete(deleteConfirmId)}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
