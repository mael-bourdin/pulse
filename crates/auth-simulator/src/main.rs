//! Simulateur du service d'authentification HAC-API-001 (voir spec/features/F1-authentification.md).
//!
//! - `auth-simulator` : démarre le service sur `AUTH_SIM_PORT` (8081) ;
//! - `auth-simulator hash-users` : régénère `data/users.json` (hachés Argon2id) à partir de
//!   `data/hac-data-001/users.json`, en demandant le mot de passe de démo de chaque compte.

use std::io::{BufRead, Write};
use std::net::{Ipv6Addr, SocketAddr};
use std::process::ExitCode;

use auth_simulator::{AppState, Config, app, hash_users, load_users};
use tracing_subscriber::EnvFilter;

const SOURCE: &str = concat!(
    env!("CARGO_MANIFEST_DIR"),
    "/../../data/hac-data-001/users.json"
);
const TARGET: &str = concat!(env!("CARGO_MANIFEST_DIR"), "/data/users.json");

#[tokio::main]
async fn main() -> ExitCode {
    let result = match std::env::args().nth(1).as_deref() {
        None => serve().await,
        Some("hash-users") => hash_users_command(),
        Some(_) => Err("usage : auth-simulator [hash-users]".to_owned()),
    };
    match result {
        Ok(()) => ExitCode::SUCCESS,
        Err(message) => {
            eprintln!("auth-simulator : {message}");
            ExitCode::FAILURE
        }
    }
}

async fn serve() -> Result<(), String> {
    tracing_subscriber::fmt()
        .with_env_filter(EnvFilter::try_from_default_env().unwrap_or_else(|_| "info".into()))
        .init();
    let config = Config::from_env()?;
    let state = AppState::new(load_users()?, &config)?;
    // `::` : écoute en IPv4 et IPv6, le réseau privé de Railway étant en IPv6.
    let address = SocketAddr::from((Ipv6Addr::UNSPECIFIED, config.port));
    let listener = tokio::net::TcpListener::bind(address)
        .await
        .map_err(|e| format!("port {} indisponible : {e}", config.port))?;
    tracing::info!(port = config.port, "simulateur d'authentification démarré");
    axum::serve(listener, app(state))
        .with_graceful_shutdown(async {
            let _ = tokio::signal::ctrl_c().await;
        })
        .await
        .map_err(|e| e.to_string())
}

fn hash_users_command() -> Result<(), String> {
    let source = std::fs::read_to_string(SOURCE).map_err(|e| format!("{SOURCE} : {e}"))?;
    let stdin = std::io::stdin();
    let mut lines = stdin.lock().lines();
    let json = hash_users(&source, |email| {
        eprint!("Mot de passe de {email} : ");
        let _ = std::io::stderr().flush();
        match lines.next() {
            Some(Ok(line)) => Ok(line.trim_end_matches(['\r', '\n']).to_owned()),
            _ => Err(format!("aucun mot de passe lu pour {email}")),
        }
    })?;
    std::fs::write(TARGET, json).map_err(|e| format!("{TARGET} : {e}"))?;
    eprintln!("{TARGET} régénéré.");
    Ok(())
}
