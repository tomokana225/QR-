
import React from 'react';
import { AppSettings, FirebaseConfig } from '../types';
import { DocumentArrowDownIcon, DocumentArrowUpIcon, CloudArrowUpIcon, CloudArrowDownIcon, SparklesIcon } from './Icons';
import { signOut } from '../utils/firebase';
import { User } from 'firebase/auth';

const SettingsPage: React.FC<{
    settings: AppSettings;
    onSettingsChange: (newSettings: Partial<AppSettings>) => void;
    onExportData: () => void;
    onImportData: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onCloudUpload: () => void;
    onCloudDownload: () => void;
    syncStatus: string;
    onLoadMockData: () => void;
    user: User | null;
}> = ({ settings, onSettingsChange, onExportData, onImportData, onCloudUpload, onCloudDownload, syncStatus, onLoadMockData, user }) => {
    
    const handleCustomSoundUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                const dataUrl = e.target?.result as string;
                onSettingsChange({ customSound: dataUrl, soundEffect: 'custom' });
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleFirebaseConfigChange = (key: keyof FirebaseConfig, value: string) => {
        onSettingsChange({
            firebaseConfig: {
                ...settings.firebaseConfig,
                [key]: value
            }
        });
    };

    const handleLogout = async () => {
        try {
            await signOut();
            // App.tsxのAuthリスナーが状態変更を検知してログイン画面へ遷移します
        } catch (error: any) {
            alert('ログアウト失敗: ' + error.message);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-12">
            <h2 className="text-2xl font-bold text-slate-800">詳細設定</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* スキャン設定 */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <h3 className="text-lg font-semibold mb-4 text-slate-700 flex items-center gap-2">
                        スキャン設定
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase mb-1">スキャン枠の大きさ</label>
                            <select value={settings.scannerBoxSize} onChange={e => onSettingsChange({ scannerBoxSize: Number(e.target.value)})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none">
                                <option value={150}>小 (150px)</option>
                                <option value={200}>中 (200px)</option>
                                <option value={250}>大 (250px)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase mb-1">スキャンの間隔</label>
                            <select value={settings.scanCooldown} onChange={e => onSettingsChange({ scanCooldown: Number(e.target.value)})} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none">
                                <option value={500}>短い (0.5秒)</option>
                                <option value={1000}>標準 (1秒)</option>
                                <option value={2000}>長い (2秒)</option>
                            </select>
                        </div>
                        <div className="flex items-center gap-3 pt-2">
                            <input type="checkbox" id="highRes" checked={settings.scannerHighRes} onChange={e => onSettingsChange({ scannerHighRes: e.target.checked })} className="w-4 h-4 rounded text-indigo-600"/>
                            <label htmlFor="highRes" className="text-sm text-slate-600 font-medium">高解像度モード</label>
                        </div>
                        <div className="flex items-center gap-3">
                            <input type="checkbox" id="cameraFlip" checked={settings.isCameraFlipped} onChange={e => onSettingsChange({ isCameraFlipped: e.target.checked })} className="w-4 h-4 rounded text-indigo-600"/>
                            <label htmlFor="cameraFlip" className="text-sm text-slate-600 font-medium">カメラを左右反転</label>
                        </div>
                    </div>
                </div>

                {/* 音響設定 */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                    <h3 className="text-lg font-semibold mb-4 text-slate-700">音響・通知</h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <label className="text-sm text-slate-600 font-medium">効果音を鳴らす</label>
                            <input type="checkbox" checked={settings.playSound} onChange={e => onSettingsChange({ playSound: e.target.checked })} className="w-4 h-4 text-indigo-600"/>
                        </div>
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase mb-1">音量</label>
                            <input type="range" min="0" max="1" step="0.1" value={settings.volume} onChange={e => onSettingsChange({ volume: Number(e.target.value) })} className="w-full accent-indigo-600"/>
                        </div>
                        <div>
                            <label className="block text-xs font-black text-slate-400 uppercase mb-1">効果音の種類</label>
                            <select value={settings.soundEffect} onChange={e => onSettingsChange({ soundEffect: e.target.value as any })} className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none">
                                <option value="ping">ピコン (Ping)</option>
                                <option value="chime">チャイム</option>
                                <option value="click">クリック</option>
                                <option value="custom">カスタム音源</option>
                            </select>
                        </div>
                        {settings.soundEffect === 'custom' && (
                            <input type="file" accept="audio/*" onChange={handleCustomSoundUpload} className="w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-indigo-50 file:text-indigo-700"/>
                        )}
                    </div>
                </div>
            </div>

            {/* クラウド同期 (Firebase) */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-amber-100 rounded-lg text-amber-600">
                        <CloudArrowUpIcon className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-700">クラウド同期 (Firebase)</h3>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* 設定フォーム */}
                    <div className="space-y-4">
                        <p className="text-xs text-slate-500 font-medium">
                            Firebaseプロジェクトの構成情報を入力してください。設定はブラウザに保存されます。
                        </p>
                        <div className="grid grid-cols-1 gap-3">
                            <input type="text" value={settings.firebaseConfig?.apiKey || ''} onChange={e => handleFirebaseConfigChange('apiKey', e.target.value)} placeholder="API Key" className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none font-mono"/>
                            <input type="text" value={settings.firebaseConfig?.authDomain || ''} onChange={e => handleFirebaseConfigChange('authDomain', e.target.value)} placeholder="Auth Domain" className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none font-mono"/>
                            <input type="text" value={settings.firebaseConfig?.projectId || ''} onChange={e => handleFirebaseConfigChange('projectId', e.target.value)} placeholder="Project ID" className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none font-mono"/>
                            <input type="text" value={settings.firebaseConfig?.storageBucket || ''} onChange={e => handleFirebaseConfigChange('storageBucket', e.target.value)} placeholder="Storage Bucket" className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none font-mono"/>
                            <input type="text" value={settings.firebaseConfig?.messagingSenderId || ''} onChange={e => handleFirebaseConfigChange('messagingSenderId', e.target.value)} placeholder="Messaging Sender ID" className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none font-mono"/>
                            <input type="text" value={settings.firebaseConfig?.appId || ''} onChange={e => handleFirebaseConfigChange('appId', e.target.value)} placeholder="App ID" className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs outline-none font-mono"/>
                        </div>
                    </div>

                    {/* 認証・操作エリア */}
                    <div className="space-y-6 border-l border-slate-100 pl-0 lg:pl-8 pt-6 lg:pt-0">
                         {user ? (
                            <div className="space-y-4">
                                <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100">
                                    <p className="text-xs text-emerald-600 font-bold mb-1">ログイン中</p>
                                    <p className="text-sm font-medium text-emerald-800 break-all">{user.email}</p>
                                    <button onClick={handleLogout} className="mt-3 text-xs text-red-500 hover:text-red-700 underline">ログアウト</button>
                                </div>
                                
                                <div className="flex gap-2">
                                    <button onClick={onCloudUpload} className="flex-1 py-3 bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-slate-700 shadow-lg shadow-slate-200">
                                        <CloudArrowUpIcon className="w-4 h-4" /> 強制アップロード
                                    </button>
                                    <button onClick={onCloudDownload} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-indigo-500 shadow-lg shadow-indigo-200">
                                        <CloudArrowDownIcon className="w-4 h-4" /> 強制ダウンロード
                                    </button>
                                </div>
                                <p className="text-[10px] text-slate-400 text-center mt-2">
                                    ※通常は自動的に同期されます。<br/>手動操作はデータの整合性が取れない場合にのみ使用してください。
                                </p>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-full">
                                <p className="text-sm text-slate-400">設定を変更するにはログインが必要です</p>
                            </div>
                        )}
                    </div>
                </div>
                 <div className="mt-6 pt-4 border-t border-slate-50 flex items-center gap-2 justify-end">
                    <div className={`w-2 h-2 rounded-full ${syncStatus.includes('エラー') || syncStatus.includes('未') ? 'bg-amber-500' : 'bg-green-500'}`}></div>
                    <span className="text-xs text-slate-400 font-medium">{syncStatus}</span>
                </div>
            </div>

            {/* ファイル操作（バックアップ） */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-semibold mb-4 text-slate-700">ローカルバックアップ</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button onClick={onExportData} className="w-full py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-center gap-2 hover:bg-slate-50 transition-all">
                        <DocumentArrowDownIcon className="w-4 h-4" /> ファイルに書き出し
                    </button>
                    <label className="w-full py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-center gap-2 hover:bg-slate-50 transition-all cursor-pointer">
                        <DocumentArrowUpIcon className="w-4 h-4" /> ファイルから読み込み
                        <input type="file" accept=".json" onChange={onImportData} className="hidden"/>
                    </label>
                </div>
                <div className="pt-6 border-t border-slate-50 mt-6">
                     <button 
                        onClick={onLoadMockData}
                        className="w-full py-3 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-indigo-100 transition-all"
                    >
                        <SparklesIcon className="w-4 h-4" /> デモデータを追加生成
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SettingsPage;
