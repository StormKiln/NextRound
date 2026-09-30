#[test]
#[ignore = "requires UPDATER_ARCHIVE produced by release packaging"]
fn verify_signed_updater_archive() {
    use base64::{engine::general_purpose::STANDARD, Engine};
    use minisign_verify::{PublicKey, Signature};
    let path = std::env::var("UPDATER_ARCHIVE").expect("UPDATER_ARCHIVE is required");
    let config: serde_json::Value =
        serde_json::from_str(include_str!("../tauri.conf.json")).unwrap();
    let key = String::from_utf8(
        STANDARD
            .decode(config["plugins"]["updater"]["pubkey"].as_str().unwrap())
            .unwrap(),
    )
    .unwrap();
    let sig = String::from_utf8(
        STANDARD
            .decode(
                std::fs::read_to_string(format!("{path}.sig"))
                    .unwrap()
                    .trim(),
            )
            .unwrap(),
    )
    .unwrap();
    let public = PublicKey::decode(&key).unwrap();
    let signature = Signature::decode(&sig).unwrap();
    let mut archive = std::fs::read(path).unwrap();
    public
        .verify(&archive, &signature, false)
        .expect("Updater signature must match embedded public key and final archive");
    archive[0] ^= 1;
    assert!(
        public.verify(&archive, &signature, false).is_err(),
        "Tampered archive must be refused"
    );
}
