fn main() {
    cc::Build::new()
        .file("native/media.m")
        .flag("-fobjc-arc")
        .compile("nextround_media");
    println!("cargo:rustc-link-lib=framework=AVFoundation");
    println!("cargo:rustc-link-lib=framework=IOKit");
    println!("cargo:rerun-if-changed=native/media.m");
    tauri_build::build()
}
