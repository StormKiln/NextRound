use std::sync::atomic::{AtomicBool, Ordering};
const LIMIT: usize = 1024 * 1024;
static OPEN: AtomicBool = AtomicBool::new(false);
struct Guard;
impl Drop for Guard {
    fn drop(&mut self) {
        OPEN.store(false, Ordering::Release);
    }
}
extern "C" {
    fn nr_workout_file(
        saving: i32,
        suggested_name: *const std::ffi::c_char,
        bytes: *const u8,
        length: usize,
        output: *mut u8,
        output_length: *mut usize,
        limit: usize,
        message: *mut std::ffi::c_char,
        capacity: usize,
    ) -> i32;
}
fn bounded_json(raw: &str) -> Result<(), String> {
    if raw.is_empty() || raw.len() > LIMIT {
        return Err("Workout files must contain data and be at most 1 MiB.".into());
    }
    serde_json::from_str::<serde_json::Value>(raw)
        .map_err(|_| "Invalid workout JSON.".to_string())?;
    Ok(())
}
async fn panel(
    app: tauri::AppHandle,
    raw: Option<String>,
    suggested_name: String,
) -> Result<Option<String>, String> {
    if let Some(data) = &raw {
        bounded_json(data)?;
    }
    if suggested_name.len() > 185
        || !suggested_name.ends_with(".json")
        || suggested_name.contains(['/', '\\', ':'])
        || suggested_name.chars().any(char::is_control)
    {
        return Err("Invalid suggested workout filename.".into());
    }
    let suggested_name = std::ffi::CString::new(suggested_name).map_err(|_| "Invalid filename")?;
    OPEN.compare_exchange(false, true, Ordering::AcqRel, Ordering::Acquire)
        .map_err(|_| "A workout file dialog is already open.".to_string())?;
    let guard = Guard;
    let (sender, receiver) = std::sync::mpsc::channel();
    app.run_on_main_thread(move || {
        let _guard = guard;
        let mut output = vec![0u8; LIMIT];
        let mut length = 0usize;
        let mut message = [0 as std::ffi::c_char; 2048];
        let bytes = raw.as_deref().unwrap_or("").as_bytes();
        let status = unsafe {
            nr_workout_file(
                i32::from(raw.is_some()),
                suggested_name.as_ptr(),
                bytes.as_ptr(),
                bytes.len(),
                output.as_mut_ptr(),
                &mut length,
                LIMIT,
                message.as_mut_ptr(),
                message.len(),
            )
        };
        let result = match status {
            0 => Ok(None),
            1 if raw.is_some() => Ok(Some(String::new())),
            1 => String::from_utf8(output[..length].to_vec())
                .map(Some)
                .map_err(|_| "Workout files must use UTF-8 text.".into()),
            _ => Err(unsafe { std::ffi::CStr::from_ptr(message.as_ptr()) }
                .to_string_lossy()
                .into_owned()),
        };
        let _ = sender.send(result);
    })
    .map_err(|e| e.to_string())?;
    tauri::async_runtime::spawn_blocking(move || receiver.recv())
        .await
        .map_err(|e| e.to_string())?
        .map_err(|_| "The file dialog closed unexpectedly.".to_string())?
}
#[tauri::command]
pub async fn open_workout_file(app: tauri::AppHandle) -> Result<Option<String>, String> {
    panel(app, None, "NextRound-workout.json".into()).await
}
#[tauri::command]
pub async fn save_workout_file(
    app: tauri::AppHandle,
    raw: String,
    suggested_name: String,
) -> Result<bool, String> {
    Ok(panel(app, Some(raw), suggested_name).await?.is_some())
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn file_content_is_bounded_json() {
        assert!(bounded_json("").is_err());
        assert!(bounded_json("garbage").is_err());
        assert!(bounded_json(&" ".repeat(LIMIT + 1)).is_err());
        assert!(bounded_json("{\"version\":1}").is_ok());
    }
}
