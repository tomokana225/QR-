import React from 'react';
import { AppSettings } from '../types';
import { DocumentArrowDownIcon, DocumentArrowUpIcon, CloudArrowUpIcon, CloudArrowDownIcon, SparklesIcon } from './Icons';

const SettingsPage: React.FC<{
    settings: AppSettings;
    onSettingsChange: (newSettings: Partial<AppSettings>) => void;
    onExportData: () => void;
    onImportData: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onCloudUpload: () => void;
    onCloudDownload: () => void;
    syncStatus: string;
    onLoadMockData: () => void;
}> = ({ settings, onSettingsChange, onExportData, onImportData, onCloudUpload, onCloudDownload, syncStatus, onLoadMockData }) => {
    
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
    
    return (
        <div className="max-w-4xl mx-auto space-y-8 pb-12">
            <h2 className="text-2xl font-bold text-slate-800">詳細設定</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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

            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                <h3 className="text-lg font-semibold mb-6 text-slate-700">データ同期と管理</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <p className="text-xs text-slate-500 leading-relaxed font-medium">
                            JSONBin.ioと同期して、PCとスマートフォンなど複数の端末間で名簿や記録を共有できます。
                        </p>
                        <input type="password" value={settings.syncApiKey} onChange={e => onSettingsChange({ syncApiKey: e.target.value })} placeholder="Bin API Key" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none"/>
                        <input type="text" value={settings.syncId} onChange={e => onSettingsChange({ syncId: e.target.value })} placeholder="Bin ID" className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none"/>
                        <div className="flex gap-2 pt-2">
                            <button onClick={onCloudUpload} className="flex-1 py-3 bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-slate-700">
                                <CloudArrowUpIcon className="w-4 h-4" /> アップロード
                            </button>
                            <button onClick={onCloudDownload} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-indigo-500">
                                <CloudArrowDownIcon className="w-4 h-4" /> ダウンロード
                            </button>
                        </div>
                    </div>
                    <div className="space-y-4 border-l border-slate-100 pl-8">
                        <p className="text-xs text-slate-500 font-medium mb-4">バックアップや試用データの操作</p>
                        <button onClick={onExportData} className="w-full py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-center gap-2 hover:bg-slate-50 transition-all">
                            <DocumentArrowDownIcon className="w-4 h-4" /> データをエクスポート
                        </button>
                        <label className="w-full py-3 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-center gap-2 hover:bg-slate-50 transition-all cursor-pointer">
                            <DocumentArrowUpIcon className="w-4 h-4" /> データをインポート
                            <input type="file" accept=".json" onChange={onImportData} className="hidden"/>
                        </label>
                        <div className="pt-2 border-t border-slate-50 mt-4">
                            <button 
                                onClick={onLoadMockData}
                                className="w-full py-3 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-indigo-100 transition-all"
                            >
                                <SparklesIcon className="w-4 h-4" /> デモデータを追加生成
                            </button>
                        </div>
                    </div>
                </div>
                <div className="mt-8 pt-6 border-t border-slate-50 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="text-xs text-slate-400 font-medium">{syncStatus}</span>
                </div>
            </div>
        </div>
    );
};

export default SettingsPage;