import React, { useState, useCallback, useEffect } from 'react';
import { Student, SubmissionList, AppSettings } from '../types';
import { PlusIcon, TrashIcon, CameraIcon, CheckCircleIcon, ArrowPathIcon, DocumentArrowDownIcon, ListBulletIcon, Squares2x2Icon, ChevronRightIcon, Cog6ToothIcon } from './Icons';
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
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid'); // Default to grid for better visibility on mobile
    const [isMenuOpen, setIsMenuOpen] = useState(true);

    useEffect(() => {
        setIsMenuOpen(window.innerWidth >= 1024);
    }, []);
    
    const activeList = submissionLists.find(l => l.id === activeSubmissionListId);
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

    const handleExportCSV = () => {
        if (!activeList) return;
        
        const csvRows = [['クラス', '番号', '氏名', '提出状況', '提出時間']];
        
        studentsToDisplay.forEach(student => {
            const timestamp = submissionMap.get(student.id);
            const status = timestamp ? '提出済み' : '未提出';
            const time = timestamp ? new Date(timestamp).toLocaleString('ja-JP') : '-';
            csvRows.push([student.className, student.studentNumber, student.name, status, time]);
        });

        const csvContent = "\uFEFF" + csvRows.map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `${activeList.name}_提出状況.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-10 h-full relative">
            {/* Mobile Toggle Button */}
            <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="lg:hidden w-full bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex justify-between items-center text-slate-700 font-bold active:bg-slate-50 transition-colors"
            >
                <span className="flex items-center gap-2">
                    <Cog6ToothIcon className="w-5 h-5 text-indigo-500" />
                    リスト選択・操作メニュー
                </span>
                <ChevronRightIcon className={`w-5 h-5 transition-transform duration-300 ${isMenuOpen ? 'rotate-90' : ''}`} />
            </button>

            {/* サイドコントロール */}
            <div className={`w-full lg:w-80 flex-shrink-0 flex flex-col gap-6 transition-all duration-300 ${isMenuOpen ? 'block' : 'hidden lg:flex'}`}>
                <div className="bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
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
                    <div className="flex gap-2 mb-4">
                        <select 
                            value={activeSubmissionListId || ''} 
                            onChange={e => onSetActiveSubmissionListId(e.target.value)}
                            className="flex-grow p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all cursor-pointer w-full min-w-0"
                        >
                            {submissionLists.length > 0 ? (
                                submissionLists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)
                            ) : (
                                <option value="">リストがありません</option>
                            )}
                        </select>
                        <button onClick={onCreateSubmissionList} className="p-4 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 flex-shrink-0" title="新規リスト"><PlusIcon className="w-5 h-5"/></button>
                    </div>

                    {activeSubmissionListId && (
                        <button 
                            onClick={handleExportCSV}
                            className="w-full mb-6 py-3 px-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-center gap-2 hover:bg-white hover:border-indigo-300 hover:text-indigo-600 transition-all shadow-sm"
                        >
                            <DocumentArrowDownIcon className="w-4 h-4" />
                            CSVでエクスポート
                        </button>
                    )}
                    
                    <button 
                        onClick={onResetCurrentList}
                        className="w-full py-3 px-4 border-2 border-slate-100 rounded-xl text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-all flex items-center justify-center gap-2"
                    >
                        <ArrowPathIcon className="w-3.5 h-3.5" />
                        Reset All Data
                    </button>
                </div>

                <div className="bg-slate-900 p-6 rounded-3xl shadow-2xl shadow-indigo-900/10 hidden lg:block">
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

                <div className="bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 lg:mt-auto">
                    <div className="flex justify-between items-end mb-3">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Progress</span>
                        <span className="text-xl font-black text-indigo-600">{submissionMap.size} <span className="text-[10px] text-slate-400">/ {students.length}</span></span>
                    </div>
                    <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden shadow-inner">
                        <div className="bg-indigo-600 h-full transition-all duration-700 ease-out" style={{ width: `${students.length > 0 ? (submissionMap.size/students.length)*100 : 0}%` }}></div>
                    </div>
                </div>
            </div>

            {/* 一覧リスト */}
            <div className="flex-grow bg-white rounded-3xl lg:rounded-[2.5rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col overflow-hidden min-h-[300px]">
                <div className="p-6 border-b border-slate-50 flex flex-wrap gap-4 justify-between items-center bg-white z-20">
                    <div>
                        <h3 className="text-lg font-black text-slate-900 tracking-tight">提出状況</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Status Table</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="flex bg-slate-100 p-1 rounded-xl">
                            <button 
                                onClick={() => setViewMode('grid')} 
                                className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                                title="グリッド表示"
                            >
                                <Squares2x2Icon className="w-5 h-5" />
                            </button>
                            <button 
                                onClick={() => setViewMode('list')} 
                                className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
                                title="リスト表示"
                            >
                                <ListBulletIcon className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="h-6 w-px bg-slate-200 mx-1"></div>
                        <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="p-2.5 px-4 text-xs font-black bg-slate-50 border border-slate-200 rounded-xl outline-none cursor-pointer focus:ring-4 focus:ring-indigo-500/10 transition-all appearance-none hover:bg-slate-100">
                            <option value="all">すべてのクラス</option>
                            {(([...new Set(students.map(s => s.className))] as string[]).sort((a: string, b: string) => a.localeCompare(b, undefined, { numeric: true }))).map(c => <option key={c} value={c}>{c}組</option>)}
                        </select>
                    </div>
                </div>
                
                <div className="flex-grow overflow-y-auto scroll-container px-4 lg:px-6 py-4">
                    {viewMode === 'list' ? (
                        <table className="w-full text-sm text-left border-separate border-spacing-y-1">
                            <thead className="bg-white sticky top-0 z-10">
                                <tr className="text-slate-400">
                                    <th className="px-3 py-2 font-black text-[10px] uppercase tracking-widest bg-white">生徒</th>
                                    <th className="px-3 py-2 font-black text-[10px] uppercase tracking-widest bg-white">ステータス</th>
                                    <th className="px-3 py-2 font-black text-[10px] uppercase tracking-widest text-right hidden sm:table-cell bg-white">確認時間</th>
                                </tr>
                            </thead>
                            <tbody className="animate-fade-in">
                                {studentsToDisplay.map(s => {
                                    const timestamp = submissionMap.get(s.id);
                                    return (
                                        <tr key={s.id} className={`group transition-all ${timestamp ? 'bg-emerald-50/20' : 'bg-transparent hover:bg-slate-50'}`}>
                                            <td className="px-3 py-2 rounded-l-lg border-y border-l border-transparent">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shadow-sm flex-shrink-0 ${timestamp ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                                        {s.studentNumber}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-baseline gap-2">
                                                            <span className="text-[10px] text-slate-400 font-bold uppercase">{s.className}組</span>
                                                            <span className="font-bold text-slate-700">{s.name}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1 mt-0.5">
                                                            <div className={`w-1.5 h-1.5 rounded-full ${timestamp ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                                                            <span className={`text-xs ${timestamp ? 'text-emerald-600 font-bold' : 'text-slate-400'}`}>
                                                                {timestamp ? '提出済み' : '未提出'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-3 py-2 rounded-r-lg border-y border-r border-transparent text-right">
                                                <button
                                                    onClick={() => handleToggleSubmission(s.id, timestamp)}
                                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${timestamp ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}
                                                >
                                                    {timestamp ? '取り消し' : '承認'}
                                                </button>
                                                <div className="text-[10px] text-slate-400 mt-1 font-mono">
                                                    {timestamp ? new Date(timestamp).toLocaleTimeString('ja-JP', {hour: '2-digit', minute:'2-digit'}) : '-'}
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    ) : (
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 pb-20">
                            {studentsToDisplay.map(s => {
                                const timestamp = submissionMap.get(s.id);
                                return (
                                    <div 
                                        key={s.id} 
                                        onClick={() => handleToggleSubmission(s.id, timestamp)}
                                        className={`relative p-4 rounded-2xl border transition-all cursor-pointer hover:scale-[1.02] active:scale-95 ${timestamp ? 'bg-emerald-50 border-emerald-100 shadow-emerald-100' : 'bg-white border-slate-100 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-500/10'}`}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-[10px] font-black bg-white/50 px-2 py-1 rounded text-slate-500">{s.className}-{s.studentNumber}</span>
                                            {timestamp && <CheckCircleIcon className="w-5 h-5 text-emerald-500" />}
                                        </div>
                                        <h4 className="font-bold text-slate-800 text-sm mb-1 truncate">{s.name}</h4>
                                        <p className={`text-xs font-bold ${timestamp ? 'text-emerald-600' : 'text-slate-400'}`}>
                                            {timestamp ? new Date(timestamp).toLocaleTimeString('ja-JP', {hour: '2-digit', minute:'2-digit'}) : '未提出'}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* Mobile FAB */}
            <button
                onClick={() => setIsCameraScannerOpen(true)}
                className="lg:hidden fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-2xl shadow-indigo-500/40 flex items-center justify-center z-30 active:scale-90 transition-transform hover:bg-indigo-700"
            >
                <CameraIcon className="w-7 h-7" />
            </button>

            <CameraScannerModal
                isOpen={isCameraScannerOpen}
                onClose={async () => setIsCameraScannerOpen(false)}
                onScanStudent={handleSubmissionScan}
                students={students}
                settings={settings}
                onSettingsChange={onSettingsChange}
                scannerId="qr-reader-submission"
                title="提出チェックQRスキャン"
                activeList={activeList}
            />
        </div>
    );
};

export default SubmissionChecker;