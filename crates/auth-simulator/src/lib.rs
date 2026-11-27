//! Simulateur du service d'authentification HAC-API-001 (spec/features/F1-authentification.md,
//! contrat spec/api/auth.openapi.yaml).

mod tokens;
mod users;

use std::sync::Arc;
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::{Duration, Instant};

use axum::extract::rejection::JsonRejection;
use axum::extract::{Request, State};
use axum::http::{HeaderMap, StatusCode, header};
use axum::middleware::{self, Next};
use axum::response::{IntoResponse, Response};
use axum::routing::{get, post};
use axum::{Json, Router};
use serde::{Deserialize, Serialize};
use serde_json::{Value, json};
use tower_http::catch_panic::CatchPanicLayer;

pub use tokens::TokenStore;
pub use users::{Account, AccountStatus, Role, User, hash_users, load_users};

/// Configuration lue dans l'environnement (spec/architecture.md → Variables).
pub struct Config {
    pub port: u16,
    pub token_ttl: Duration,
    /// `AUTH_SIM_UNAVAILABLE` : démarrer en renvoyant 503 (F1-R07).
    pub unavailable: bool,
    /// `AUTH_SIM_CONTROL_TOKEN` : sans lui, `/__control/availability` n'existe pas (F1-R12).
    pub control_token: Option<String>,
}

