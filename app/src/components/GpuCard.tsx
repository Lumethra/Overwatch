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
    temp_available: boolean;
    power_usage: number;
    utilization: number;
    fan_speed: number;
    gpu_type: string;
    vendor: string;
    architecture: string;
    device_id: string;
    pci_slot: string;
    memory_type: string;
    memory_bus_width: number;
    base_clock: number;
    boost_clock: number;
    memory_clock: number;
    shader_units: number;
    tmu_count: number;
    rop_count: number;
    directx_version: string;
    opengl_version: string;
    vulkan_support: boolean;
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
                setError('Unable to get GPU info');
                setGpu(null);
            }
            setLoading(false);
        };

        fetchGpu();
        const timer = setInterval(fetchGpu, 1000);

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

    // Temp colors (same as CPU)
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
                    {error || 'Unable to load GPU info'}
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
                        <p className="text-xs text-gray-500 dark:text-gray-400 max-w-xs truncate" title={gpu.name}>
                            {gpu.name}
                        </p>
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
                {!isIntegrated && gpu.temp_available && (
                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Temperature</p>
                        <p className={`text-lg font-bold ${getTempTextColor(gpu.temperature)}`}>
                            {gpu.temperature.toFixed(0)}°C
                        </p>
                    </div>
                )}
                {isIntegrated && (
                    <div className="col-span-2 text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">
                            Integrated Graphics Card
                        </p>
                        <p className="text-xs text-blue-500 dark:text-blue-300 mt-1">
                            Shares system memory
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
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-1">Vendor</label>
                            <p className="text-sm text-gray-900 dark:text-white font-mono bg-gray-50 dark:bg-gray-700 p-2 rounded">{gpu.vendor}</p>
                        </div>
                        <div>
                            <label className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-1">Architecture</label>
                            <p className="text-sm text-gray-900 dark:text-white font-mono bg-gray-50 dark:bg-gray-700 p-2 rounded">{gpu.architecture}</p>
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-1">Graphics Card</label>
                        <p className="text-sm text-gray-900 dark:text-white font-mono bg-gray-50 dark:bg-gray-700 p-2 rounded">{gpu.name}</p>
                    </div>

                    <div>
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400 block mb-1">Driver Version</label>
                        <p className="text-sm text-gray-900 dark:text-white font-mono bg-gray-50 dark:bg-gray-700 p-2 rounded">{gpu.driver_version}</p>
                    </div>

                    {gpu.memory_total > 0 && (
                        <div className="space-y-3">
                            <label className="text-sm font-medium text-gray-500 dark:text-gray-400 block">Memory Information</label>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-medium text-gray-400 dark:text-gray-500 block mb-1">Memory Type</label>
                                    <p className="text-sm text-gray-900 dark:text-white font-mono bg-gray-50 dark:bg-gray-700 p-2 rounded">{gpu.memory_type}</p>
                                </div>
                                {gpu.memory_bus_width > 0 && (
                                    <div>
                                        <label className="text-xs font-medium text-gray-400 dark:text-gray-500 block mb-1">Bus Width</label>
                                        <p className="text-sm text-gray-900 dark:text-white font-mono bg-gray-50 dark:bg-gray-700 p-2 rounded">{gpu.memory_bus_width}-bit</p>
                                    </div>
                                )}
                            </div>

                            {memPct > 0 && (
                                <div>
                                    <div className="flex items-center space-x-3 mb-2">
                                        <span className="text-xs font-medium text-gray-600 dark:text-gray-300 w-20">VRAM Usage</span>
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
                                    <p className="text-xs text-gray-500">
                                        {memUsedGB.toFixed(1)} GB / {memTotalGB.toFixed(1)} GB
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {(gpu.base_clock > 0 || gpu.boost_clock > 0 || gpu.memory_clock > 0) && (
                        <div className="space-y-3">
                            <label className="text-sm font-medium text-gray-500 dark:text-gray-400 block">Clock Speeds</label>
                            <div className="grid grid-cols-3 gap-4">
                                {gpu.base_clock > 0 && (
                                    <div>
                                        <label className="text-xs font-medium text-gray-400 dark:text-gray-500 block mb-1">Base Clock</label>
                                        <p className="text-sm text-gray-900 dark:text-white font-mono bg-gray-50 dark:bg-gray-700 p-2 rounded">{gpu.base_clock} MHz</p>
                                    </div>
                                )}
                                {gpu.boost_clock > 0 && (
                                    <div>
                                        <label className="text-xs font-medium text-gray-400 dark:text-gray-500 block mb-1">Boost Clock</label>
                                        <p className="text-sm text-gray-900 dark:text-white font-mono bg-gray-50 dark:bg-gray-700 p-2 rounded">{gpu.boost_clock} MHz</p>
                                    </div>
                                )}
                                {gpu.memory_clock > 0 && (
                                    <div>
                                        <label className="text-xs font-medium text-gray-400 dark:text-gray-500 block mb-1">Memory Clock</label>
                                        <p className="text-sm text-gray-900 dark:text-white font-mono bg-gray-50 dark:bg-gray-700 p-2 rounded">{gpu.memory_clock} MHz</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {(gpu.shader_units > 0 || gpu.tmu_count > 0 || gpu.rop_count > 0) && (
                        <div className="space-y-3">
                            <label className="text-sm font-medium text-gray-500 dark:text-gray-400 block">GPU Specifications</label>
                            <div className="grid grid-cols-3 gap-4">
                                {gpu.shader_units > 0 && (
                                    <div>
                                        <label className="text-xs font-medium text-gray-400 dark:text-gray-500 block mb-1">Shader Units</label>
                                        <p className="text-sm text-gray-900 dark:text-white font-mono bg-gray-50 dark:bg-gray-700 p-2 rounded">{gpu.shader_units}</p>
                                    </div>
                                )}
                                {gpu.tmu_count > 0 && (
                                    <div>
                                        <label className="text-xs font-medium text-gray-400 dark:text-gray-500 block mb-1">TMUs</label>
                                        <p className="text-sm text-gray-900 dark:text-white font-mono bg-gray-50 dark:bg-gray-700 p-2 rounded">{gpu.tmu_count}</p>
                                    </div>
                                )}
                                {gpu.rop_count > 0 && (
                                    <div>
                                        <label className="text-xs font-medium text-gray-400 dark:text-gray-500 block mb-1">ROPs</label>
                                        <p className="text-sm text-gray-900 dark:text-white font-mono bg-gray-50 dark:bg-gray-700 p-2 rounded">{gpu.rop_count}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-500 dark:text-gray-400 block">API Support</label>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="text-xs font-medium text-gray-400 dark:text-gray-500 block mb-1">DirectX</label>
                                <p className="text-sm text-gray-900 dark:text-white font-mono bg-gray-50 dark:bg-gray-700 p-2 rounded">{gpu.directx_version}</p>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-400 dark:text-gray-500 block mb-1">OpenGL</label>
                                <p className="text-sm text-gray-900 dark:text-white font-mono bg-gray-50 dark:bg-gray-700 p-2 rounded">{gpu.opengl_version}</p>
                            </div>
                            <div>
                                <label className="text-xs font-medium text-gray-400 dark:text-gray-500 block mb-1">Vulkan</label>
                                <p className={`text-sm font-mono p-2 rounded ${gpu.vulkan_support ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20' : 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20'}`}>
                                    {gpu.vulkan_support ? 'Supported' : 'Not Supported'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {(gpu.device_id !== "Unknown" || gpu.pci_slot !== "Unknown") && (
                        <div className="space-y-3">
                            <label className="text-sm font-medium text-gray-500 dark:text-gray-400 block">Hardware Information</label>
                            <div className="grid grid-cols-1 gap-4">
                                {gpu.device_id !== "Unknown" && (
                                    <div>
                                        <label className="text-xs font-medium text-gray-400 dark:text-gray-500 block mb-1">Device ID</label>
                                        <p className="text-xs text-gray-900 dark:text-white font-mono bg-gray-50 dark:bg-gray-700 p-2 rounded break-all">{gpu.device_id}</p>
                                    </div>
                                )}
                                {gpu.pci_slot !== "Unknown" && (
                                    <div>
                                        <label className="text-xs font-medium text-gray-400 dark:text-gray-500 block mb-1">PCI Slot</label>
                                        <p className="text-xs text-gray-900 dark:text-white font-mono bg-gray-50 dark:bg-gray-700 p-2 rounded">{gpu.pci_slot}</p>
                                    </div>
                                )}
                            </div>
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
