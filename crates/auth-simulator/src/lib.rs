//! Simulateur du service d'authentification HAC-API-001 (spec/features/F1-authentification.md,
//! contrat spec/api/auth.openapi.yaml).

mod tokens;
mod users;

use std::sync::Arc;
use std::time::{Duration, Instant};

use axum::extract::{Request, State};
use axum::http::StatusCode;
use axum::middleware::{self, Next};
use axum::response::{IntoResponse, Response};
use axum::routing::post;
use axum::{Json, Router};
use serde::{Deserialize, Serialize};

pub use tokens::TokenStore;
pub use users::{Account, AccountStatus, Role, User, hash_users, load_users};

/// Configuration lue dans l'environnement (spec/architecture.md → Variables).
pub struct Config {
    pub port: u16,
    pub token_ttl: Duration,
}

impl Config {
    pub fn from_env() -> Result<Self, String> {
        Ok(Self {
            port: env_or("AUTH_SIM_PORT", 8081)?,
            token_ttl: Duration::from_secs(env_or("AUTH_SIM_TOKEN_TTL", 3600)?),
        })
    }
}

fn env_or<T: std::str::FromStr>(name: &str, default: T) -> Result<T, String> {
    match std::env::var(name) {
        Ok(value) if !value.trim().is_empty() => {
            value.trim().parse().map_err(|_| format!("{name} invalide"))
        }
        _ => Ok(default),
    }
}

#[derive(Clone)]
pub struct AppState(Arc<Inner>);

struct Inner {
    users: Vec<User>,
    /// Haché d'un mot de passe aléatoire, vérifié quand l'adresse est inconnue (F1-R05).
    dummy_hash: String,
    tokens: TokenStore,
}

impl AppState {
    pub fn new(users: Vec<User>, token_ttl: Duration) -> Result<Self, String> {
        let mut secret = [0u8; 32];
        getrandom::fill(&mut secret).map_err(|e| format!("aléa indisponible : {e}"))?;
        let secret: String = secret.iter().map(|b| format!("{b:02x}")).collect();
        Ok(Self(Arc::new(Inner {
            users,
            dummy_hash: users::hash_password(&secret)?,
            tokens: TokenStore::new(token_ttl),
        })))
    }
}

pub fn app(state: AppState) -> Router {
    Router::new()
        .route("/api/v1/auth/login", post(login))
        .layer(middleware::from_fn(log_request))
        .with_state(state)
}

/// Une ligne par requête : méthode, chemin, statut, durée. Jamais de corps ni d'en-tête (F1-R10).
async fn log_request(request: Request, next: Next) -> Response {
    let method = request.method().clone();
    let path = request.uri().path().to_owned();
    let start = Instant::now();
    let response = next.run(request).await;
    tracing::info!(
        %method,
        path,
        status = response.status().as_u16(),
        duration_ms = start.elapsed().as_millis() as u64,
        "requête"
    );
    response
}

#[derive(Deserialize)]
struct LoginRequest {
    email: String,
    password: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct LoginResponse<'a> {
    #[serde(flatten)]
    account: &'a Account,
    access_token: String,
    token_type: &'static str,
    expires_in: u64,
}

#[derive(Serialize)]
struct ApiError {
    code: &'static str,
    message: &'static str,
}

fn error(status: StatusCode, code: &'static str, message: &'static str) -> Response {
    (status, Json(ApiError { code, message })).into_response()
}

fn bad_request() -> Response {
    error(
        StatusCode::BAD_REQUEST,
        "AUTH_BAD_REQUEST",
        "Invalid authentication request",
    )
}

fn internal_error() -> Response {
    error(
        StatusCode::INTERNAL_SERVER_ERROR,
        "INTERNAL_ERROR",
        "Internal error",
    )
}

/// `POST /api/v1/auth/login` (HAC-API-001 §4, F1-R03, F1-R05, F1-R06).
async fn login(State(state): State<AppState>, Json(request): Json<LoginRequest>) -> Response {
    let email = request.email.trim();
    if email.is_empty() || request.password.trim().is_empty() {
        return bad_request();
    }
    let user = state.0.users.iter().find(|u| u.account.email == email);
    // Toujours un calcul Argon2id, que l'adresse existe ou non : le temps de réponse ne trahit rien.
    let hash = user
        .map_or(&state.0.dummy_hash, |u| &u.password_hash)
        .clone();
    let password = request.password;
    let verified = tokio::task::spawn_blocking(move || users::verify_password(&hash, &password))
        .await
        .unwrap_or(false);

    let Some(user) = user.filter(|_| verified) else {
        return error(
            StatusCode::UNAUTHORIZED,
            "AUTH_INVALID_CREDENTIALS",
            "Invalid credentials",
        );
    };
    if user.account.account_status != AccountStatus::Active {
        return error(
            StatusCode::FORBIDDEN,
            "AUTH_ACCOUNT_DISABLED",
            "Account is disabled",
        );
    }
    let Ok(access_token) = state.0.tokens.issue(&user.account.user_id) else {
        return internal_error();
    };
    Json(LoginResponse {
        account: &user.account,
        access_token,
        token_type: "Bearer",
        expires_in: state.0.tokens.ttl().as_secs(),
    })
    .into_response()
}
