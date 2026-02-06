import React, { useState, useEffect, useCallback } from 'react';
import { Student, GradingList, AppSettings } from '../types';
import { PlusIcon, TrashIcon, CameraIcon, CheckCircleIcon, ExclamationTriangleIcon, ChevronRightIcon, Cog6ToothIcon, DocumentArrowDownIcon } from './Icons';
import CameraScannerModal from './CameraScannerModal';

const GradingScanner: React.FC<{
    students: Student[];
    gradingLists: GradingList[];
    activeGradingListId: string | null;
    onSetActiveGradingListId: (listId: string) => void;
    onCreateGradingList: () => void;
    onDeleteGradingList: (listId: string) => void;
    onSetScore: (listId: string, studentId: string, score: string) => void;
    onUpdateListDetails: (listId: string, updates: Partial<GradingList>) => void;
    settings: AppSettings;
    onSettingsChange: (newSettings: Partial<AppSettings>) => void;
    playSuccessSound: () => void;
    audioRef: React.RefObject<HTMLAudioElement>;
}> = ({ students, gradingLists, activeGradingListId, onSetActiveGradingListId, onCreateGradingList, onDeleteGradingList, onSetScore, onUpdateListDetails, settings, onSettingsChange, playSuccessSound, audioRef }) => {
    const [isCameraScannerOpen, setIsCameraScannerOpen] = useState(false);
    const [barcodeInput, setBarcodeInput] = useState('');
    const [continuousScan, setContinuousScan] = useState(true);
    const [scanResult, setScanResult] = useState<{ type: 'success' | 'error', message: string }>({ type: 'success', message: '' });
    const [selectedClass, setSelectedClass] = useState<string>('all');
    const [selectedScore, setSelectedScore] = useState<string>('');
    const [scoresInput, setScoresInput] = useState('');
    const [isMenuOpen, setIsMenuOpen] = useState(true);

    useEffect(() => {
        setIsMenuOpen(window.innerWidth >= 1024);
    }, []);

    const activeList = gradingLists.find(l => l.id === activeGradingListId);
    
    useEffect(() => {
        if (activeList) {
            setScoresInput(activeList.possibleScores.join(', '));
        }
    }, [activeList]);

    useEffect(() => {
        if (activeList?.possibleScores?.length && !selectedScore) {
            setSelectedScore(activeList.possibleScores[0]);
        }
        if (activeList && selectedScore && !activeList.possibleScores.includes(selectedScore)) {
            setSelectedScore(activeList.possibleScores[0] || '');
        }
    }, [activeList, selectedScore]);
    
    const handleScan = useCallback((student: Student) => {
        if (!activeGradingListId) {
            return { success: false, message: '有効な採点リストが選択されていません。'};
        }
        if (!selectedScore) {
             return { success: false, message: '採点する点数を選択してください。'};
        }

        // UX改善: 状態更新を待たずに即座に音を鳴らす
        playSuccessSound();
        onSetScore(activeGradingListId, student.id, selectedScore);
        
        return { success: true, message: `${student.name} さんを「${selectedScore}」で採点しました。`};
    }, [activeGradingListId, onSetScore, playSuccessSound, selectedScore]);


    const handleBarcodeSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!barcodeInput.trim()) return;
        const student = students.find(s => s.randomCode === barcodeInput.trim());
        if (student) {
            const result = handleScan(student);
            setScanResult(result.success ? { type: 'success', message: result.message } : { type: 'error', message: result.message });

        } else {
            setScanResult({ type: 'error', message: '該当する生徒が見つかりませんでした。' });
        }
        if (continuousScan) setBarcodeInput('');
    };
    
    const handleScoresChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setScoresInput(e.target.value);
    };

    const handleScoresBlur = () => {
        if (!activeGradingListId) return;
        const scores = scoresInput.split(',').map(s => s.trim()).filter(Boolean);
        onUpdateListDetails(activeGradingListId, { possibleScores: scores });
    };

    const handleExportCSV = () => {
        if (!activeList) return;
        const { scores } = activeList;
        const csvRows = [
            ['組', '番号', '氏名', '点数/評価']
        ];
        students.sort((a, b) => {
            if (a.className !== b.className) return a.className.localeCompare(b.className, undefined, { numeric: true });
            return parseInt(a.studentNumber) - parseInt(b.studentNumber);
        }).forEach(student => {
            const score = scores[student.id] || '';
            csvRows.push([student.className, student.studentNumber, student.name, score]);
        });

        const csvContent = "\uFEFF" + csvRows.map(e => e.join(",")).join("\n");
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `${activeList.name}_scores.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const sortedLists = [...gradingLists].sort((a, b) => b.createdAt - a.createdAt);
    const classNames = ['all', ...([...new Set(students.map(s => s.className))] as string[]).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))];
    const studentsToDisplay = students
        .filter(s => selectedClass === 'all' || s.className === selectedClass)
        .sort((a, b) => {
            if (a.className !== b.className) return a.className.localeCompare(b.className, undefined, { numeric: true });
            return parseInt(a.studentNumber) - parseInt(b.studentNumber);
        });

    if (gradingLists.length === 0) {
        return (
            <div className="text-center py-20">
                <h2 className="text-xl font-semibold text-slate-700">採点リストがありません</h2>
                <button onClick={onCreateGradingList} className="mt-6 bg-indigo-600 text-white font-bold py-2 px-4 rounded-md hover:bg-indigo-700 flex items-center justify-center gap-2 mx-auto"><PlusIcon className="w-5 h-5" /><span>新しい採点リストを作成</span></button>
            </div>
        );
    }
    
    return (
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-10 h-full relative">
            {/* Mobile Toggle Button */}
            <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="lg:hidden w-full bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex justify-between items-center text-slate-700 font-bold active:bg-slate-50 transition-colors"
            >
                <span className="flex items-center gap-2">
                    <Cog6ToothIcon className="w-5 h-5 text-indigo-500" />
                    採点リスト・設定メニュー
                </span>
                <ChevronRightIcon className={`w-5 h-5 transition-transform duration-300 ${isMenuOpen ? 'rotate-90' : ''}`} />
            </button>

            {/* Sidebar Controls */}
            <div className={`w-full lg:w-80 flex-shrink-0 flex flex-col gap-6 transition-all duration-300 ${isMenuOpen ? 'block' : 'hidden lg:flex'}`}>
                {/* List Management */}
                <div className="bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
                    <div className="flex justify-between items-center mb-4">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Grading List</label>
                        {activeGradingListId && (
                            <button onClick={() => onDeleteGradingList(activeGradingListId)} className="p-1.5 text-red-400 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors">
                                <TrashIcon className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    <div className="flex gap-2 mb-4">
                        <select value={activeGradingListId || ''} onChange={e => onSetActiveGradingListId(e.target.value)} className="flex-grow p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all cursor-pointer w-full min-w-0">
                            {sortedLists.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                        </select>
                        <button onClick={onCreateGradingList} className="p-4 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 flex-shrink-0"><PlusIcon className="w-5 h-5"/></button>
                    </div>

                    {activeGradingListId && (
                        <button 
                            onClick={handleExportCSV}
                            className="w-full py-3 px-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-center gap-2 hover:bg-white hover:border-indigo-300 hover:text-indigo-600 transition-all shadow-sm"
                        >
                            <DocumentArrowDownIcon className="w-4 h-4" />
                            CSVでエクスポート
                        </button>
                    )}
                </div>

                {/* Score Settings */}
                <div className="bg-white p-6 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100">
                    <h3 className="text-sm font-black text-slate-800 mb-4">点数設定</h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">選択肢 (カンマ区切り)</label>
                            <input type="text" value={scoresInput} onChange={handleScoresChange} onBlur={handleScoresBlur} className="block w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500" placeholder="100, 80, 60, C" />
                        </div>
                        <div>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">スキャン時の評価</label>
                            <select value={selectedScore} onChange={e => setSelectedScore(e.target.value)} className="block w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none font-bold" disabled={!activeList?.possibleScores.length}>
                                {activeList?.possibleScores.filter(s => s).map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Desktop Scanner Launch */}
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
                        <div className="mt-3">
                             <label className="flex items-center gap-2 text-xs text-slate-400 font-bold"><input type="checkbox" checked={continuousScan} onChange={(e) => setContinuousScan(e.target.checked)} className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-indigo-500 focus:ring-offset-slate-900" /> 連続スキャン</label>
                        </div>
                    </form>
                    <button 
                        onClick={() => {
                            if (audioRef.current && settings.playSound && settings.soundEffect !== 'none') {
                                audioRef.current.load();
                            }
                            setIsCameraScannerOpen(true);
                        }} 
                        className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-3 hover:bg-indigo-500 transition-all shadow-xl shadow-indigo-500/30 active:scale-95"
                    >
                        カメラを起動
                    </button>
                </div>
            </div>

            {/* Main Content */}
             <div className="flex-grow bg-white rounded-3xl lg:rounded-[2.5rem] border border-slate-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col overflow-hidden min-h-[300px]">
                <div className="p-6 border-b border-slate-50 flex flex-wrap gap-4 justify-between items-center bg-white z-20">
                    <div>
                        <h3 className="text-lg font-black text-slate-900 tracking-tight">採点状況</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Grading Table</p>
                    </div>
                    <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="p-2.5 px-4 text-xs font-black bg-slate-50 border border-slate-200 rounded-xl outline-none cursor-pointer focus:ring-4 focus:ring-indigo-500/10 transition-all appearance-none hover:bg-slate-100">
                         {classNames.map(cn => (
                           <option key={cn} value={cn}>
                               {cn === 'all' ? 'すべてのクラス' : `${cn}組`}
                           </option>
                       ))}
                    </select>
                </div>
                
                {/* Result Feedback */}
                {scanResult.message && (
                    <div className={`mx-6 mt-4 flex items-center gap-3 p-4 rounded-xl text-sm font-bold border ${scanResult.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-100' : 'bg-red-50 text-red-800 border-red-100'}`}>
                        {scanResult.type === 'success' ? <CheckCircleIcon className="w-5 h-5"/> : <ExclamationTriangleIcon className="w-5 h-5"/>}
                        <span>{scanResult.message}</span>
                    </div>
                )}

                 <div className="flex-grow overflow-y-auto scroll-container px-4 lg:px-6 py-4">
                    {/* Desktop Table View */}
                    <table className="w-full text-sm text-left hidden md:table border-separate border-spacing-y-1">
                        <thead className="bg-white sticky top-0 z-10">
                            <tr className="text-slate-400">
                                <th className="px-3 py-2 font-black text-[10px] uppercase tracking-widest bg-white">生徒</th>
                                <th className="px-3 py-2 font-black text-[10px] uppercase tracking-widest bg-white w-32">点数/評価</th>
                            </tr>
                        </thead>
                        <tbody className="animate-fade-in">
                           {studentsToDisplay.map(student => (
                                <tr key={student.id} className="group hover:bg-slate-50 transition-all">
                                    <td className="px-3 py-3 border-y border-l border-transparent rounded-l-xl">
                                        <div className="flex items-center gap-3">
                                             <div className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shadow-sm bg-slate-100 text-slate-500">
                                                {student.studentNumber}
                                            </div>
                                            <div>
                                                <div className="flex items-baseline gap-2">
                                                    <span className="text-[10px] text-slate-400 font-bold uppercase">{student.className}組</span>
                                                    <span className="font-bold text-slate-700">{student.name}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-3 py-3 border-y border-r border-transparent rounded-r-xl">
                                        <select 
                                            value={activeList?.scores[student.id] || ''}
                                            onChange={e => activeGradingListId && onSetScore(activeGradingListId, student.id, e.target.value)}
                                            className="block w-full p-2 border border-slate-200 rounded-lg shadow-sm bg-white text-slate-900 font-bold text-center outline-none focus:ring-2 focus:ring-indigo-500"
                                            disabled={!activeList?.possibleScores.length}
                                        >
                                            <option value="">-</option>
                                            {activeList?.possibleScores.filter(s => s).map(s => <option key={s} value={s}>{s}</option>)}
                                        </select>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-3 pb-20">
                        {studentsToDisplay.map(student => (
                            <div key={student.id} className="border border-slate-100 rounded-2xl p-4 flex items-center justify-between bg-white shadow-sm">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{student.className}-{student.studentNumber}</span>
                                        <span className="font-bold text-slate-800 text-sm">{student.name}</span>
                                    </div>
                                </div>
                                <div>
                                    <select 
                                        value={activeList?.scores[student.id] || ''}
                                        onChange={e => activeGradingListId && onSetScore(activeGradingListId, student.id, e.target.value)}
                                        className="block w-24 p-2 border border-slate-200 rounded-xl shadow-sm bg-slate-50 text-slate-900 font-bold text-center outline-none"
                                        disabled={!activeList?.possibleScores.length}
                                    >
                                        <option value="">-</option>
                                        {activeList?.possibleScores.filter(s => s).map(s => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Mobile FAB */}
            <button
                onClick={() => {
                    if (audioRef.current && settings.playSound && settings.soundEffect !== 'none') {
                        audioRef.current.load();
                    }
                    setIsCameraScannerOpen(true);
                }}
                className="lg:hidden fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-2xl shadow-indigo-500/40 flex items-center justify-center z-30 active:scale-90 transition-transform hover:bg-indigo-700"
                aria-label="カメラを起動"
            >
                <CameraIcon className="w-7 h-7" />
            </button>
            
            <CameraScannerModal
                isOpen={isCameraScannerOpen}
                onClose={async () => setIsCameraScannerOpen(false)}
                onScanStudent={handleScan}
                students={students}
                settings={settings}
                onSettingsChange={onSettingsChange}
                scannerId="qr-reader-grading"
                title={`QRコードスキャナー (${selectedScore}で採点中)`}
                activeList={activeList}
            />
        </div>
    );
};

export default GradingScanner;