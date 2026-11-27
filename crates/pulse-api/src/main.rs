//! Binaire `pulse-api`.
//!
//! - `pulse-api` (ou `pulse-api serve`) : lance le serveur sur `[::]:PORT` ;
//! - `pulse-api migrate` : applique les migrations SQL (pré-déploiement Railway, `make migrate`) ;
//! - `pulse-api seed --reset` : efface les données et recharge HAC-DATA-001 (`make seed`).

use std::net::{Ipv6Addr, SocketAddr};
use std::process::ExitCode;
use std::sync::Arc;

use pulse_api::config::Config;
use pulse_api::{AppState, app, pool, seed};
use tracing_subscriber::EnvFilter;

/// Migrations du dossier `migrations/`, intégrées au binaire à la compilation.
static MIGRATOR: sqlx::migrate::Migrator = sqlx::migrate!("../../migrations");

#[tokio::main]
async fn main() -> ExitCode {
    tracing_subscriber::fmt()
        .json()
        .with_env_filter(EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()))
        .init();

    let command = std::env::args().nth(1).unwrap_or_else(|| "serve".into());
    let result = match Config::from_env() {
        Err(message) => Err(message),
        Ok(config) => match command.as_str() {
            "serve" => serve(config).await,
            "migrate" => migrate(&config).await,
            "seed" if std::env::args().nth(2).as_deref() == Some("--reset") => seed(&config).await,
            _ => {
                eprintln!("Usage : pulse-api [serve | migrate | seed --reset]");
                eprintln!(
                    "  seed --reset efface toutes les données PULSE avant de recharger HAC-DATA-001."
                );
                return ExitCode::from(2);
            }
        },
    };
    match result {
        Ok(()) => ExitCode::SUCCESS,
        Err(message) => {
            eprintln!("{message}");
            ExitCode::FAILURE
        }
    }
}

async fn serve(config: Config) -> Result<(), String> {
    let pool = pool(&config.database_url).map_err(|e| format!("DATABASE_URL invalide : {e}"))?;
    let address = SocketAddr::from((Ipv6Addr::UNSPECIFIED, config.port));
    let listener = tokio::net::TcpListener::bind(address)
        .await
        .map_err(|e| format!("Impossible d'écouter sur {address} : {e}"))?;
    tracing::info!(%address, "pulse-api démarré");
    let state = AppState {
        pool,
        config: Arc::new(config),
    };
    axum::serve(listener, app(state))
        .with_graceful_shutdown(async {
            let _ = tokio::signal::ctrl_c().await;
        })
        .await
        .map_err(|e| format!("Serveur arrêté : {e}"))
}

async fn migrate(config: &Config) -> Result<(), String> {
    let pool = pool(&config.database_url).map_err(|e| format!("DATABASE_URL invalide : {e}"))?;
    MIGRATOR
        .run(&pool)
        .await
        .map_err(|e| format!("Échec des migrations : {e}"))?;
    println!("Migrations appliquées.");
    Ok(())
}

async fn seed(config: &Config) -> Result<(), String> {
    let pool = pool(&config.database_url).map_err(|e| format!("DATABASE_URL invalide : {e}"))?;
    seed::reset(&pool).await?;
    println!("Données HAC-DATA-001 rechargées.");
    Ok(())
}
