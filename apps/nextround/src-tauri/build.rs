fn main() {
    cc::Build::new()
        .file("native/media.m")
        .file("native/history_export.m")
        .file("native/workout_files.m")
        .flag("-fobjc-arc")
        .compile("nextround_media");
    println!("cargo:rustc-link-lib=framework=AVFoundation");
    println!("cargo:rustc-link-lib=framework=IOKit");
    println!("cargo:rerun-if-changed=native/media.m");
    println!("cargo:rustc-link-lib=framework=AppKit");
    println!("cargo:rustc-link-lib=framework=UniformTypeIdentifiers");
    println!("cargo:rerun-if-changed=native/history_export.m");
    println!("cargo:rerun-if-changed=native/workout_files.m");
    tauri_build::build()
}
