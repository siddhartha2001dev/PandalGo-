import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { api } from '../../lib/api.js';
import {
  CheckCircle2,
  AlertTriangle,
  Copy,
  XCircle,
  RefreshCw,
  ArrowRight,
  Edit2,
  Check,
  X,
  FileCheck,
} from 'lucide-react';

export function DevBotImportTable({ preview, onImportSuccess }) {
  const queryClient = useQueryClient();
  const [rows, setRows] = useState(preview?.rows || []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingRowIndex, setEditingRowIndex] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [importResult, setImportResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  if (!preview) return null;

  const toggleIncludeRow = (rowIndex) => {
    setRows((prev) =>
      prev.map((r) => (r.rowIndex === rowIndex ? { ...r, isIncluded: !r.isIncluded } : r))
    );
  };

  const handleSelectAll = (select) => {
    setRows((prev) =>
      prev.map((r) => (r.validationStatus !== 'invalid' ? { ...r, isIncluded: select } : r))
    );
  };

  const startEdit = (row) => {
    setEditingRowIndex(row.rowIndex);
    setEditFormData({
      name: row.name,
      locality: row.locality,
      address: row.address,
      category: row.category,
    });
  };

  const saveEdit = (rowIndex) => {
    setRows((prev) =>
      prev.map((r) => (r.rowIndex === rowIndex ? { ...r, ...editFormData } : r))
    );
    setEditingRowIndex(null);
  };

  const includedCount = rows.filter((r) => r.isIncluded && r.validationStatus !== 'invalid').length;

  const handleConfirmImport = async () => {
    if (includedCount === 0) {
      setErrorMessage('Please include at least one valid pandal row to import.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      const selectedRowIndexes = rows
        .filter((r) => r.isIncluded && r.validationStatus !== 'invalid')
        .map((r) => r.rowIndex);

      const res = await api.post(`/dev-bot/imports/${preview.jobId}/confirm`, {
        selectedRowIndexes,
      });

      if (res.data?.success) {
        setImportResult(res.data);

        // Invalidate live discovery and map caches across the app
        queryClient.invalidateQueries({ queryKey: ['pujas'] });
        queryClient.invalidateQueries({ queryKey: ['admin-pujas'] });
        queryClient.invalidateQueries({ queryKey: ['admin-stats'] });

        if (onImportSuccess) {
          onImportSuccess(res.data);
        }
      } else {
        setErrorMessage(res.data?.message || 'Failed to complete import.');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Import execution failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-[#FDFBF7] dark:bg-[#1E1A17] rounded-2xl border border-[#E8DEC8] dark:border-[#3A322B] p-3.5 my-2.5 shadow-sm space-y-3">
      {/* Top Header & Metrics */}
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#E8DEC8] dark:border-[#3A322B]">
        <div>
          <div className="flex items-center gap-1.5">
            <FileCheck className="w-4 h-4 text-[#C74732]" />
            <h4 className="font-serif font-bold text-xs sm:text-sm text-[#282520] dark:text-[#F9F6F0]">
              Pandal Import Preview
            </h4>
          </div>
          <p className="text-[10px] text-[#686358] dark:text-[#B8AF9F] font-mono mt-0.5">
            Job ID: {preview.jobId}
          </p>
        </div>

        {/* Status Chips */}
        <div className="flex items-center gap-1 text-[10px] font-semibold">
          <span className="px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
            {preview.validRowsCount || 0} Valid
          </span>
          <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
            {preview.warningRowsCount || 0} Warnings
          </span>
          <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
            {preview.duplicateRowsCount || 0} Duplicates
          </span>
          {preview.invalidRowsCount > 0 && (
            <span className="px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
              {preview.invalidRowsCount} Invalid
            </span>
          )}
        </div>
      </div>

      {/* Import Result Banner */}
      {importResult && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 space-y-1">
          <div className="flex items-center gap-1.5 font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{importResult.message}</span>
          </div>
          <p className="text-[11px] text-emerald-700 dark:text-emerald-400">
            Live map and discovery listings have been automatically refreshed!
          </p>
        </div>
      )}

      {errorMessage && (
        <div className="p-2.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-700 dark:text-rose-300">
          {errorMessage}
        </div>
      )}

      {/* Row List / Table */}
      {!importResult && (
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1 text-xs">
          {rows.map((row) => {
            const isEditing = editingRowIndex === row.rowIndex;
            return (
              <div
                key={row.rowIndex}
                className={`p-2.5 rounded-xl border transition-all ${
                  row.isIncluded
                    ? 'bg-[#F4EBDD]/60 dark:bg-[#141210] border-[#E8DEC8] dark:border-[#3A322B]'
                    : 'bg-stone-100/60 dark:bg-stone-900/40 opacity-60 border-stone-200 dark:border-stone-800'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={row.isIncluded}
                      disabled={row.validationStatus === 'invalid'}
                      onChange={() => toggleIncludeRow(row.rowIndex)}
                      className="mt-0.5 rounded text-[#C74732] focus:ring-[#C74732]"
                      aria-label={`Include row ${row.rowIndex}`}
                    />

                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <div className="space-y-1.5 py-1">
                          <input
                            type="text"
                            value={editFormData.name}
                            onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                            placeholder="Pandal Name"
                            className="w-full px-2 py-1 rounded-lg border border-[#E8DEC8] dark:border-[#3A322B] bg-[#FDFBF7] dark:bg-[#1E1A17] text-xs font-bold"
                          />
                          <div className="grid grid-cols-2 gap-1.5">
                            <input
                              type="text"
                              value={editFormData.locality}
                              onChange={(e) => setEditFormData({ ...editFormData, locality: e.target.value })}
                              placeholder="Locality"
                              className="px-2 py-1 rounded-lg border border-[#E8DEC8] dark:border-[#3A322B] bg-[#FDFBF7] dark:bg-[#1E1A17] text-xs"
                            />
                            <input
                              type="text"
                              value={editFormData.address}
                              onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                              placeholder="Address"
                              className="px-2 py-1 rounded-lg border border-[#E8DEC8] dark:border-[#3A322B] bg-[#FDFBF7] dark:bg-[#1E1A17] text-xs"
                            />
                          </div>
                          <div className="flex items-center gap-1.5 pt-1">
                            <button
                              type="button"
                              onClick={() => saveEdit(row.rowIndex)}
                              className="px-2.5 py-1 rounded-md bg-emerald-600 text-white text-[10px] font-bold inline-flex items-center gap-1"
                            >
                              <Check className="w-3 h-3" /> Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingRowIndex(null)}
                              className="px-2 py-1 rounded-md bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300 text-[10px]"
                            >
                              <X className="w-3 h-3" /> Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-[#282520] dark:text-[#F9F6F0]">
                              #{row.rowIndex} {row.name}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-stone-200 dark:bg-stone-800 text-stone-600 dark:text-stone-400">
                              {row.locality}
                            </span>
                          </div>
                          <p className="text-[11px] text-[#686358] dark:text-[#B8AF9F] truncate">
                            {row.address}
                          </p>
                        </div>
                      )}

                      {/* Warnings or Duplicates */}
                      {row.validationErrors?.length > 0 && (
                        <div className="mt-1 flex items-start gap-1 text-[10px] text-amber-700 dark:text-amber-400">
                          <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                          <span>{row.validationErrors.join(' • ')}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {!isEditing && (
                    <button
                      type="button"
                      onClick={() => startEdit(row)}
                      className="p-1 rounded text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
                      title="Edit row"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation CTA Footer */}
      {!importResult && (
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#E8DEC8] dark:border-[#3A322B]">
          <div className="flex items-center gap-1 text-[11px] text-[#686358] dark:text-[#B8AF9F]">
            <button
              type="button"
              onClick={() => handleSelectAll(true)}
              className="hover:underline font-semibold text-[#C74732]"
            >
              Select All
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => handleSelectAll(false)}
              className="hover:underline"
            >
              Clear
            </button>
          </div>

          <button
            type="button"
            onClick={handleConfirmImport}
            disabled={isSubmitting || includedCount === 0}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-[#C74732] to-[#A83522] hover:brightness-110 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Importing...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Confirm Import ({includedCount} Rows)</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
