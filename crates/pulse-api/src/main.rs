//! Serveur PULSE : API `/api/v1` et site React compilé (voir spec/architecture.md).
//!
//! Sous-commandes :
//! - `pulse-api migrate` : applique les migrations SQL (pré-déploiement Railway, `make migrate`).

use std::process::ExitCode;

use sqlx::postgres::PgPoolOptions;

/// Migrations du dossier `migrations/`, intégrées au binaire à la compilation.
static MIGRATOR: sqlx::migrate::Migrator = sqlx::migrate!("../../migrations");

#[tokio::main]
async fn main() -> ExitCode {
    let command = std::env::args().nth(1).unwrap_or_default();
    let result = match command.as_str() {
        "migrate" => migrate().await,
        _ => {
            eprintln!("Usage : pulse-api migrate");
            return ExitCode::from(2);
        }
    };
    match result {
        Ok(()) => ExitCode::SUCCESS,
        Err(message) => {
            eprintln!("{message}");
            ExitCode::FAILURE
        }
    }
}

async fn migrate() -> Result<(), String> {
    let url = std::env::var("DATABASE_URL")
        .map_err(|_| "DATABASE_URL manquante (voir .env.example)".to_string())?;
    let pool = PgPoolOptions::new()
        .max_connections(1)
        .connect(&url)
        .await
        .map_err(|e| format!("Connexion à la base impossible : {e}"))?;
    MIGRATOR
        .run(&pool)
        .await
        .map_err(|e| format!("Échec des migrations : {e}"))?;
    println!("Migrations appliquées.");
    Ok(())
}
