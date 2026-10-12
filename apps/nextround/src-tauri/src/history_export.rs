use std::sync::atomic::{AtomicBool, Ordering};
static SAVING: AtomicBool = AtomicBool::new(false);
struct SaveGuard;
impl Drop for SaveGuard {
    fn drop(&mut self) {
        SAVING.store(false, Ordering::Release);
    }
}
extern "C" {
    fn nr_save_history_csv(
        bytes: *const u8,
        length: usize,
        message: *mut std::ffi::c_char,
        capacity: usize,
    ) -> i32;
}
fn validate_csv(csv: &str) -> Result<(), String> {
    if csv.is_empty() || csv.len() > 16 * 1024 * 1024 {
        return Err("Export must contain data and be smaller than 16 MiB. Narrow the history filters and try again.".into());
    }
    Ok(())
}
#[tauri::command]
pub async fn save_history_csv(app: tauri::AppHandle, csv: String) -> Result<bool, String> {
    validate_csv(&csv)?;
    SAVING
        .compare_exchange(false, true, Ordering::AcqRel, Ordering::Acquire)
        .map_err(|_| "A CSV save dialog is already open.".to_string())?;
    let guard = SaveGuard;
    let (sender, receiver) = std::sync::mpsc::channel();
    app.run_on_main_thread(move || {
        let _guard = guard;
        let mut message = [0 as std::ffi::c_char; 2048];
        let status = unsafe {
            nr_save_history_csv(csv.as_ptr(), csv.len(), message.as_mut_ptr(), message.len())
        };
        let result = match status {
            1 => Ok(true),
            0 => Ok(false),
            _ => {
                let detail =
                    unsafe { std::ffi::CStr::from_ptr(message.as_ptr()) }.to_string_lossy();
                Err(if detail.is_empty() {
                    "The CSV file could not be saved. Try another location.".into()
                } else {
                    detail.into_owned()
                })
            }
        };
        let _ = sender.send(result);
    })
    .map_err(|e| e.to_string())?;
    tauri::async_runtime::spawn_blocking(move || receiver.recv())
        .await
        .map_err(|e| e.to_string())?
        .map_err(|_| "The save dialog closed unexpectedly. Try again.".to_string())?
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn export_size_is_bounded() {
        assert!(validate_csv("").is_err());
        assert!(validate_csv("\u{feff}session_id\r\n").is_ok());
        assert!(validate_csv(&"x".repeat(16 * 1024 * 1024 + 1)).is_err());
    }
}
