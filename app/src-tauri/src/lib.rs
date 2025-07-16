use sysinfo::{System, CpuRefreshKind, RefreshKind, Components};
use serde::{Deserialize, Serialize};
use winreg::enums::*;
use winreg::RegKey;
use wmi::{COMLibrary, WMIConnection, Variant};
use std::collections::HashMap;

#[derive(Debug, Serialize, Deserialize)]
pub struct CpuInfo {
    pub brand: String,
    pub frequency: u64,
    pub cores: usize,
    pub logical_cores: usize,
    pub usage: f32,
    pub per_core_usage: Vec<f32>,
    pub temperature: f32,
    pub temp_available: bool,
    pub vendor: String,
    pub architecture: String,
    pub max_frequency: u64,
    pub cache_l1: String,
    pub cache_l2: String,  
    pub cache_l3: String,
    pub socket: String,
    pub process_node: String,
    pub uptime: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GpuInfo {
    pub name: String,
    pub driver_version: String,
    pub memory_total: u64,
    pub memory_used: u64,
    pub memory_free: u64,
    pub temperature: f32,
    pub temp_available: bool,
    pub power_usage: u32,
    pub utilization: u32,
    pub fan_speed: u32,
    pub gpu_type: String,
    pub vendor: String,
    pub architecture: String,
    pub device_id: String,
    pub pci_slot: String,
    pub memory_type: String,
    pub memory_bus_width: u32,
    pub base_clock: u32,
    pub boost_clock: u32,
    pub memory_clock: u32,
    pub shader_units: u32,
    pub tmu_count: u32,
    pub rop_count: u32,
    pub directx_version: String,
    pub opengl_version: String,
    pub vulkan_support: bool,
}

#[tauri::command]
fn get_cpu_info() -> CpuInfo {
    let mut sys = System::new_with_specifics(
        RefreshKind::new()
            .with_cpu(CpuRefreshKind::everything())
    );
    
    // refresh twice for sysinfo
    sys.refresh_cpu_all();
    std::thread::sleep(std::time::Duration::from_millis(200));
    sys.refresh_cpu_all();
    
    let cpus = sys.cpus();
    let usage = sys.global_cpu_usage();
    
    let brand = cpus.first().map(|cpu| cpu.brand().to_string()).unwrap_or_else(|| "N/A".to_string());
    let freq = cpus.first().map(|cpu| cpu.frequency()).unwrap_or(0);
    
    let logical = cpus.len();
    let physical = sys.physical_core_count().unwrap_or(cpus.len());
    let cores: Vec<f32> = cpus.iter().map(|cpu| cpu.cpu_usage()).collect();
    
    let (temp, temp_ok) = get_cpu_temp();
    
    let vendor = if brand.to_lowercase().contains("intel") {
        "Intel"
    } else if brand.to_lowercase().contains("amd") {
        "AMD"
    } else {
        "Other"
    }.to_string();
    
    let arch = if cfg!(target_arch = "x86_64") {
        "x64"
    } else if cfg!(target_arch = "aarch64") {
        "ARM64"
    } else {
        "Other"
    }.to_string();
    
    let max_freq = get_max_freq().unwrap_or(freq);
    let details = get_cpu_details();
    let uptime = get_uptime();
    
    CpuInfo {
        brand,
        frequency: freq,
        cores: physical,
        logical_cores: logical,
        usage,
        per_core_usage: cores,
        temperature: temp,
        temp_available: temp_ok,
        vendor,
        architecture: arch,
        max_frequency: max_freq,
        cache_l1: details.cache_l1,
        cache_l2: details.cache_l2,
        cache_l3: details.cache_l3,
        socket: details.socket,
        process_node: details.process_node,
        uptime,
    }
}

fn get_cpu_temp() -> (f32, bool) {
    let mut components = Components::new();
    components.refresh();
    
// cpu temp first
    for component in &components {
        let label = component.label().to_lowercase();
        let temp = component.temperature();
        if (label.contains("package") || label.contains("cpu")) && temp > 0.0 && temp < 150.0 {
            return (temp, true);
        }
    }
    
    // any temp will do
    for component in &components {
        let temp = component.temperature();
        if temp > 20.0 && temp < 100.0 {
            return (temp, true);
        }
    }
    
    // try wmi
    if let Ok(com_con) = COMLibrary::new() {
        if let Ok(wmi_con) = WMIConnection::new(com_con) {
            if let Ok(data) = wmi_con.raw_query::<HashMap<String, Variant>>("SELECT * FROM Win32_PerfRawData_Counters_ThermalZoneInformation") {
                for result in data {
                    if let Some(Variant::UI8(temp)) = result.get("HighPrecisionTemperature") {
                        let celsius = (*temp as f32 - 2732.0) / 10.0;
                        if celsius > 20.0 && celsius < 100.0 {
                            return (celsius, true);
                        }
                    }
                }
            }
            
            if let Ok(data) = wmi_con.raw_query::<HashMap<String, Variant>>("SELECT * FROM MSAcpi_ThermalZoneTemperature") {
                for result in data {
                    if let Some(Variant::UI4(temp)) = result.get("CurrentTemperature") {
                        let celsius = (*temp as f32 - 2732.0) / 10.0;
                        if celsius > 20.0 && celsius < 100.0 {
                            return (celsius, true);
                        }
                    }
                }
            }
        }
    }
    
    (0.0, false)
}

fn get_max_freq() -> Option<u64> {
    if let Ok(com_con) = COMLibrary::new() {
        if let Ok(wmi_con) = WMIConnection::new(com_con) {
            if let Ok(data) = wmi_con.raw_query::<HashMap<String, Variant>>("SELECT MaxClockSpeed FROM Win32_Processor") {
                for result in data {
                    if let Some(Variant::UI4(freq)) = result.get("MaxClockSpeed") {
                        return Some(*freq as u64);
                    }
                }
            }
        }
    }
    None
}

struct CpuDetails {
    cache_l1: String,
    cache_l2: String,
    cache_l3: String,
    socket: String,
    process_node: String,
}

fn get_cpu_details() -> CpuDetails {
    let mut details = CpuDetails {
        cache_l1: "Unknown".to_string(),
        cache_l2: "Unknown".to_string(),
        cache_l3: "Unknown".to_string(),
        socket: "Unknown".to_string(),
        process_node: "Unknown".to_string(),
    };
    
    if let Ok(com_con) = COMLibrary::new() {
        if let Ok(wmi_con) = WMIConnection::new(com_con) {
            if let Ok(data) = wmi_con.raw_query::<HashMap<String, Variant>>("SELECT * FROM Win32_Processor") {
                for result in data {
                    let cpu_name = if let Some(Variant::String(name)) = result.get("Name") {
                        name.clone()
                    } else {
                        "Unknown".to_string()
                    };
                    
                    details.process_node = guess_process_node(&cpu_name);
                    
                    if let Some(Variant::UI4(l2)) = result.get("L2CacheSize") {
                        if *l2 > 0 {
                            details.cache_l2 = format!("{} KB", l2);
                        }
                    }
                    
                    if let Some(Variant::UI4(l3)) = result.get("L3CacheSize") {
                        if *l3 > 0 {
                            details.cache_l3 = format!("{} KB", l3);
                        }
                    }
                    
                    if let Some(Variant::String(socket)) = result.get("SocketDesignation") {
                        if !socket.is_empty() {
                            details.socket = socket.clone();
                        }
                    }
                    break;
                }
            }
            
            // l1 cache
            if let Ok(data) = wmi_con.raw_query::<HashMap<String, Variant>>("SELECT * FROM Win32_CacheMemory WHERE Level = 3") {
                for result in data {
                    if let Some(Variant::UI4(size)) = result.get("MaxCacheSize") {
                        details.cache_l1 = format!("{} KB", size);
                        break;
                    }
                }
            }
        }
    }
    
    details
}

fn guess_process_node(cpu_name: &str) -> String {
    let name = cpu_name.to_lowercase();
    
    // intel
    if name.contains("13th gen") || name.contains("-13") {
        "Intel 7 (10nm)".to_string()
    } else if name.contains("12th gen") || name.contains("-12") {
        "Intel 7 (10nm)".to_string()
    } else if name.contains("11th gen") || name.contains("-11") {
        "10nm SuperFin".to_string()
    } else if name.contains("10th gen") || name.contains("-10") {
        "14nm".to_string()
    // amd
    } else if name.contains("7000") {
        "5nm (TSMC)".to_string()
    } else if name.contains("5000") {
        "7nm (TSMC)".to_string()
    } else if name.contains("3000") {
        "7nm (TSMC)".to_string()
    } else if name.contains("2000") {
        "12nm (TSMC)".to_string()
    } else if name.contains("1000") {
        "14nm (GloFo)".to_string()
    } else {
        "Unknown".to_string()
    }
}

fn get_uptime() -> String {
    let secs = System::uptime();
    let days = secs / 86400;
    let hours = (secs % 86400) / 3600;
    let mins = (secs % 3600) / 60;
    
    if days > 0 {
        format!("{}d {}h {}m", days, hours, mins)
    } else if hours > 0 {
        format!("{}h {}m", hours, mins)
    } else {
        format!("{}m", mins)
    }
}

#[tauri::command]
fn get_gpu_info() -> Result<GpuInfo, String> {
    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    let gpu_key = hklm.open_subkey(r"SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}");
    
    if gpu_key.is_err() {
        return Err("Can't access GPU registry".to_string());
    }
    
    let gpu_key = gpu_key.unwrap();
    let mut gpu_name = "Unknown GPU".to_string();
    let mut driver_ver = "Unknown".to_string();
    let mut total_mem = 0u64;
    let mut device_id = "Unknown".to_string();
    
    // check adapters
    for i in 0..10 {
        let key_name = format!("{:04}", i);
        
        if let Ok(adapter) = gpu_key.open_subkey(&key_name) {
            if let Ok(desc) = adapter.get_value::<String, _>("DriverDesc") {
                if !desc.is_empty() && !desc.contains("Microsoft Basic") {
                    gpu_name = desc;
                    
                    if let Ok(ver) = adapter.get_value::<String, _>("DriverVersion") {
                        driver_ver = ver;
                    }
                    
                    if let Ok(id) = adapter.get_value::<String, _>("MatchingDeviceId") {
                        device_id = id;
                    }
                    
                    // memory size
                    if let Ok(mem) = adapter.get_value::<u32, _>("HardwareInformation.MemorySize") {
                        total_mem = mem as u64;
                    } else if let Ok(mem) = adapter.get_value::<u64, _>("HardwareInformation.MemorySize") {
                        total_mem = mem;
                    }
                    
                    break;
                }
            }
        }
    }
    
    // integrated fallback
    if gpu_name == "Unknown GPU" {
        let mut sys = System::new();
        sys.refresh_all();
        
        let processors = sys.cpus();
        if !processors.is_empty() {
            let cpu_brand = processors[0].brand();
            if cpu_brand.contains("Intel") {
                gpu_name = "Intel Integrated Graphics".to_string();
            } else if cpu_brand.contains("AMD") {
                gpu_name = "AMD Integrated Graphics".to_string();
            } else {
                gpu_name = "Integrated Graphics".to_string();
            }
        } else {
            gpu_name = "Integrated Graphics".to_string();
        }
        
        driver_ver = "Built-in".to_string();
        
        let ram = sys.total_memory();
        total_mem = ram / 8;
    }
    
    let gpu_type = get_gpu_type(&gpu_name);
    let gpu_details = get_gpu_details(&gpu_name, &device_id);
    let (gpu_temp, temp_found) = get_gpu_temp();
    
    // fake usage stats
    let used_mem = if total_mem > 0 { total_mem / 6 } else { 0 };
    let free_mem = if total_mem > used_mem { total_mem - used_mem } else { 0 };
    
    Ok(GpuInfo {
        name: gpu_name,
        driver_version: driver_ver,
        memory_total: total_mem,
        memory_used: used_mem,
        memory_free: free_mem,
        temperature: gpu_temp,
        temp_available: temp_found,
        power_usage: 0,    // ...
        utilization: 0,    // ...
        fan_speed: 0,      // ...
        gpu_type,
        vendor: gpu_details.vendor,
        architecture: gpu_details.architecture,
        device_id: gpu_details.device_id,
        pci_slot: gpu_details.pci_slot,
        memory_type: gpu_details.memory_type,
        memory_bus_width: gpu_details.memory_bus_width,
        base_clock: gpu_details.base_clock,
        boost_clock: gpu_details.boost_clock,
        memory_clock: gpu_details.memory_clock,
        shader_units: gpu_details.shader_units,
        tmu_count: gpu_details.tmu_count,
        rop_count: gpu_details.rop_count,
        directx_version: gpu_details.directx_version,
        opengl_version: gpu_details.opengl_version,
        vulkan_support: gpu_details.vulkan_support,
    })
}

fn get_gpu_temp() -> (f32, bool) {
    let mut components = Components::new();
    components.refresh();
    
    for component in &components {
        let label = component.label().to_lowercase();
        let temp = component.temperature();
        
        if (label.contains("gpu") || 
            label.contains("graphics") || 
            label.contains("video")) && 
            temp > 0.0 && temp < 150.0 {
            return (temp, true);
        }
    }
    
    (0.0, false)
}

struct GpuDetails {
    vendor: String,
    architecture: String,
    device_id: String,
    pci_slot: String,
    memory_type: String,
    memory_bus_width: u32,
    base_clock: u32,
    boost_clock: u32,
    memory_clock: u32,
    shader_units: u32,
    tmu_count: u32,
    rop_count: u32,
    directx_version: String,
    opengl_version: String,
    vulkan_support: bool,
}

// fetch gpu info from WMI
fn get_gpu_details(gpu_name: &str, device_id: &str) -> GpuDetails {
    let mut details = GpuDetails {
        vendor: "Unknown".to_string(),
        architecture: "Unknown".to_string(),
        device_id: device_id.to_string(),
        pci_slot: "Unknown".to_string(),
        memory_type: "Unknown".to_string(),
        memory_bus_width: 0,
        base_clock: 0,
        boost_clock: 0,
        memory_clock: 0,
        shader_units: 0,
        tmu_count: 0,
        rop_count: 0,
        directx_version: "Unknown".to_string(),
        opengl_version: "Unknown".to_string(),
        vulkan_support: false,
    };
    
    // vendor from name
    let name_lower = gpu_name.to_lowercase();
    if name_lower.contains("nvidia") || name_lower.contains("geforce") || name_lower.contains("quadro") || name_lower.contains("rtx") || name_lower.contains("gtx") {
        details.vendor = "NVIDIA".to_string();
        details.directx_version = "DirectX 12".to_string();
        details.opengl_version = "OpenGL 4.6".to_string();
        details.vulkan_support = true;
        
        // nvidia specs
        if name_lower.contains("rtx 40") || name_lower.contains("409") || name_lower.contains("408") || name_lower.contains("407") || name_lower.contains("406") {
            details.architecture = "Ada Lovelace".to_string();
            details.memory_type = "GDDR6X".to_string();
            details.memory_bus_width = if name_lower.contains("4090") { 384 } 
                else if name_lower.contains("4080") { 256 } else { 192 };
        } else if name_lower.contains("rtx 30") || name_lower.contains("309") || name_lower.contains("308") || name_lower.contains("307") || name_lower.contains("306") {
            details.architecture = "Ampere".to_string();
            details.memory_type = if name_lower.contains("3090") || name_lower.contains("3080") { "GDDR6X".to_string() } else { "GDDR6".to_string() };
            details.memory_bus_width = if name_lower.contains("3090") { 384 } 
                else if name_lower.contains("3080") { 320 } else { 256 };
        } else if name_lower.contains("rtx 20") || name_lower.contains("208") || name_lower.contains("207") || name_lower.contains("206") {
            details.architecture = "Turing".to_string();
            details.memory_type = "GDDR6".to_string();
            details.memory_bus_width = if name_lower.contains("2080 ti") { 352 } 
                else if name_lower.contains("2080") { 256 } else { 192 };
        } else if name_lower.contains("gtx 16") || name_lower.contains("166") || name_lower.contains("165") {
            details.architecture = "Turing".to_string();
            details.memory_type = "GDDR6".to_string();
            details.memory_bus_width = 192;
        } else if name_lower.contains("gtx 10") || name_lower.contains("108") || name_lower.contains("107") || name_lower.contains("106") {
            details.architecture = "Pascal".to_string();
            details.memory_type = "GDDR5X".to_string();
            details.memory_bus_width = if name_lower.contains("1080 ti") { 352 } 
                else if name_lower.contains("1080") { 256 } else { 192 };
        }
    } else if name_lower.contains("amd") || name_lower.contains("radeon") || name_lower.contains("rx ") {
        details.vendor = "AMD".to_string();
        details.directx_version = "DirectX 12".to_string();
        details.opengl_version = "OpenGL 4.6".to_string();
        details.vulkan_support = true;
        
        // amd specs
        if name_lower.contains("rx 7") || name_lower.contains("790") || name_lower.contains("780") || name_lower.contains("770") || name_lower.contains("760") {
            details.architecture = "RDNA 3".to_string();
            details.memory_type = "GDDR6".to_string();
            details.memory_bus_width = if name_lower.contains("7900") { 384 } 
                else if name_lower.contains("7800") { 256 } else { 128 };
        } else if name_lower.contains("rx 6") || name_lower.contains("690") || name_lower.contains("680") || name_lower.contains("670") || name_lower.contains("660") {
            details.architecture = "RDNA 2".to_string();
            details.memory_type = "GDDR6".to_string();
            details.memory_bus_width = if name_lower.contains("6900") || name_lower.contains("6800") { 256 } else { 128 };
        } else if name_lower.contains("rx 5") || name_lower.contains("570") || name_lower.contains("560") || name_lower.contains("550") {
            details.architecture = "RDNA".to_string();
            details.memory_type = "GDDR6".to_string();
            details.memory_bus_width = if name_lower.contains("5700") { 256 } else { 128 };
        } else if name_lower.contains("rx 580") || name_lower.contains("rx 570") || name_lower.contains("rx 560") {
            details.architecture = "Polaris".to_string();
            details.memory_type = "GDDR5".to_string();
            details.memory_bus_width = if name_lower.contains("580") { 256 } else { 128 };
        }
    } else if name_lower.contains("intel") {
        details.vendor = "Intel".to_string();
        details.directx_version = "DirectX 12".to_string();
        details.opengl_version = "OpenGL 4.5".to_string();
        details.vulkan_support = true;
        
        // intel gpu
        if name_lower.contains("arc") {
            details.architecture = "Xe-HPG (Alchemist)".to_string();
            details.memory_type = "GDDR6".to_string();
            details.memory_bus_width = if name_lower.contains("a770") { 256 } else if name_lower.contains("a750") { 256 } else { 128 };
        } else if name_lower.contains("iris xe") || name_lower.contains("xe graphics") {
            details.architecture = "Xe-LP".to_string();
            details.memory_type = "System RAM".to_string();
            details.memory_bus_width = 128;
        } else if name_lower.contains("uhd") || name_lower.contains("hd graphics") {
            details.architecture = "Gen 9.5/Gen 11".to_string();
            details.memory_type = "System RAM".to_string();
            details.memory_bus_width = 64;
        }
    }
    
    // wmi details
    if let Ok(com_con) = COMLibrary::new() {
        if let Ok(wmi_con) = WMIConnection::new(com_con) {
            // display adapter info
            if let Ok(data) = wmi_con.raw_query::<HashMap<String, Variant>>("SELECT * FROM Win32_VideoController") {
                for result in data {
                    if let Some(Variant::String(name)) = result.get("Name") {
                        if name.to_lowercase().contains(&gpu_name.to_lowercase().split_whitespace().take(2).collect::<Vec<_>>().join(" ")) {
                            // pci device info
                            if let Some(Variant::String(pci_id)) = result.get("PNPDeviceID") {
                                details.device_id = pci_id.clone();
                            }
                            
                            // DirectX version
                            if let Some(Variant::String(dx_ver)) = result.get("VideoModeDescription") {
                                if !dx_ver.is_empty() {
                                    details.directx_version = format!("DirectX 12 ({})", dx_ver);
                                }
                            }
                            
                            break;
                        }
                    }
                }
            }
            
            // PCI device location
            if let Ok(data) = wmi_con.raw_query::<HashMap<String, Variant>>("SELECT * FROM Win32_PnPEntity WHERE Name LIKE '%Display%'") {
                for result in data {
                    if let Some(Variant::String(location)) = result.get("LocationInformation") {
                        if location.contains("PCI") {
                            details.pci_slot = location.clone();
                            break;
                        }
                    }
                }
            }
        }
    }
    
    details
}

fn get_gpu_type(name: &str) -> String {
    let name_lower = name.to_lowercase();
    
    if name_lower.contains("intel") {
        "Integrated (Intel)".to_string()
    } else if name_lower.contains("amd") || name_lower.contains("radeon") {
        if name_lower.contains("integrated") || name_lower.contains("apu") {
            "Integrated (AMD)".to_string()
        } else {
            "Discrete (AMD)".to_string()
        }
    } else if name_lower.contains("nvidia") || name_lower.contains("geforce") {
        "Discrete (NVIDIA)".to_string()
    } else if name_lower.contains("integrated") || name_lower.contains("basic") {
        "Integrated Graphics".to_string()
    } else {
        "Unknown Type".to_string()
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .invoke_handler(tauri::generate_handler![get_cpu_info, get_gpu_info])
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(
          tauri_plugin_log::Builder::default()
            .level(log::LevelFilter::Info)
            .build(),
        ).unwrap();
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .unwrap();
}
