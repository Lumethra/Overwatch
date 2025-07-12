'use client';

import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { ChevronDownIcon, ChevronUpIcon, RectangleStackIcon } from '@heroicons/react/24/outline';

interface GpuInfo {
    name: string;
    driver_version: string;
    memory_total: number;
    memory_used: number;
    memory_free: number;
    temperature: number;
    power_usage: number;
    utilization: number;
    fan_speed: number;
    gpu_type: string;
}

export default function GpuCard() {
    const [gpu, setGpu] = useState<GpuInfo | null>(null);
    const [loading, setLoading] = useState(true);
    const [showDetails, setShowDetails] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchGpu = async () => {
            try {
                const data = await invoke<GpuInfo>('get_gpu_info');
                setGpu(data);
                setError(null);
            } catch (err) {
                console.error('GPU fetch failed:', err);
                setError(err as string);
                setGpu(null);
            }
            setLoading(false);
        };

        fetchGpu();
        const timer = setInterval(fetchGpu, 1000); // Update every 1 second

        return () => clearInterval(timer);
    }, []);

    // Simple color logic - just inline it
    const getUsageColor = (val: number) => {
        if (val > 80) return '#ef4444';
        if (val > 60) return '#f59e0b';
        return '#10b981';
    };

    const getUsageTextColor = (val: number) => {
        if (val > 80) return 'text-red-500';
        if (val > 60) return 'text-orange-500';
        return 'text-green-500';
    };

    if (loading) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow duration-300">
                <div className="flex items-center mb-4">
                    <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-lg animate-pulse mr-3"></div>
                    <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-32 animate-pulse"></div>
                </div>
                <div className="animate-pulse space-y-3">
                    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
                    <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
                    <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-full"></div>
                </div>
            </div>
        );
    }

    if (error || !gpu) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-red-200 dark:border-red-800 hover:shadow-xl transition-shadow duration-300">
                <div className="flex items-center mb-4">
                    <RectangleStackIcon className="w-8 h-8 text-red-500 mr-3" />
                    <h2 className="text-xl font-bold text-red-600">GPU Information</h2>
                </div>
                <p className="text-gray-600 dark:text-gray-400">
                    {error || 'Could not load GPU info'}
                </p>
            </div>
        );
    }

    const memUsedGB = gpu.memory_used / (1024 * 1024 * 1024);
    const memTotalGB = gpu.memory_total / (1024 * 1024 * 1024);
    const memPct = gpu.memory_total ? (gpu.memory_used / gpu.memory_total) * 100 : 0;
    const isIntegrated = gpu.gpu_type.includes('Integrated');

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-lg flex items-center justify-center mr-3">
                        <RectangleStackIcon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">GPU</h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{gpu.gpu_type}</p>
                    </div>
                </div>
                {!isIntegrated && (
                    <div className={`text-2xl font-bold ${getUsageTextColor(gpu.utilization)}`}>
                        {gpu.utilization}%
                    </div>
                )}
            </div>

            {!isIntegrated && (
                <div className="mb-4">
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all duration-700 ease-out"
                            style={{
                                width: `${Math.min(gpu.utilization, 100)}%`,
                                backgroundColor: getUsageColor(gpu.utilization)
                            }}
                        />
                    </div>
                </div>
            )}

            <div className="grid grid-cols-2 gap-4 mb-4">
                {gpu.memory_total > 0 && (
                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Memory</p>
                        <p className="text-lg font-bold text-gray-900 dark:text-white">
                            {memTotalGB.toFixed(1)} GB
                        </p>
                    </div>
                )}
                {!isIntegrated && gpu.temperature > 0 ? (
                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Temperature</p>
                        <p className={`text-lg font-bold ${getUsageTextColor(gpu.temperature)}`}>
                            {gpu.temperature}°C
                        </p>
                    </div>
                ) : (
                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Type</p>
                        <p className="text-sm font-bold text-gray-900 dark:text-white">
                            {isIntegrated ? 'Integrated' : 'Discrete'}
                        </p>
                    </div>
                )}
            </div>

            <button
                onClick={() => setShowDetails(!showDetails)}
                className="w-full flex items-center justify-center py-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors duration-200"
            >
                <span className="text-sm font-medium mr-1">
                    {showDetails ? 'Show Less' : 'Show Details'}
                </span>
                {showDetails ? (
                    <ChevronUpIcon className="w-4 h-4" />
                ) : (
                    <ChevronDownIcon className="w-4 h-4" />
                )}
            </button>

            {showDetails && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4 animate-in slide-in-from-top duration-300">
                    <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-1">Graphics Card</label>
                        <p className="text-sm text-gray-900 dark:text-white font-mono bg-gray-50 dark:bg-gray-700 p-2 rounded">{gpu.name}</p>
                    </div>

                    <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-1">Driver Version</label>
                        <p className="text-sm text-gray-900 dark:text-white font-mono bg-gray-50 dark:bg-gray-700 p-2 rounded">{gpu.driver_version}</p>
                    </div>

                    {gpu.memory_total > 0 && memPct > 0 && (
                        <div>
                            <label className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-3">Memory Usage</label>
                            <div className="flex items-center space-x-3">
                                <span className="text-xs font-medium text-gray-600 dark:text-gray-300 w-20">VRAM</span>
                                <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                                    <div
                                        className="h-3 rounded-full transition-all duration-500 ease-in-out"
                                        style={{
                                            width: `${Math.min(memPct, 100)}%`,
                                            backgroundColor: getUsageColor(memPct)
                                        }}
                                    />
                                </div>
                                <span className="text-xs font-medium w-12 text-right text-gray-600 dark:text-gray-300">
                                    {memPct.toFixed(0)}%
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                {memUsedGB.toFixed(1)} GB / {memTotalGB.toFixed(1)} GB
                            </p>
                        </div>
                    )}

                    {!isIntegrated && (gpu.power_usage > 0 || gpu.fan_speed > 0) && (
                        <div className="grid grid-cols-2 gap-4">
                            {gpu.power_usage > 0 && (
                                <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Power</p>
                                    <p className="text-lg font-bold text-gray-900 dark:text-white">{gpu.power_usage}W</p>
                                </div>
                            )}
                            {gpu.fan_speed > 0 && (
                                <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Fan Speed</p>
                                    <p className="text-lg font-bold text-gray-900 dark:text-white">{gpu.fan_speed}%</p>
                                </div>
                            )}
                        </div>
                    )}

                    {isIntegrated && (
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                            <p className="text-sm text-blue-700 dark:text-blue-300">
                                <strong>Note:</strong> Ewwwww, integrated graphics card, try getting a real GPU, I am trying too, I also have an integrated graphics card, I know, this is a skill issue.
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
