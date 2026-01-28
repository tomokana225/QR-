import React, { useState, useEffect, useRef } from 'react';

const CreateListModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onCreate: (name: string) => void;
    title: string;
    defaultNamePrefix: string;
}> = ({ isOpen, onClose, onCreate, title, defaultNamePrefix }) => {
    const [name, setName] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            const defaultName = `${defaultNamePrefix} ${new Date().toLocaleDateString('ja-JP')}`;
            setName(defaultName);
            setTimeout(() => inputRef.current?.focus(), 50); 
        }
    }, [isOpen, defaultNamePrefix]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onCreate(name);
    };

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50" 
            aria-modal="true" 
            role="dialog"
            onClick={onClose}
        >
            <div 
                className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md m-4"
                onClick={e => e.stopPropagation()}
            >
                <h2 className="text-lg font-semibold mb-4 text-slate-800">{title}</h2>
                <form onSubmit={handleSubmit}>
                    <div>
                        <label htmlFor="list-name" className="block text-sm font-medium text-slate-700">リスト名</label>
                        <input 
                            ref={inputRef}
                            type="text" 
                            id="list-name" 
                            value={name} 
                            onChange={(e) => setName(e.target.value)}
                            className="mt-1 block w-full p-2 border border-slate-300 rounded-md shadow-sm bg-white text-slate-900 focus:ring-indigo-500 focus:border-indigo-500"
                            required
                        />
                    </div>
                    <div className="mt-6 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50">キャンセル</button>
                        <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700">作成</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateListModal;
