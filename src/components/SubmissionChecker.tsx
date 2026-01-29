import React, { useState, useCallback } from 'react';
import { Student, SubmissionList, AppSettings } from '../types';
import { PlusIcon, TrashIcon, CameraIcon, CheckCircleIcon, ArrowPathIcon } from './Icons';
import CameraScannerModal from './CameraScannerModal';

const SubmissionChecker: React.FC<{
    students: Student[];
    submissionLists: SubmissionList[];
    activeSubmissionListId: string | null;
    onSetSubmission: (studentId: string, timestamp: number | null) => void;
    onResetCurrentList: () => void;
    onCreateSubmissionList: () => void;
    onDeleteSubmissionList: (listId: string) => void;
    onSetActiveSubmissionListId: (listId: string) => void;
    settings: AppSettings;
    onSettingsChange: (newSettings: Partial<AppSettings>) => void;
    playSuccessSound: () => void;
    audioRef: React.RefObject<HTMLAudioElement>;
    setConfirmation: (confirmation: any) => void;
}> = ({ students, submissionLists, activeSubmissionListId, onSetSubmission, onResetCurrentList, onCreateSubmissionList, onDeleteSubmissionList, onSetActiveSubmissionListId, settings, onSettingsChange, playSuccessSound, audioRef, setConfirmation }) => {
    
    const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);
    const [barcodeInput, setBarcodeInput] = useState('');
    const [selectedClass, setSelectedClass] = useState('all');
    
    const activeList = submissionLists.find(l => l.id === activeSubmissionListId);
    // FIX: Explicitly type the Map to prevent 'unknown' inference and fix downstream type errors.
    const submissionMap = new Map<string, number>(activeList?.submissions.map(s => [s.studentId, s.timestamp]) || []);

    const handleSubmissionScan = useCallback((student: Student, isDuplicate?: boolean) => {
        if (isDuplicate) return;
        onSetSubmission(student.id, Date.now());
        playSuccessSound();
        return { success: true, message: `${student.name}さんを承認しました`};
    }, [onSetSubmission, playSuccessSound]);

    const handleBarcodeSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const student = students.find(s => s.randomCode === barcodeInput.trim());
        if (student) handleSubmissionScan(student, submissionMap.has(student.id));
        setBarcodeInput('');
    };

    const studentsToDisplay = students.filter(s => selectedClass === 'all' || s.className === selectedClass)
        .sort((a,b) => {
            if (a.className !== b.className) return a.className.localeCompare(b.className, undefined, {numeric:true});
            return parseInt(a.studentNumber) - parseInt(b.studentNumber);
        });

    const handleToggleSubmission = (studentId: string, currentTimestamp: number | undefined) => {
        onSetSubmission(studentId, currentTimestamp ? null : Date.now());
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-10 h-full">
            {/* サイドコントロール */}
            <div className="w-full lg:w-80 flex-shrink-0 flex flex-col gap-6 lg:gap-8">
                <div className="bg-white p-6 lg:p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
                    <div className="flex justify-between items-center mb-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active List</label>
                        {activeSubmissionListId && (
                            <button 
                                onClick={() => onDeleteSubmissionList(activeSubmissionListId)}
                                className="p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
                            >
                                <TrashIcon className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    <div className="flex gap-2 mb-6">
                        <select 
                            value={activeSubmissionListId || ''} 
                            onChange={e => onSetActiveSubmissionListId(e.target.value)}
                            className="flex-grow p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all cursor-pointer w-full min-w-0"
                        >
                            {submissionLists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </select>
                        <button onClick={onCreateSubmissionList} className="p-4 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 flex-shrink-0" title="新規リスト"><PlusIcon className="w-5 h-5"/></button>
                    </div>
                    
                    <button 
                        onClick={onResetCurrentList}
                        className="w-full py-3 px-4 border-2 border-slate-100 rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-all flex items-center justify-center gap-2"
                    >
                        <ArrowPathIcon className="w-3.5 h-3.5" />
                        Reset All Data
                    </button>
                </div>

                <div className="bg-slate-900 p-6 lg:p-8 rounded-3xl shadow-2xl shadow-indigo-900/10">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-500/30">
                            <CameraIcon className="w-5 h-5 text-white" />
                        </div>
                        <h3 className="text-white text-sm font-black tracking-tight">Scanner</h3>
                    </div>
                    <form onSubmit={handleBarcodeSubmit} className="mb-6">
                        <input 
                            type="text" 
                            value={barcodeInput} 
                            onChange={e => setBarcodeInput(e.target.value)}
                            placeholder="バーコード手入力..."
                            className="w-full p-4 bg-slate-800 border border-slate-700 rounded-2xl text-white text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition-all placeholder:text-slate-600"
                        />
                    </form>
                    <button 
                        onClick={() => setIsCameraScannerOpen(true)}
                        className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-3 hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-500/30 active:scale-95"
                    >
                        カメラを起動
                    </button>
                </div>

                <div className="bg-white p-6 lg:p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 mt-auto">
                    <div className="flex justify-between items-end mb-3">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Progress</span>
                        <span className="text-xl font-black text-indigo-600">{submissionMap.size} <span className="text-[10px] text-slate-400">/ {students.length}</span></span>
                    </div>
                    <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden shadow-inner">
                        <div className="bg-indigo-600 h-full transition-all duration-700 ease-out" style={{ width: `${(submissionMap.size/students.length)*100}%` }}></div>
                    </div>
                </div>
            </div>

            {/* 一覧リスト */}
            <div className="flex-grow bg-white rounded-3xl lg:rounded-[2.5rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col overflow-hidden min-h-[300px]">
                <div className="p-6 lg:p-10 border-b border-slate-50 flex flex-wrap gap-4 justify-between items-center">
                    <div>
                        <h3 className="text-lg font-black text-slate-900 tracking-tight">提出状況</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Status Table</p>
                    </div>
                    <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="p-3 px-5 text-xs font-black bg-slate-50 border border-slate-200 rounded-xl outline-none cursor-pointer focus:ring-4 focus:ring-indigo-500/10 transition-all appearance-none">
                        <option value="all">すべてのクラス</option>
                        {/* FIX: Cast result to string[] to resolve localeCompare error on unknown type */}
                        {([...new Set(students.map(s => s.className))] as string[]).sort((a: string, b: string) => a.localeCompare(b, undefined, { numeric: true })).map(c => <option key={c} value={c}>{c}組</option>)}
                    </select>
                </div>
                
                <div className="flex-grow overflow-y-auto scroll-container px-4 lg:px-6">
                    <table className="w-full text-sm text-left border-separate border-spacing-y-2">
                        <thead className="bg-white sticky top-0 z-10">
                            <tr className="text-slate-400">
                                <th className="px-3 lg:px-6 py-4 font-black text-[10px] uppercase tracking-widest">生徒</th>
                                <th className="px-3 lg:px-6 py-4 font-black text-[10px] uppercase tracking-widest">ステータス</th>
                                <th className="px-3 lg:px-6 py-4 font-black text-[10px] uppercase tracking-widest text-right hidden sm:table-cell">確認時間</th>
                            </tr>
                        </thead>
                        <tbody className="animate-fade-in">
                            {studentsToDisplay.map(s => {
                                const timestamp = submissionMap.get(s.id);
                                return (
                                    <tr key={s.id} className={`group transition-all ${timestamp ? 'bg-emerald-50/20' : 'bg-transparent hover:bg-slate-50'}`}>
                                        <td className="px-3 lg:px-6 py-3 lg:py-5 rounded-l-xl lg:rounded-l-2xl">
                                            <div className="flex items-center gap-3 lg:gap-4">
                                                <div className={`w-9 h-9 lg:w-11 lg:h-11 rounded-xl lg:rounded-2xl flex items-center justify-center font-black text-xs shadow-sm flex-shrink-0 ${timestamp ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                                    {s.studentNumber}
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-black text-slate-900 text-sm lg:text-base truncate">{s.name}</p>
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">{s.className}組</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-3 lg:px-6 py-3 lg:py-5">
                                            <button 
                                                onClick={() => handleToggleSubmission(s.id, timestamp)}
                                                className={`inline-flex items-center gap-2 px-3 lg:px-4 py-2 rounded-xl text-[10px] lg:text-[11px] font-black uppercase tracking-wider transition-all active:scale-95 group/status shadow-sm whitespace-nowrap ${
                                                    timestamp 
                                                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-100 hover:bg-red-50 hover:text-red-700 hover:border-red-100' 
                                                    : 'bg-slate-50 text-slate-500 border border-slate-200 hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-100'
                                                }`}
                                            >
                                                {timestamp ? (
                                                    <>
                                                        <CheckCircleIcon className="w-4 h-4 group-hover/status:hidden" />
                                                        <span className="group-hover/status:hidden">提出済</span>
                                                        <span className="hidden group-hover/status:inline">取消す</span>
                                                    </>
                                                ) : (
                                                    <span>未提出</span>
                                                )}
                                            </button>
                                        </td>
                                        <td className="px-3 lg:px-6 py-3 lg:py-5 text-right font-mono text-slate-400 text-xs rounded-r-xl lg:rounded-r-2xl hidden sm:table-cell">
                                            {/* timestamp is number | undefined since submissionMap is Map<string, number> */}
                                            {timestamp ? new Date(timestamp).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            <CameraScannerModal
                isOpen={isCameraScannerOpen}
                onClose={async () => setIsCameraScannerOpen(false)}
                onScanStudent={handleSubmissionScan}
                students={students}
                activeList={activeList}
                settings={settings}
                onSettingsChange={onSettingsChange}
                scannerId="qr-reader-submission"
                title="Scanner"
            />
        </div>
    );
};

export default SubmissionChecker;