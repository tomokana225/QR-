
import React, { useState, useCallback, useEffect } from 'react';
import { Student, SubmissionList, AppSettings } from '../types';
import { PlusIcon, TrashIcon, CameraIcon, CheckCircleIcon, ArrowPathIcon, DocumentArrowDownIcon, ListBulletIcon, Squares2x2Icon, ChevronRightIcon, ChevronLeftIcon, Cog6ToothIcon, ExclamationTriangleIcon, CalendarIcon } from './Icons';
import CameraScannerModal from './CameraScannerModal';

const CalendarWidget: React.FC<{
    currentDate: Date;
    onDateSelect: (date: Date) => void;
    submissionDates: Set<string>;
}> = ({ currentDate, onDateSelect, submissionDates }) => {
    const [viewDate, setViewDate] = useState(new Date(currentDate));

    useEffect(() => {
        setViewDate(new Date(currentDate));
    }, [currentDate]);

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const days = new Date(year, month + 1, 0).getDate();
        const firstDay = new Date(year, month, 1).getDay();
        return { days, firstDay };
    };

    const { days, firstDay } = getDaysInMonth(viewDate);
    const monthYear = viewDate.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' });

    const changeMonth = (delta: number) => {
        setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + delta, 1));
    };

    const isToday = (d: number) => {
        const today = new Date();
        return d === today.getDate() && viewDate.getMonth() === today.getMonth() && viewDate.getFullYear() === today.getFullYear();
    };

    const isSelected = (d: number) => {
        return d === currentDate.getDate() && viewDate.getMonth() === currentDate.getMonth() && viewDate.getFullYear() === currentDate.getFullYear();
    };

    const hasData = (d: number) => {
        const dateStr = new Date(viewDate.getFullYear(), viewDate.getMonth(), d).toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' });
        return submissionDates.has(dateStr);
    };

    const handleDayClick = (d: number) => {
        onDateSelect(new Date(viewDate.getFullYear(), viewDate.getMonth(), d));
    };

    return (
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
            <div className="flex justify-between items-center mb-4">
                <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-slate-100 rounded-full"><ChevronLeftIcon className="w-4 h-4 text-slate-500"/></button>
                <span className="text-sm font-bold text-slate-700">{monthYear}</span>
                <button onClick={() => changeMonth(1)} className="p-1 hover:bg-slate-100 rounded-full"><ChevronRightIcon className="w-4 h-4 text-slate-500"/></button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs">
                {['日','月','火','水','木','金','土'].map((d, i) => (
                    <div key={i} className={`font-bold ${i===0?'text-red-400':i===6?'text-blue-400':'text-slate-400'}`}>{d}</div>
                ))}
                {Array.from({length: firstDay}).map((_, i) => <div key={`empty-${i}`}></div>)}
                {Array.from({length: days}).map((_, i) => {
                    const d = i + 1;
                    const selected = isSelected(d);
                    const today = isToday(d);
                    const data = hasData(d);
                    return (
                        <button 
                            key={d} 
                            onClick={() => handleDayClick(d)}
                            className={`
                                h-8 w-8 rounded-full flex items-center justify-center relative font-medium transition-all
                                ${selected ? 'bg-indigo-600 text-white shadow-md' : 'hover:bg-indigo-50 text-slate-700'}
                                ${today && !selected ? 'border border-indigo-200 bg-indigo-50/50' : ''}
                            `}
                        >
                            {d}
                            {data && !selected && <div className="absolute bottom-1 w-1 h-1 bg-indigo-500 rounded-full"></div>}
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

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
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
    const [isMenuOpen, setIsMenuOpen] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());
    
    // 手動入力・スキャン結果のフィードバック用
    const [scanResult, setScanResult] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    useEffect(() => {
        setIsMenuOpen(window.innerWidth >= 1024);
    }, []);

    // フィードバックを一定時間で消す
    useEffect(() => {
        if (scanResult) {
            const timer = setTimeout(() => setScanResult(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [scanResult]);

    // 日付フォーマットヘルパー
    const getDailyListName = (date: Date) => `提出 (${date.toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' })})`;

    // カレンダーの日付変更時の処理
    const handleDateSelect = useCallback((date: Date) => {
        setCurrentDate(date);
        const listName = getDailyListName(date);
        const existingList = submissionLists.find(l => l.name === listName);

        if (existingList) {
            onSetActiveSubmissionListId(existingList.id);
        } else {
            // 自動作成ロジック（実際にはApp.tsxのcreate関数を呼ぶ必要があるが、ここでは親から渡された関数がモーダルを開く仕様のため、
            // 簡易的に「なければ作成を促す」か、可能なら直接作成APIを叩く設計が良いが、
            // 現在のI/FではonCreateSubmissionListはモーダルを開くだけ。
            // ユーザー体験向上のため、リストがなければ「新規作成」フローへ誘導するか、
            // もしくはApp.tsx側で引数付き作成に対応させるのがベスト。
            // 今回は既存のI/Fを守りつつ、リストがない場合は「リストがありません」状態にする
            onSetActiveSubmissionListId(''); 
            
            // 自動作成の提案（確認なしで作成できればベストだが、今回はCreateModalを経由）
            // ここで本当は直接作成したいが、App.tsxのI/F制限のため、
            // 「この日付のリストを作成しますか？」などの確認を出せると良い。
            // 今回はシンプルに、リスト選択状態を空にして、ユーザーに作成ボタンを押させるか、
            // あるいはリストがない日付を選んだ瞬間に「新規作成」ボタンが目立つようにする。
        }
    }, [submissionLists, onSetActiveSubmissionListId]);

    // リストが存在する日付のセットを作成
    const submissionDates = new Set(submissionLists.map(l => {
        // "提出 (YYYY/MM/DD)" 形式から日付を抽出、あるいは単にリスト名全体をキーにする
        const match = l.name.match(/提出 \((\d{4}\/\d{2}\/\d{2})\)/);
        return match ? match[1] : null;
    }).filter(Boolean) as string[]);
    
    // Auto-create/select wrapper for calendar interaction
    // Since we cannot modify App.tsx interfaces easily to add direct create, we will inject a small logic:
    // If user selects a date and list doesn't exist, we will try to find it. 
    // If activeSubmissionListId becomes empty after date select, it means no list.
    
    const activeList = submissionLists.find(l => l.id === activeSubmissionListId);
    const submissionMap = new Map<string, number>(activeList?.submissions.map(s => [s.studentId, s.timestamp]) || []);

    const handleSubmissionScan = useCallback((student: Student, isDuplicate?: boolean) => {
        if (isDuplicate) return;
        playSuccessSound();
        onSetSubmission(student.id, Date.now());
        return { success: true, message: `${student.name}さんを承認しました`};
    }, [onSetSubmission, playSuccessSound]);

    const handleBarcodeSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const code = barcodeInput.trim();
        if (!code) return;

        const student = students.find(s => s.randomCode === code);
        if (student) {
            if (submissionMap.has(student.id)) {
                setScanResult({ type: 'error', message: `${student.name}さんは既に提出済みです` });
            } else {
                handleSubmissionScan(student, false);
                setScanResult({ type: 'success', message: `${student.name}さんを承認しました` });
            }
        } else {
            setScanResult({ type: 'error', message: `未登録のコードです: ${code}` });
        }
        setBarcodeInput('');
    };

    const studentsToDisplay = students.filter(s => selectedClass === 'all' || s.className === selectedClass)
        .sort((a,b) => {
            if (a.className !== b.className) return a.className.localeCompare(b.className, undefined, {numeric:true});
            return parseInt(a.studentNumber) - parseInt(b.studentNumber);
        });

    const handleToggleSubmission = (studentId: string, currentTimestamp: number | undefined) => {
        if (!currentTimestamp) {
            playSuccessSound();
        }
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

    // カレンダーの日付が選ばれたときに、リストがないなら作成ボタンを表示するためのフラグ
    const isDailyListMissing = !activeList && activeSubmissionListId === '';
    const targetDailyListName = getDailyListName(currentDate);

    return (
        <div className="flex flex-col lg:flex-row gap-6 lg:gap-10 h-full relative">
            {/* Mobile Toggle Button */}
            <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="lg:hidden w-full bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex justify-between items-center text-slate-700 font-bold active:bg-slate-50 transition-colors"
            >
                <span className="flex items-center gap-2">
                    <Cog6ToothIcon className="w-5 h-5 text-indigo-500" />
                    カレンダー・操作メニュー
                </span>
                <ChevronRightIcon className={`w-5 h-5 transition-transform duration-300 ${isMenuOpen ? 'rotate-90' : ''}`} />
            </button>

            {/* サイドコントロール */}
            <div className={`w-full lg:w-80 flex-shrink-0 flex flex-col gap-6 transition-all duration-300 ${isMenuOpen ? 'block' : 'hidden lg:flex'}`}>
                
                {/* カレンダーウィジェット */}
                <CalendarWidget 
                    currentDate={currentDate} 
                    onDateSelect={handleDateSelect}
                    submissionDates={submissionDates}
                />

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
                    
                    {isDailyListMissing ? (
                         <div className="mb-4">
                            <p className="text-xs text-amber-600 font-bold mb-2">"{targetDailyListName}" は未作成です</p>
                            <button 
                                // ここでは簡易的にモーダルを開くが、理想は自動作成
                                onClick={onCreateSubmissionList} 
                                className="w-full py-3 bg-amber-500 text-white rounded-xl font-bold text-sm shadow-md hover:bg-amber-600 transition-all flex items-center justify-center gap-2"
                            >
                                <PlusIcon className="w-4 h-4"/> 作成する
                            </button>
                        </div>
                    ) : (
                        <div className="flex gap-2 mb-4">
                            <select 
                                value={activeSubmissionListId || ''} 
                                onChange={e => onSetActiveSubmissionListId(e.target.value)}
                                className="flex-grow p-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all cursor-pointer w-full min-w-0"
                            >
                                {submissionLists.length > 0 ? (
                                    submissionLists.map(l => <option key={l.id} value={l.id}>{l.name}</option>
                                ) : (
                                    <option value="">リストがありません</option>
                                )}
                            </select>
                            <button onClick={onCreateSubmissionList} className="p-4 bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-500/20 flex-shrink-0" title="新規リスト"><PlusIcon className="w-5 h-5"/></button>
                        </div>
                    )}

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

                {/* フィードバック表示エリア */}
                {scanResult && (
                    <div className={`mx-6 mt-4 flex items-center gap-3 p-4 rounded-xl text-sm font-bold border animate-fade-in ${scanResult.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-100' : 'bg-red-50 text-red-800 border-red-100'}`}>
                        {scanResult.type === 'success' ? <CheckCircleIcon className="w-5 h-5"/> : <ExclamationTriangleIcon className="w-5 h-5"/>}
                        <span>{scanResult.message}</span>
                    </div>
                )}
                
                <div className="flex-grow overflow-y-auto scroll-container px-4 lg:px-6 py-4">
                    {viewMode === 'list' ? (
                        <table className="w-full text-sm text-left border-separate border-spacing-y-1">
                            <thead className="bg-white sticky top-0 z-10">
                                <tr className="text-slate-400">
                                    {/* ラベルの幅や余白を調整して重なりを防止 */}
                                    <th className="px-1 md:px-3 py-2 font-black text-[10px] uppercase tracking-widest bg-white w-20 md:w-auto whitespace-nowrap">生徒</th>
                                    <th className="px-1 md:px-3 py-2 font-black text-[10px] uppercase tracking-widest bg-white text-center w-24 md:w-auto whitespace-nowrap">提出ステータス</th>
                                    <th className="px-1 md:px-3 py-2 font-black text-[10px] uppercase tracking-widest text-right hidden sm:table-cell bg-white whitespace-nowrap">確認時間</th>
                                </tr>
                            </thead>
                            <tbody className="animate-fade-in">
                                {studentsToDisplay.map(s => {
                                    const timestamp = submissionMap.get(s.id);
                                    return (
                                        <tr key={s.id} className={`group transition-all ${timestamp ? 'bg-emerald-50/20' : 'bg-transparent hover:bg-slate-50'}`}>
                                            <td className="px-1 md:px-3 py-2 rounded-l-lg border-y border-l border-transparent">
                                                <div className="flex items-center gap-2 md:gap-3">
                                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shadow-sm flex-shrink-0 ${timestamp ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                                                        {s.studentNumber}
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <div className="flex flex-col md:flex-row md:items-baseline gap-0.5 md:gap-2">
                                                            <span className="text-[9px] md:text-[10px] text-slate-400 font-bold uppercase whitespace-nowrap">{s.className}組</span>
                                                            {/* 名前を改行許可・フォントサイズ縮小で省略防止 */}
                                                            <span className="font-bold text-slate-700 text-xs break-words leading-tight">{s.name}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-1 md:px-3 py-2 border-y border-transparent text-center">
                                                <button
                                                    onClick={() => handleToggleSubmission(s.id, timestamp)}
                                                    className={`
                                                        px-2 md:px-4 py-1.5 rounded-full text-[10px] md:text-xs font-bold transition-all border shadow-sm
                                                        flex items-center gap-1.5 mx-auto justify-center min-w-[80px] md:min-w-[100px]
                                                        ${timestamp 
                                                            ? 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 group/btn' 
                                                            : 'bg-white text-slate-400 border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200'}
                                                    `}
                                                    title={timestamp ? "クリックして提出を取り消し" : "クリックして提出承認"}
                                                >
                                                    <div className={`w-2 h-2 rounded-full ${timestamp ? 'bg-emerald-500 group-hover/btn:bg-red-500' : 'bg-slate-300'}`}></div>
                                                    <span className="group-hover/btn:hidden">{timestamp ? '提出済み' : '未提出'}</span>
                                                    <span className="hidden group-hover/btn:inline">{timestamp ? '取り消す' : '承認する'}</span>
                                                </button>
                                            </td>
                                            <td className="px-1 md:px-3 py-2 rounded-r-lg border-y border-r border-transparent text-right hidden sm:table-cell">
                                                <div className="text-[10px] text-slate-400 font-mono">
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
                                        className={`relative p-3 md:p-4 rounded-2xl border transition-all cursor-pointer hover:scale-[1.02] active:scale-95 flex flex-col h-full ${timestamp ? 'bg-emerald-50 border-emerald-100 shadow-emerald-100' : 'bg-white border-slate-100 hover:border-indigo-200 hover:shadow-lg hover:shadow-indigo-500/10'}`}
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="text-[10px] font-black bg-white/50 px-2 py-1 rounded text-slate-500 whitespace-nowrap">{s.className}-{s.studentNumber}</span>
                                            {timestamp && <CheckCircleIcon className="w-5 h-5 text-emerald-500 flex-shrink-0" />}
                                        </div>
                                        {/* 名前を省略せず、複数行表示で全て見せる */}
                                        <h4 className="font-bold text-slate-800 text-xs mb-1 break-words leading-tight flex-grow">{s.name}</h4>
                                        <p className={`text-[10px] font-bold mt-2 ${timestamp ? 'text-emerald-600' : 'text-slate-400'}`}>
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
