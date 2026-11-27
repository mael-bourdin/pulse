//! Serveur PULSE : API `/api/v1` et site React compilé, sur la même origine (spec/architecture.md).

pub mod config;
pub mod error;

use std::sync::Arc;
use std::time::Duration;

use axum::extract::{DefaultBodyLimit, MatchedPath, Request, State};
use axum::http::{HeaderName, HeaderValue, StatusCode, header};
use axum::response::{IntoResponse, Response};
use axum::routing::get;
use axum::{Json, Router};
use serde_json::json;
use sqlx::PgPool;
use sqlx::postgres::PgPoolOptions;
use tower_http::catch_panic::CatchPanicLayer;
use tower_http::request_id::{MakeRequestUuid, PropagateRequestIdLayer, SetRequestIdLayer};
use tower_http::services::{ServeDir, ServeFile};
use tower_http::set_header::SetResponseHeaderLayer;
use tower_http::trace::TraceLayer;
use tracing::Span;

use crate::config::Config;
use crate::error::{AppError, ErrorCode};

/// Taille maximale d'un corps de requête (spec/security.md → Entrées malveillantes).
pub const BODY_LIMIT: usize = 16 * 1024;

const REQUEST_ID: HeaderName = HeaderName::from_static("x-request-id");
const CSP: &str =
    "default-src 'self'; img-src 'self' data:; style-src 'self'; frame-ancestors 'none'";

/// État partagé par les routes.
#[derive(Clone)]
pub struct AppState {
    pub pool: PgPool,
    pub config: Arc<Config>,
}

/// Pool sqlx : aucune connexion gardée au repos, pour que Railway et Neon puissent
/// se mettre en veille (spec/architecture.md → Configuration). La connexion est
/// paresseuse : le serveur démarre même si la base ne répond pas encore.
pub fn pool(database_url: &str) -> Result<PgPool, sqlx::Error> {
    PgPoolOptions::new()
        .min_connections(0)
        .max_connections(5)
        .idle_timeout(Duration::from_secs(60))
        .acquire_timeout(Duration::from_secs(5))
        .connect_lazy(database_url)
}

/// Application complète : `/health`, `/api/v1`, puis le site React pour les autres chemins.
pub fn app(state: AppState) -> Router {
    let site = ServeDir::new(&state.config.web_dist_dir)
        .fallback(ServeFile::new(state.config.web_dist_dir.join("index.html")));
    let hsts = state.config.cookie_secure.then(|| {
        SetResponseHeaderLayer::overriding(
            header::STRICT_TRANSPORT_SECURITY,
            HeaderValue::from_static("max-age=31536000"),
        )
    });

    Router::new()
        .route("/health", get(health))
        .nest("/api/v1", api())
        .method_not_allowed_fallback(|| async { AppError::MethodNotAllowed })
        .fallback_service(site)
        .layer(DefaultBodyLimit::max(BODY_LIMIT))
        .layer(tower::util::option_layer(hsts))
        .layer(SetResponseHeaderLayer::overriding(
            header::CONTENT_SECURITY_POLICY,
            HeaderValue::from_static(CSP),
        ))
        .layer(SetResponseHeaderLayer::overriding(
            header::X_CONTENT_TYPE_OPTIONS,
            HeaderValue::from_static("nosniff"),
        ))
        .layer(SetResponseHeaderLayer::overriding(
            header::REFERRER_POLICY,
            HeaderValue::from_static("same-origin"),
        ))
        .layer(CatchPanicLayer::custom(|_| {
            AppError::Internal("panique dans un handler".into()).into_response()
        }))
        .layer(
            TraceLayer::new_for_http()
                .make_span_with(request_span)
                .on_request(())
                .on_response(log_response),
        )
        .layer(PropagateRequestIdLayer::new(REQUEST_ID))
        .layer(SetRequestIdLayer::new(REQUEST_ID, MakeRequestUuid))
        .with_state(state)
}

/// Routes `/api/v1`. Les fonctionnalités F1 à F6 s'y ajoutent.
fn api() -> Router<AppState> {
    Router::new()
        .method_not_allowed_fallback(|| async { AppError::MethodNotAllowed })
        .fallback(|| async { AppError::NotFound })
}

/// `GET /health` : vérifie la base, n'appelle jamais le service d'auth (spec/hosting.md).
async fn health(State(state): State<AppState>) -> Response {
    let database_ok = sqlx::query("SELECT 1").execute(&state.pool).await.is_ok();
    let status = if database_ok {
        StatusCode::OK
    } else {
        StatusCode::SERVICE_UNAVAILABLE
    };
    let body = json!({
        "status": if database_ok { "ok" } else { "unavailable" },
        "version": env!("CARGO_PKG_VERSION"),
        "commit": state.config.commit,
    });
    (status, Json(body)).into_response()
}

/// Journal d'une requête : identifiant, méthode, route, statut, durée, code d'erreur.
/// Jamais de corps, de cookie, d'en-tête `Authorization`, d'e-mail ni de `user_id`
/// (spec/security.md → Journaux). Le champ `role` est rempli par la session (F1).
fn request_span(request: &Request) -> Span {
    let route = request
        .extensions()
        .get::<MatchedPath>()
        .map(MatchedPath::as_str)
        .unwrap_or("(site)");
    let request_id = request
        .headers()
        .get(REQUEST_ID)
        .and_then(|value| value.to_str().ok())
        .unwrap_or_default();
    tracing::info_span!(
        "request",
        request_id,
        method = %request.method(),
        route,
        role = tracing::field::Empty,
    )
}

fn log_response(response: &Response, latency: Duration, _span: &Span) {
    let code = response.extensions().get::<ErrorCode>().map(|code| code.0);
    tracing::info!(
        status = response.status().as_u16(),
        duration_ms = latency.as_millis() as u64,
        code,
        "réponse"
    );
}
