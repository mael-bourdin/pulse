//! Configuration lue une seule fois au démarrage (spec/architecture.md → Configuration).

use std::env;
use std::path::PathBuf;

#[derive(Debug, Clone)]
pub struct Config {
    pub database_url: String,
    pub port: u16,
    pub web_dist_dir: PathBuf,
    /// Origines acceptées sur les écritures (F1-R29).
    pub allowed_origins: Vec<String>,
    pub auth_service_url: String,
    pub auth_timeout_ms: u64,
    pub login_rate_limit_per_min: u32,
    pub trust_proxy: bool,
    /// `true` en ligne : cookie `Secure` et en-tête HSTS.
    pub cookie_secure: bool,
    /// Commit affiché par `/health` (`RAILWAY_GIT_COMMIT_SHA`), `local` sur un poste.
    pub commit: String,
}

impl Config {
    pub fn from_env() -> Result<Self, String> {
        Ok(Self {
            database_url: required("DATABASE_URL")?,
            port: parsed("PORT", 8080)?,
            web_dist_dir: PathBuf::from(optional("WEB_DIST_DIR", "apps/web/dist")),
            allowed_origins: optional("ALLOWED_ORIGINS", "")
                .split(',')
                .map(str::trim)
                .filter(|origin| !origin.is_empty())
                .map(String::from)
                .collect(),
            auth_service_url: optional("AUTH_SERVICE_URL", "http://localhost:8081"),
            auth_timeout_ms: parsed("AUTH_TIMEOUT_MS", 3000)?,
            login_rate_limit_per_min: parsed("LOGIN_RATE_LIMIT_PER_MIN", 5)?,
            trust_proxy: parsed("TRUST_PROXY", false)?,
            cookie_secure: parsed("COOKIE_SECURE", false)?,
            commit: env::var("RAILWAY_GIT_COMMIT_SHA")
                .map(|sha| sha.chars().take(7).collect())
                .unwrap_or_else(|_| "local".to_string()),
        })
    }
}

fn required(name: &str) -> Result<String, String> {
    env::var(name).map_err(|_| format!("{name} manquante (voir .env.example)"))
}

fn optional(name: &str, default: &str) -> String {
    env::var(name).unwrap_or_else(|_| default.to_string())
}

fn parsed<T: std::str::FromStr>(name: &str, default: T) -> Result<T, String> {
    match env::var(name) {
        Ok(value) => value
            .trim()
            .parse()
            .map_err(|_| format!("{name} invalide : « {value} »")),
        Err(_) => Ok(default),
    }
}
