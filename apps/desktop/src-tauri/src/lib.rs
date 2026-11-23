/// Coque minimale : aucune commande Rust exposée au front.
/// Toute la logique métier et les contrôles d'accès restent dans l'API PULSE,
/// la version desktop se comporte exactement comme la version web.
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .run(tauri::generate_context!())
        .expect("erreur au démarrage de PULSE desktop");
}
