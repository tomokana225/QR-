import React, { useState } from 'react';
import { Student } from '../types';
import { SparklesIcon, XMarkIcon, TrashIcon } from './Icons';

const RosterManager: React.FC<{
    students: Student[];
    selectedStudentIds: Set<string>;
    setSelectedStudentIds: React.Dispatch<React.SetStateAction<Set<string>>>;
    onAddStudent: (student: Omit<Student, 'id' | 'randomCode'>) => void;
    onBulkAddStudents: (students: Omit<Student, 'id' | 'randomCode'>[]) => number;
    onDeleteStudent: (id: string) => void;
    onDeleteSelectedStudents: () => void;
}> = ({ students, selectedStudentIds, setSelectedStudentIds, onAddStudent, onBulkAddStudents, onDeleteStudent, onDeleteSelectedStudents }) => {
    const [className, setClassName] = useState('');
    const [studentNumber, setStudentNumber] = useState('');
    const [name, setName] = useState('');
    const [mode, setMode] = useState<'single' | 'bulk'>('single');
    const [bulkText, setBulkText] = useState('');
    const [selectedClass, setSelectedClass] = useState('all');

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (!className || !studentNumber || !name) return;
        onAddStudent({ className, studentNumber, name });
        setStudentNumber((parseInt(studentNumber)+1).toString());
        setName('');
    };

    const handleBulkAdd = (e: React.FormEvent) => {
        e.preventDefault();
        const lines = bulkText.trim().split('\n');
        const newStudents = lines.map(line => {
            const [cn, sn, n] = line.split('\t').map(p => p?.trim());
            return cn && sn && n ? { className: cn, studentNumber: sn, name: n } : null;
        }).filter(Boolean) as any[];
        if (newStudents.length > 0) {
            onBulkAddStudents(newStudents);
            setBulkText('');
            alert(`${newStudents.length}名の生徒を追加しました。`);
        }
    };

    const studentsToDisplay = students.filter(s => selectedClass === 'all' || s.className === selectedClass)
        .sort((a,b) => {
            if (a.className !== b.className) return a.className.localeCompare(b.className, undefined, {numeric:true});
            return parseInt(a.studentNumber) - parseInt(b.studentNumber);
        });

    return (
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 h-full">
            {/* Registration Form */}
            <div className="w-full lg:w-80 flex-shrink-0 flex flex-col gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
                        <button onClick={() => setMode('single')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${mode === 'single' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>個別</button>
                        <button onClick={() => setMode('bulk')} className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${mode === 'bulk' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>一括</button>
                    </div>

                    {mode === 'single' ? (
                        <form onSubmit={handleAdd} className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase">クラス</label>
                                <input type="text" value={className} onChange={e => setClassName(e.target.value)} className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="1" required />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase">出席番号</label>
                                <input type="number" inputMode="numeric" value={studentNumber} onChange={e => setStudentNumber(e.target.value)} className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="10" required />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase">氏名</label>
                                <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full mt-1 p-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="山田 太郎" required />
                            </div>
                            <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 flex items-center justify-center gap-2">
                                <SparklesIcon className="w-4 h-4" /> 登録
                            </button>
                        </form>
                    ) : (
                        <form onSubmit={handleBulkAdd} className="space-y-4">
                            <p className="text-[10px] text-slate-500">Excelの[クラス/番号/名前]列を貼り付け</p>
                            <textarea value={bulkText} onChange={e => setBulkText(e.target.value)} className="w-full h-48 p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="1	1	山田 太郎" />
                            <button type="submit" className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200">
                                一括追加実行
                            </button>
                        </form>
                    )}
                </div>

                {selectedStudentIds.size > 0 && (
                    <div className="bg-red-50 p-6 rounded-2xl border border-red-100 flex flex-col gap-3">
                        <p className="text-red-700 text-sm font-bold">{selectedStudentIds.size}名を操作中</p>
                        <button onClick={onDeleteSelectedStudents} className="w-full bg-red-600 text-white py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 hover:bg-red-700">
                            <TrashIcon className="w-4 h-4" /> 選択削除
                        </button>
                    </div>
                )}
            </div>

            {/* Student List */}
            <div className="flex-grow bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden min-h-[300px]">
                <div className="p-4 lg:p-6 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
                    <h3 className="font-black text-slate-800 tracking-tight">登録生徒一覧</h3>
                    <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="p-2 text-xs font-bold bg-slate-100 border-none rounded-lg outline-none cursor-pointer">
                        <option value="all">全クラス</option>
                        {Array.from(new Set(students.map(s => s.className))).sort((a,b)=>a.localeCompare(b,undefined,{numeric:true})).map(c => (
                            <option key={c} value={c}>{c}組</option>
                        ))}
                    </select>
                </div>
                <div className="flex-grow overflow-y-auto p-4 space-y-2">
                    {studentsToDisplay.map(s => (
                        <div key={s.id} className={`flex items-center gap-3 lg:gap-4 p-3 lg:p-4 rounded-xl transition-all border ${selectedStudentIds.has(s.id) ? 'bg-indigo-50 border-indigo-100' : 'bg-white border-slate-100 hover:border-slate-300'}`}>
                            <input 
                                type="checkbox" 
                                checked={selectedStudentIds.has(s.id)} 
                                onChange={() => setSelectedStudentIds(prev => {
                                    const next = new Set(prev);
                                    if(next.has(s.id)) next.delete(s.id); else next.add(s.id);
                                    return next;
                                })}
                                className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 flex-shrink-0"
                            />
                            <div className="flex-grow min-w-0">
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded whitespace-nowrap">{s.className}-{s.studentNumber}</span>
                                    <span className="text-sm font-bold text-slate-800 truncate">{s.name}</span>
                                </div>
                            </div>
                            <button onClick={() => onDeleteStudent(s.id)} className="p-2 text-slate-300 hover:text-red-500 transition-colors flex-shrink-0">
                                <XMarkIcon className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                    {studentsToDisplay.length === 0 && <p className="text-center text-slate-400 text-sm py-20">生徒が登録されていません</p>}
                </div>
            </div>
        </div>
    );
};

export default RosterManager;