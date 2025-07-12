'use client';

import { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { ChevronDownIcon, ChevronUpIcon, CpuChipIcon } from '@heroicons/react/24/outline';

interface CpuInfo {
    brand: string;
    frequency: number;
    cores: number;
    usage: number;
    per_core_usage: number[];
}

export default function CpuCard() {
    const [processorInfo, setProcessorInfo] = useState<CpuInfo | null>(null);
    const [isLoadingCpuInfo, setIsLoadingCpuInfo] = useState(true);
    const [showDetailedCoreInfo, setShowDetailedCoreInfo] = useState(false);
    const refreshRate = 1000; // Don't hardcode this

    useEffect(() => {
        const getProcessorData = async () => {
            try {
                const cpuData = await invoke<CpuInfo>('get_cpu_info');
                setProcessorInfo(cpuData);
            } catch (err) {
                console.error('Hmm, something went wrong getting CPU info:', err);
                setProcessorInfo(null);
            }
            setIsLoadingCpuInfo(false);
        }; // first get, then refresh and then refresh and then refresh and then refresh and ... I am exhausted
        getProcessorData();
        const refreshInterval = setInterval(getProcessorData, refreshRate); // Upfate, this is actually refreshing it, not the thing above

        return () => clearInterval(refreshInterval);
    }, []);

    // Fancy color thing (from the AI version, pls don't blame, devs don't like color and don't like light, but users do)
    const getWorkloadColor = (usage: number) => {
        if (usage > 80) return '#ef4444'; // Red symbolyzes, that the CPU might be dying, like me rn
        if (usage > 60) return '#f59e0b'; // Orange for the pain
        return '#10b981'; // Green when things are chill
    };

    const getWorkloadTextColor = (usage: number) => {
        if (usage > 80) return 'text-red-500'; // It's actually the same here
        if (usage > 60) return 'text-orange-500'; // Who would guessed, here too
        return 'text-green-500'; // and this too
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
                <p className="text-gray-600 dark:text-gray-400">Couldn't load processor information</p>
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

            <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Cores</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{processorInfo.cores}</p>
                </div>
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Frequency</p>
                    <p className="text-lg font-bold text-gray-900 dark:text-white">{processorInfo.frequency} MHz</p>
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

                    <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-3">Individual Core Usage</label>
                        <div className="grid grid-cols-1 gap-2">
                            {processorInfo.per_core_usage.map((coreUsage: number, coreIndex: number) => {
                                const currentCoreLoad = Math.min(coreUsage, 100);
                                const coreWorkloadColor = getWorkloadColor(coreUsage);
                                const coreWorkloadTextColor = getWorkloadTextColor(coreUsage);

                                return (
                                    <div key={coreIndex} className="flex items-center space-x-3">
                                        <span className="text-xs font-medium text-gray-600 dark:text-gray-300 w-14">Core {coreIndex + 1}</span>
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
