// components/extraction/LineItemsTable.jsx
import { useState } from 'react';
import { extractionsApi } from '../../api/extractions';
import './LineItemsTable.css';

export default function LineItemsTable({ extraction, onItemUpdated }) {
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  // Show empty state if no line items
  if (!extraction.line_items || extraction.line_items.length === 0) {
    return (
      <div className="line-items-table">
        <div style={{
          padding: '48px 24px',
          textAlign: 'center',
          background: '#f9fafb',
          border: '2px dashed #d1d5db',
          borderRadius: '8px'
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', marginBottom: '8px' }}>
            No Line Items Found
          </h3>
          <p style={{ color: '#6b7280', marginBottom: '16px' }}>
            AI didn't detect any line items on this page. This could mean:
          </p>
          <ul style={{
            color: '#6b7280',
            textAlign: 'left',
            maxWidth: '400px',
            margin: '0 auto 24px',
            listStyle: 'none',
            padding: 0
          }}>
            <li style={{ marginBottom: '8px' }}>• The page has no itemized costs</li>
            <li style={{ marginBottom: '8px' }}>• The page is a cover sheet or summary</li>
            <li style={{ marginBottom: '8px' }}>• The format wasn't recognized</li>
          </ul>
          <p style={{ color: '#6b7280', fontSize: '14px' }}>
            Try moving to the next page or re-extract if this seems incorrect.
          </p>
        </div>
      </div>
    );
  }

  const startEdit = (item) => {
    setEditingId(item.id);
    setEditForm({
      description: item.description,
      quantity: item.quantity,
      unit: item.unit,
      unit_price: item.unit_price || '',
      total_price: item.total_price || ''
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  const saveEdit = async (itemId) => {
    try {
      await extractionsApi.updateLineItem(itemId, editForm);
      setEditingId(null);
      setEditForm({});
      onItemUpdated();
    } catch (error) {
      alert('Failed to save: ' + error.message);
    }
  };

  const deleteItem = async (itemId) => {
    if (!confirm('Delete this line item?')) return;

    try {
      await extractionsApi.deleteLineItem(itemId);
      onItemUpdated();
    } catch (error) {
      alert('Failed to delete: ' + error.message);
    }
  };

  return (
    <div className="line-items-table">
      <table className="table">
        <thead>
          <tr>
            <th>#</th>
            <th>Description</th>
            <th>Quantity</th>
            <th>Unit</th>
            <th>Unit Price</th>
            <th>Total</th>
            <th>Delta</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {extraction.line_items?.map((item) => {
            const isEditing = editingId === item.id;
            const wasEdited = item.was_edited;

            return (
              <tr key={item.id} className={wasEdited ? 'edited' : ''}>
                {/* Line Number */}
                <td>{item.line_number}</td>

                {/* Description */}
                <td>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      className="input-field"
                    />
                  ) : (
                    <div>
                      <div>{item.description}</div>
                      {wasEdited && item.original_description && (
                        <div className="original-value">
                          <span className="original-label">AI:</span> {item.original_description}
                        </div>
                      )}
                    </div>
                  )}
                </td>

                {/* Quantity */}
                <td>
                  {isEditing ? (
                    <input
                      type="number"
                      step="0.01"
                      value={editForm.quantity}
                      onChange={(e) => setEditForm({ ...editForm, quantity: e.target.value })}
                      className="input-field"
                    />
                  ) : (
                    <div>
                      <div className={wasEdited ? 'edited-value' : ''}>
                        {Number(item.quantity).toLocaleString()}
                      </div>
                      {wasEdited && item.original_quantity && (
                        <div className="original-value">
                          <span className="original-label">AI:</span> {Number(item.original_quantity).toLocaleString()}
                        </div>
                      )}
                    </div>
                  )}
                </td>

                {/* Unit */}
                <td>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editForm.unit}
                      onChange={(e) => setEditForm({ ...editForm, unit: e.target.value })}
                      className="input-field"
                    />
                  ) : (
                    item.unit
                  )}
                </td>

                {/* Unit Price */}
                <td>
                  {isEditing ? (
                    <input
                      type="number"
                      step="0.01"
                      value={editForm.unit_price}
                      onChange={(e) => setEditForm({ ...editForm, unit_price: e.target.value })}
                      className="input-field"
                      placeholder="0.00"
                    />
                  ) : (
                    <div>
                      {item.unit_price ? (
                        <>
                          <div className={wasEdited ? 'edited-value' : ''}>
                            ${Number(item.unit_price).toFixed(2)}
                          </div>
                          {wasEdited && item.original_unit_price && (
                            <div className="original-value">
                              <span className="original-label">AI:</span> ${Number(item.original_unit_price).toFixed(2)}
                            </div>
                          )}
                        </>
                      ) : (
                        <span style={{ color: '#9ca3af' }}>—</span>
                      )}
                    </div>
                  )}
                </td>

                {/* Total Price */}
                <td>
                  {isEditing ? (
                    <input
                      type="number"
                      step="0.01"
                      value={editForm.total_price}
                      onChange={(e) => setEditForm({ ...editForm, total_price: e.target.value })}
                      className="input-field"
                      placeholder="0.00"
                    />
                  ) : (
                    <div>
                      {item.total_price ? (
                        <>
                          <div className={wasEdited ? 'edited-value' : ''}>
                            ${Number(item.total_price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          {wasEdited && item.original_total_price && (
                            <div className="original-value">
                              <span className="original-label">AI:</span> ${Number(item.original_total_price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                          )}
                        </>
                      ) : (
                        <span style={{ color: '#9ca3af' }}>—</span>
                      )}
                    </div>
                  )}
                </td>

                {/* Delta Column */}
                <td>
                  {wasEdited ? (
                    <div className="delta-column">
                      {item.original_quantity !== item.quantity && (
                        <div className="delta-item">
                          <span className="delta-label">Qty Δ:</span>
                          <span className="delta-value">
                            {(Number(item.quantity) - Number(item.original_quantity)).toFixed(2)}
                          </span>
                        </div>
                      )}
                      {item.original_total_price && item.total_price &&
                       item.original_total_price !== item.total_price && (
                        <div className="delta-item">
                          <span className="delta-label">$ Δ:</span>
                          <span className="delta-value">
                            ${(Number(item.total_price) - Number(item.original_total_price)).toFixed(2)}
                          </span>
                        </div>
                      )}
                      <div className="status-badge">
                        <span className="status-dot edited"></span>
                        <span className="status-text edited">Edited</span>
                      </div>
                    </div>
                  ) : (
                    <div className="status-badge">
                      <span className="status-dot ai"></span>
                      <span className="status-text ai">AI Only</span>
                    </div>
                  )}
                </td>

                {/* Actions */}
                <td>
                  {isEditing ? (
                    <div className="action-buttons">
                      <button onClick={() => saveEdit(item.id)} className="btn-save">
                        Save
                      </button>
                      <button onClick={cancelEdit} className="btn-cancel">
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="action-buttons">
                      <button onClick={() => startEdit(item)} className="btn-edit">
                        Edit
                      </button>
                      <button onClick={() => deleteItem(item.id)} className="btn-delete">
                        Delete
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Metadata Footer */}
      <div className="metadata-footer">
        <div className="metadata-grid">
          <div>
            <span className="metadata-label">Project ID:</span>
            <div className="metadata-value mono">
              {extraction.file_id?.slice(0, 8)}...
            </div>
          </div>
          <div>
            <span className="metadata-label">Page:</span>
            <div className="metadata-value">{extraction.page_number}</div>
          </div>
          <div>
            <span className="metadata-label">Extracted:</span>
            <div className="metadata-value">
              {new Date(extraction.completed_at).toLocaleString()}
            </div>
          </div>
          <div>
            <span className="metadata-label">Model:</span>
            <div className="metadata-value">{extraction.model_version}</div>
          </div>
        </div>
      </div>
    </div>
  );
}