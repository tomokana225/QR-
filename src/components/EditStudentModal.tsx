import React, { useState, useEffect } from 'react';
import { Student } from '../types';

const EditStudentModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (student: Student) => void;
    student: Student | null;
}> = ({ isOpen, onClose, onSave, student }) => {
    const [className, setClassName] = useState('');
    const [studentNumber, setStudentNumber] = useState('');
    const [name, setName] = useState('');

    useEffect(() => {
        if (student) {
            setClassName(student.className);
            setStudentNumber(student.studentNumber);
            setName(student.name);
        }
    }, [student, isOpen]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
        };
        if (isOpen) {
            window.addEventListener('keydown', handleKeyDown);
        }
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen || !student) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({
            ...student,
            className,
            studentNumber,
            name
        });
        onClose();
    };

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50" 
            aria-modal="true" 
            role="dialog"
            onClick={onClose}
        >
            <div 
                className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md m-4"
                onClick={e => e.stopPropagation()}
            >
                <h2 className="text-lg font-bold mb-6 text-slate-800">生徒情報の編集</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-black text-slate-400 uppercase mb-1">クラス</label>
                        <input 
                            type="text" 
                            value={className} 
                            onChange={e => setClassName(e.target.value)} 
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" 
                            required 
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-slate-400 uppercase mb-1">出席番号</label>
                        <input 
                            type="number" 
                            inputMode="numeric"
                            value={studentNumber} 
                            onChange={e => setStudentNumber(e.target.value)} 
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" 
                            required 
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-black text-slate-400 uppercase mb-1">氏名</label>
                        <input 
                            type="text" 
                            value={name} 
                            onChange={e => setName(e.target.value)} 
                            className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" 
                            required 
                        />
                    </div>
                    <div className="pt-4 flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-5 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 rounded-xl hover:bg-slate-200 transition-colors">キャンセル</button>
                        <button type="submit" className="px-5 py-2.5 text-sm font-bold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 transition-colors">保存</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditStudentModal;