import React, { useEffect } from 'react';

const ConfirmationModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmButtonText?: string;
    cancelButtonText?: string;
    confirmButtonClass?: string;
}> = ({ isOpen, onClose, onConfirm, title, message, confirmButtonText = '実行', cancelButtonText = 'キャンセル', confirmButtonClass = 'bg-red-600 hover:bg-red-700' }) => {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
        }
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50" onClick={onClose} aria-modal="true" role="dialog">
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md m-4" onClick={e => e.stopPropagation()}>
                <h2 className="text-lg font-semibold mb-2 text-slate-800">{title}</h2>
                <p className="text-sm text-slate-600 mb-6">{message}</p>
                <div className="flex justify-end gap-3">
                    <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50">{cancelButtonText}</button>
                    <button type="button" onClick={onConfirm} className={`px-4 py-2 text-sm font-medium text-white border border-transparent rounded-md shadow-sm ${confirmButtonClass}`}>{confirmButtonText}</button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;
