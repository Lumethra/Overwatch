'use client';

import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { ChevronDownIcon, ChevronUpIcon, CpuChipIcon } from '@heroicons/react/24/outline';

interface CpuInfo {
    brand: string;
    frequency: number;
    cores: number;
    logical_cores: number;
    usage: number;
    per_core_usage: number[];
    temperature: number;
    temp_available: boolean;
    vendor: string;
    architecture: string;
    max_frequency: number;
    cache_l1: string;
    cache_l2: string;
    cache_l3: string;
    socket: string;
    process_node: string;
    uptime: string;
}

export default function CpuCard() {
    const [processorInfo, setProcessorInfo] = useState<CpuInfo | null>(null);
    const [isLoadingCpuInfo, setIsLoadingCpuInfo] = useState(true);
    const [showDetailedCoreInfo, setShowDetailedCoreInfo] = useState(false);
    const refreshRate = 1000;

    useEffect(() => {
        const getProcessorData = async () => {
            try {
                const cpuData = await invoke<CpuInfo>('get_cpu_info');
                setProcessorInfo(cpuData);
            } catch (err) {
                setProcessorInfo(null);
            }
            setIsLoadingCpuInfo(false);
        };

        getProcessorData();
        const refreshInterval = setInterval(getProcessorData, refreshRate);

        return () => clearInterval(refreshInterval);
    }, []);
    const getWorkloadColor = (usage: number) => {
        if (usage > 80) return '#ef4444';
        if (usage > 60) return '#f59e0b';
        return '#10b981';
    };

    const getWorkloadTextColor = (usage: number) => {
        if (usage > 80) return 'text-red-500';
        if (usage > 60) return 'text-orange-500';
        return 'text-green-500';
    };

    const getTempColor = (temp: number) => {
        if (temp > 80) return '#ef4444';
        if (temp > 70) return '#f59e0b';
        if (temp > 60) return '#eab308';
        return '#10b981';
    };

    const getTempTextColor = (temp: number) => {
        if (temp > 80) return 'text-red-500';
        if (temp > 70) return 'text-orange-500';
        if (temp > 60) return 'text-yellow-500';
        return 'text-green-500';
    };

    if (isLoadingCpuInfo) {
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

    if (!processorInfo) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-red-200 dark:border-red-800 hover:shadow-xl transition-shadow duration-300">
                <div className="flex items-center mb-4">
                    <CpuChipIcon className="w-8 h-8 text-red-500 mr-3" />
                    <h2 className="text-xl font-bold text-red-600">CPU Information</h2>
                </div>
                <p className="text-gray-600 dark:text-gray-400">Failed to load processor information</p>
            </div>
        );
    }

    const currentCpuLoad = Math.min(processorInfo.usage, 100);
    const usageBarColor = getWorkloadColor(processorInfo.usage);
    const usageDisplayColor = getWorkloadTextColor(processorInfo.usage);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-shadow duration-300">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mr-3">
                        <CpuChipIcon className="w-5 h-5 text-white" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">CPU</h2>
                </div>
                <div className={`text-2xl font-bold ${usageDisplayColor}`}>
                    {processorInfo.usage.toFixed(1)}%
                </div>
            </div>

            <div className="mb-4">
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                    <div
                        className="h-full rounded-full transition-all duration-700 ease-out"
                        style={{
                            width: `${currentCpuLoad}%`,
                            backgroundColor: usageBarColor
                        }}
                    />
                </div>
            </div>

            <div className="grid grid-cols-4 gap-3 mb-4">
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Cores</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{processorInfo.cores}</p>
                </div>
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Threads</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{processorInfo.logical_cores}</p>
                </div>
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Frequency</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{processorInfo.frequency} MHz</p>
                </div>
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Temperature</p>
                    {processorInfo.temp_available ? (
                        <p className={`text-lg font-bold ${getTempTextColor(processorInfo.temperature)}`}>
                            {processorInfo.temperature.toFixed(0)}°C
                        </p>
                    ) : (
                        <p className="text-lg font-bold text-gray-500 dark:text-gray-400">N/A</p>
                    )}
                </div>
            </div>

            <button
                onClick={() => setShowDetailedCoreInfo(!showDetailedCoreInfo)}
                className="w-full flex items-center justify-center py-2 text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors duration-200"
            >
                <span className="text-sm font-medium mr-1">
                    {showDetailedCoreInfo ? 'Show Less' : 'Show Details'}
                </span>
                {showDetailedCoreInfo ? (
                    <ChevronUpIcon className="w-4 h-4" />
                ) : (
                    <ChevronDownIcon className="w-4 h-4" />
                )}
            </button>

            {showDetailedCoreInfo && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-4 animate-in slide-in-from-top duration-300">
                    <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-1">Processor</label>
                        <p className="text-sm text-gray-900 dark:text-white font-mono bg-gray-50 dark:bg-gray-700 p-2 rounded">{processorInfo.brand}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-1">Vendor</label>
                            <p className="text-sm text-gray-900 dark:text-white font-mono bg-gray-50 dark:bg-gray-700 p-2 rounded">{processorInfo.vendor}</p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-1">Architecture</label>
                            <p className="text-sm text-gray-900 dark:text-white font-mono bg-gray-50 dark:bg-gray-700 p-2 rounded">{processorInfo.architecture}</p>
                        </div>
                    </div>

                    {processorInfo.max_frequency > 0 && processorInfo.max_frequency !== processorInfo.frequency && (
                        <div>
                            <label className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-1">Max Boost Frequency</label>
                            <p className="text-sm text-gray-900 dark:text-white font-mono bg-gray-50 dark:bg-gray-700 p-2 rounded">{processorInfo.max_frequency} MHz</p>
                        </div>
                    )}

                    {(processorInfo.cache_l1 !== "Unknown" || processorInfo.cache_l2 !== "Unknown" || processorInfo.cache_l3 !== "Unknown") && (
                        <div className="grid grid-cols-3 gap-4">
                            {processorInfo.cache_l1 !== "Unknown" && (
                                <div>
                                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-1">L1 Cache</label>
                                    <p className="text-sm text-gray-900 dark:text-white font-mono bg-gray-50 dark:bg-gray-700 p-2 rounded">{processorInfo.cache_l1}</p>
                                </div>
                            )}
                            {processorInfo.cache_l2 !== "Unknown" && (
                                <div>
                                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-1">L2 Cache</label>
                                    <p className="text-sm text-gray-900 dark:text-white font-mono bg-gray-50 dark:bg-gray-700 p-2 rounded">{processorInfo.cache_l2}</p>
                                </div>
                            )}
                            {processorInfo.cache_l3 !== "Unknown" && (
                                <div>
                                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-1">L3 Cache</label>
                                    <p className="text-sm text-gray-900 dark:text-white font-mono bg-gray-50 dark:bg-gray-700 p-2 rounded">{processorInfo.cache_l3}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {processorInfo.socket !== "Unknown" && (
                        <div>
                            <label className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-1">Socket</label>
                            <p className="text-sm text-gray-900 dark:text-white font-mono bg-gray-50 dark:bg-gray-700 p-2 rounded">{processorInfo.socket}</p>
                        </div>
                    )}

                    <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-3">Individual Thread Usage ({processorInfo.logical_cores} threads)</label>
                        <div className="grid grid-cols-1 gap-2">
                            {processorInfo.per_core_usage.map((coreUsage: number, coreIndex: number) => {
                                const currentCoreLoad = Math.min(coreUsage, 100);
                                const coreWorkloadColor = getWorkloadColor(coreUsage);
                                const coreWorkloadTextColor = getWorkloadTextColor(coreUsage);

                                return (
                                    <div key={coreIndex} className="flex items-center space-x-3">
                                        <span className="text-xs font-medium text-gray-600 dark:text-gray-300 w-14">Thread {coreIndex + 1}</span>
                                        <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                            <div
                                                className="h-2 rounded-full transition-all duration-500 ease-in-out"
                                                style={{
                                                    width: `${currentCoreLoad}%`,
                                                    backgroundColor: coreWorkloadColor
                                                }}
                                            />
                                        </div>
                                        <span className={`text-xs font-medium w-12 text-right ${coreWorkloadTextColor}`}>
                                            {coreUsage.toFixed(0)}%
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
