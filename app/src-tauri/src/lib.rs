use sysinfo::{System, CpuRefreshKind, RefreshKind};
use serde::{Deserialize, Serialize};
use winreg::enums::*;
use winreg::RegKey;

#[derive(Debug, Serialize, Deserialize)]
pub struct CpuInfo {
    pub brand: String,
    pub frequency: u64,
    pub cores: usize,
    pub usage: f32,
    pub per_core_usage: Vec<f32>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GpuInfo {
    pub name: String,
    pub driver_version: String,
    pub memory_total: u64,
    pub memory_used: u64,
    pub memory_free: u64,
    pub temperature: u32,
    pub power_usage: u32,
    pub utilization: u32,
    pub fan_speed: u32,
    pub gpu_type: String,
}

#[tauri::command]
fn get_cpu_info() -> CpuInfo {
    let mut sys = System::new_with_specifics(
        RefreshKind::new().with_cpu(CpuRefreshKind::everything())
    );
    
    // Refreshing and then refreshing and then refreshing (can you tell, my brain is fried?)
    sys.refresh_cpu_all();
    std::thread::sleep(std::time::Duration::from_millis(200));
    sys.refresh_cpu_all();
    
    let cpus = sys.cpus();
    let total_usage = sys.global_cpu_usage();
    
    let brand = cpus.first()
        .map(|cpu| cpu.brand().to_string())
        .unwrap_or_else(|| "Unknown".to_string());
    
    let freq = cpus.first()
        .map(|cpu| cpu.frequency())
        .unwrap_or(0);
    
    let core_count = cpus.len();
    let per_core: Vec<f32> = cpus.iter().map(|cpu| cpu.cpu_usage()).collect();
    
    CpuInfo {
        brand,
        frequency: freq,
        cores: core_count,
        usage: total_usage,
        per_core_usage: per_core,
    }
}

#[tauri::command]
fn get_gpu_info() -> Result<GpuInfo, String> {
    let hklm = RegKey::predef(HKEY_LOCAL_MACHINE);
    
    // Where Windows stores GPU info, sorry Mac Users, no Mac support, hehe, switch ur OS
    let gpu_key = hklm
        .open_subkey(r"SYSTEM\CurrentControlSet\Control\Class\{4d36e968-e325-11ce-bfc1-08002be10318}")
        .map_err(|e| format!("Can't access GPU registry: {}", e))?;
    
    let mut gpu_name = "Unknown GPU".to_string();
    let mut driver_ver = "Unknown".to_string();
    let mut total_mem = 0u64;
    
    // 10 adapters, no more, no less
    for i in 0..10 {
        let key_name = format!("{:04}", i);
        
        if let Ok(adapter) = gpu_key.open_subkey(&key_name) {
            if let Ok(desc) = adapter.get_value::<String, _>("DriverDesc") {
                if !desc.is_empty() && !desc.contains("Microsoft") {
                    gpu_name = desc;
                    
                    if let Ok(ver) = adapter.get_value::<String, _>("DriverVersion") {
                        driver_ver = ver;
                    }
                    
                    // Try different memory size formats
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
    
    // If we didn't find anything, it's probably a skill issue and the User is using an integrated GPU like be (skill issue to meeee)
    if gpu_name == "Unknown GPU" {
        let mut sys = System::new();
        sys.refresh_all();
        
        gpu_name = "Integrated Graphics".to_string();
        driver_ver = "Built-in".to_string();
        
        // Yea, copied from AI version, don't work without, or does it?
        let ram = sys.total_memory();
        total_mem = ram / 8; // yea yea yea, yap yap yap
    }
    
    let gpu_type = get_gpu_type(&gpu_name);
    
    // stupid math
    let used_mem = if total_mem > 0 { total_mem / 6 } else { 0 };
    let free_mem = if total_mem > used_mem { total_mem - used_mem } else { 0 };
    
    Ok(GpuInfo {
        name: gpu_name,
        driver_version: driver_ver,
        memory_total: total_mem,
        memory_used: used_mem,
        memory_free: free_mem,
        temperature: 0,    // ...
        power_usage: 0,    // ...
        utilization: 0,    // ...
        fan_speed: 0,      // ...
        gpu_type,
    })
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
        )?;
      }
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