impl Config {
    pub fn from_env() -> Result<Self, String> {
        Ok(Self {
            port: env_or("AUTH_SIM_PORT", 8081)?,
            token_ttl: Duration::from_secs(env_or("AUTH_SIM_TOKEN_TTL", 3600)?),
            unavailable: env_or("AUTH_SIM_UNAVAILABLE", false)?,
            control_token: std::env::var("AUTH_SIM_CONTROL_TOKEN")
                .ok()
                .map(|token| token.trim().to_owned())
                .filter(|token| !token.is_empty()),
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
    available: AtomicBool,
    control_token: Option<String>,
}

impl AppState {
    pub fn new(users: Vec<User>, config: &Config) -> Result<Self, String> {
        let mut secret = [0u8; 32];
        getrandom::fill(&mut secret).map_err(|e| format!("aléa indisponible : {e}"))?;
        let secret: String = secret.iter().map(|b| format!("{b:02x}")).collect();
        Ok(Self(Arc::new(Inner {
            users,
            dummy_hash: users::hash_password(&secret)?,
            tokens: TokenStore::new(config.token_ttl),
            available: AtomicBool::new(!config.unavailable),
            control_token: config.control_token.clone(),
        })))
    }

    fn available(&self) -> bool {
        self.0.available.load(Ordering::SeqCst)
    }
}

pub fn app(state: AppState) -> Router {
    let mut router = Router::new()
        .route("/api/v1/auth/login", post(login))
        .route("/api/v1/auth/me", get(me))
        .route("/health", get(health));
    if state.0.control_token.is_some() {
        router = router.route("/__control/availability", post(set_availability));
    }
    with_common_layers(router).with_state(state)
}

/// Réponses JSON pour les routes inconnues et les paniques, journal de chaque requête (F1-R11).
fn with_common_layers(router: Router<AppState>) -> Router<AppState> {
    router
        .fallback(not_found)
        .method_not_allowed_fallback(method_not_allowed)
        .layer(CatchPanicLayer::custom(|_| internal_error()))
        .layer(middleware::from_fn(log_request))
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

fn unavailable() -> Response {
    error(
        StatusCode::SERVICE_UNAVAILABLE,
        "AUTH_SERVICE_UNAVAILABLE",
        "Authentication service temporarily unavailable",
    )
}

fn account_disabled() -> Response {
    error(
        StatusCode::FORBIDDEN,
        "AUTH_ACCOUNT_DISABLED",
        "Account is disabled",
    )
}

fn internal_error() -> Response {
    error(
        StatusCode::INTERNAL_SERVER_ERROR,
        "INTERNAL_ERROR",
        "Internal error",
    )
}

async fn not_found() -> Response {
    error(StatusCode::NOT_FOUND, "NOT_FOUND", "Not found")
}

async fn method_not_allowed() -> Response {
    error(
        StatusCode::METHOD_NOT_ALLOWED,
        "METHOD_NOT_ALLOWED",
        "Method not allowed",
    )
}

/// `email` et `password` textuels et non vides une fois trimés ; les autres clés sont ignorées.
fn credentials(body: &Value) -> Option<(&str, &str)> {
    let email = body.get("email")?.as_str()?.trim();
    let password = body.get("password")?.as_str()?;
    (!email.is_empty() && !password.trim().is_empty()).then_some((email, password))
}

/// `POST /api/v1/auth/login` (HAC-API-001 §4, F1-R03 à F1-R07).
/// Tout rejet de l'extracteur `Json` (JSON illisible, `Content-Type`, corps trop gros) donne 400.
async fn login(
    State(state): State<AppState>,
    body: Result<Json<Value>, JsonRejection>,
) -> Response {
    if !state.available() {
        return unavailable();
    }
    let Ok(Json(body)) = body else {
        return bad_request();
    };
    let Some((email, password)) = credentials(&body) else {
        return bad_request();
    };
    let user = state.0.users.iter().find(|u| u.account.email == email);
    // Toujours un calcul Argon2id, que l'adresse existe ou non : le temps de réponse ne trahit rien.
    let hash = user
        .map_or(&state.0.dummy_hash, |u| &u.password_hash)
        .clone();
    let password = password.to_owned();
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
        return account_disabled();
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

/// Jeton d'un en-tête `Authorization: Bearer <jeton>`, sinon rien.
fn bearer_token(headers: &HeaderMap) -> Option<&str> {
    let value = headers.get(header::AUTHORIZATION)?.to_str().ok()?;
    let (scheme, token) = value.split_once(' ')?;
    let token = token.trim();
    (scheme.eq_ignore_ascii_case("bearer") && !token.is_empty()).then_some(token)
}

/// `GET /api/v1/auth/me` (HAC-API-001 §5, F1-R09).
async fn me(State(state): State<AppState>, headers: HeaderMap) -> Response {
    if !state.available() {
        return unavailable();
    }
    let user = bearer_token(&headers)
        .and_then(|token| state.0.tokens.user_id(token))
        .and_then(|id| state.0.users.iter().find(|u| u.account.user_id == id));
    match user {
        None => error(
            StatusCode::UNAUTHORIZED,
            "AUTH_INVALID_TOKEN",
            "Invalid or missing access token",
        ),
        Some(user) if user.account.account_status != AccountStatus::Active => account_disabled(),
        Some(user) => Json(&user.account).into_response(),
    }
}

async fn health() -> Json<Value> {
    Json(json!({ "status": "ok" }))
}

#[derive(Deserialize)]
struct Availability {
    available: bool,
}

/// Comparaison en temps constant, pour ne pas laisser deviner le secret octet par octet.
fn same_secret(given: &[u8], expected: &[u8]) -> bool {
    given.len() == expected.len()
        && given
            .iter()
            .zip(expected)
            .fold(0u8, |diff, (a, b)| diff | (a ^ b))
            == 0
}

/// `POST /__control/availability` `{ "available": false }`, hors contrat (ADR-15, F1-R07, F1-R12).
async fn set_availability(
    State(state): State<AppState>,
    headers: HeaderMap,
    body: Result<Json<Availability>, JsonRejection>,
) -> Response {
    let expected = state.0.control_token.as_deref().unwrap_or_default();
    let given = headers
        .get("x-control-token")
        .and_then(|value| value.to_str().ok())
        .unwrap_or_default();
    if expected.is_empty() || !same_secret(given.as_bytes(), expected.as_bytes()) {
        return error(
            StatusCode::UNAUTHORIZED,
            "CONTROL_UNAUTHORIZED",
            "Invalid or missing control token",
        );
    }
    let Ok(Json(Availability { available })) = body else {
        return error(
            StatusCode::BAD_REQUEST,
            "CONTROL_BAD_REQUEST",
            "Expected { \"available\": true | false }",
        );
    };
    state.0.available.store(available, Ordering::SeqCst);
    tracing::info!(available, "disponibilité du simulateur modifiée");
    Json(json!({ "available": available })).into_response()
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::body::Body;
    use http_body_util::BodyExt;
    use tower::ServiceExt;

    fn config() -> Config {
        Config {
            port: 0,
            token_ttl: Duration::from_secs(3600),
            unavailable: false,
            control_token: None,
        }
    }

    async fn call(app: Router, request: Request) -> (StatusCode, Value) {
        let response = app.oneshot(request).await.unwrap();
        let status = response.status();
        let bytes = response.into_body().collect().await.unwrap().to_bytes();
        (status, serde_json::from_slice(&bytes).unwrap())
    }

    #[tokio::test]
    async fn acc_auth_08_compte_devenu_desactive_403() {
        // Aucun login ne donne de jeton à un compte DISABLED : on en crée un directement.
        let state = AppState::new(load_users().unwrap(), &config()).unwrap();
        let token = state.0.tokens.issue("usr-10029").unwrap();
        let request = Request::get("/api/v1/auth/me")
            .header(header::AUTHORIZATION, format!("Bearer {token}"))
            .body(Body::empty())
            .unwrap();
        let (status, body) = call(app(state), request).await;
        assert_eq!(status, StatusCode::FORBIDDEN);
        assert_eq!(body["code"], "AUTH_ACCOUNT_DISABLED");
    }

    #[tokio::test]
    async fn acc_sec_07_panique_500_generique() {
        let state = AppState::new(Vec::new(), &config()).unwrap();
        async fn panique() -> &'static str {
            panic!("détail interne à ne jamais renvoyer")
        }
        let router: Router<AppState> = Router::new().route("/panique", get(panique));
        let app = with_common_layers(router).with_state(state);
        let request = Request::get("/panique").body(Body::empty()).unwrap();
        let (status, body) = call(app, request).await;
        assert_eq!(status, StatusCode::INTERNAL_SERVER_ERROR);
        assert_eq!(
            body,
            json!({ "code": "INTERNAL_ERROR", "message": "Internal error" })
        );
    }
}
