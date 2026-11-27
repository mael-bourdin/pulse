//! Socle de pulse-api (TECH-05) : santé, en-têtes, erreurs au format commun, site React.

use std::path::PathBuf;
use std::sync::Arc;

use axum::Router;
use axum::body::Body;
use axum::http::{Request, StatusCode, header};
use axum::routing::post;
use http_body_util::BodyExt;
use pulse_api::config::Config;
use pulse_api::error::ApiJson;
use pulse_api::{AppState, BODY_LIMIT, app};
use serde::Deserialize;
use serde_json::{Value, json};
use sqlx::PgPool;
use tower::ServiceExt;

fn site_dir() -> PathBuf {
    let dir = std::env::temp_dir().join("pulse-api-tests-site");
    std::fs::create_dir_all(&dir).unwrap();
    std::fs::write(
        dir.join("index.html"),
        "<!doctype html><title>PULSE</title>",
    )
    .unwrap();
    dir
}

fn test_app(pool: PgPool) -> Router {
    let config = Config {
        database_url: String::new(),
        port: 0,
        web_dist_dir: site_dir(),
        allowed_origins: vec!["http://localhost:8080".into()],
        auth_service_url: "http://localhost:1".into(),
        auth_timeout_ms: 100,
        login_rate_limit_per_min: 5,
        trust_proxy: false,
        cookie_secure: false,
        commit: "abc1234".into(),
    };
    app(AppState {
        pool,
        config: Arc::new(config),
        today: || chrono::NaiveDate::from_ymd_opt(2026, 2, 15).unwrap(),
    })
}

async fn send(
    router: Router,
    request: Request<Body>,
) -> (StatusCode, axum::http::HeaderMap, Value) {
    let response = router.oneshot(request).await.unwrap();
    let status = response.status();
    let headers = response.headers().clone();
    let bytes = response.into_body().collect().await.unwrap().to_bytes();
    let body = serde_json::from_slice(&bytes)
        .unwrap_or(Value::String(String::from_utf8_lossy(&bytes).into()));
    (status, headers, body)
}

fn get(uri: &str) -> Request<Body> {
    Request::get(uri).body(Body::empty()).unwrap()
}

#[sqlx::test(migrations = "../../migrations")]
async fn tech_05_health_verifie_la_base(pool: PgPool) {
    let (status, _, body) = send(test_app(pool), get("/health")).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(body["status"], "ok");
    assert_eq!(body["version"], env!("CARGO_PKG_VERSION"));
    assert_eq!(body["commit"], "abc1234");
}

#[sqlx::test(migrations = "../../migrations")]
async fn tech_05_health_503_si_la_base_ne_repond_pas(pool: PgPool) {
    pool.close().await;
    let (status, _, body) = send(test_app(pool), get("/health")).await;
    assert_eq!(status, StatusCode::SERVICE_UNAVAILABLE);
    assert_eq!(body["status"], "unavailable");
}

#[sqlx::test(migrations = "../../migrations")]
async fn tech_05_en_tetes_de_securite(pool: PgPool) {
    let (_, headers, _) = send(test_app(pool), get("/health")).await;
    assert_eq!(
        headers[header::CONTENT_SECURITY_POLICY],
        "default-src 'self'; img-src 'self' data:; style-src 'self'; frame-ancestors 'none'"
    );
    assert_eq!(headers[header::X_CONTENT_TYPE_OPTIONS], "nosniff");
    assert_eq!(headers[header::REFERRER_POLICY], "same-origin");
    assert!(headers.get(header::ACCESS_CONTROL_ALLOW_ORIGIN).is_none());
    assert!(headers.get("x-request-id").is_some());
}

#[sqlx::test(migrations = "../../migrations")]
async fn acc_gen_06_route_inconnue_404_json(pool: PgPool) {
    let (status, _, body) = send(test_app(pool), get("/api/v1/inconnue")).await;
    assert_eq!(status, StatusCode::NOT_FOUND);
    assert_eq!(
        body,
        json!({ "code": "NOT_FOUND", "message": "Élément introuvable." })
    );
}

#[sqlx::test(migrations = "../../migrations")]
async fn acc_gen_06_methode_405_json(pool: PgPool) {
    let request = Request::post("/health").body(Body::empty()).unwrap();
    let (status, _, body) = send(test_app(pool), request).await;
    assert_eq!(status, StatusCode::METHOD_NOT_ALLOWED);
    assert_eq!(body["code"], "METHOD_NOT_ALLOWED");
}

#[sqlx::test(migrations = "../../migrations")]
async fn tech_05_site_react_pour_les_autres_chemins(pool: PgPool) {
    let (status, _, body) = send(test_app(pool), get("/objectifs")).await;
    assert_eq!(status, StatusCode::OK);
    assert!(body.as_str().unwrap().contains("<title>PULSE</title>"));
}

// --- ApiJson : rejets techniques au format commun (spec/api/endpoints.md) ---

#[derive(Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
#[allow(dead_code)]
struct Payload {
    label: String,
    target_value: f64,
}

fn json_router() -> Router {
    Router::new()
        .route(
            "/t",
            post(|ApiJson(_): ApiJson<Payload>| async { StatusCode::NO_CONTENT }),
        )
        .layer(axum::extract::DefaultBodyLimit::max(BODY_LIMIT))
}

fn post_json(body: impl Into<Body>) -> Request<Body> {
    Request::post("/t")
        .header(header::CONTENT_TYPE, "application/json")
        .body(body.into())
        .unwrap()
}

#[tokio::test]
async fn acc_sec_03_corps_valide_accepte() {
    let (status, _, _) = send(
        json_router(),
        post_json(r#"{"label":"Marcher","targetValue":8000}"#),
    )
    .await;
    assert_eq!(status, StatusCode::NO_CONTENT);
}

#[tokio::test]
async fn acc_sec_03_json_illisible_400() {
    for body in ["{label", "[1,2]", "42"] {
        let (status, _, json) = send(json_router(), post_json(body)).await;
        assert_eq!(status, StatusCode::BAD_REQUEST, "{body}");
        assert_eq!(json["code"], "VALIDATION_ERROR");
        assert!(
            json.get("details")
                .is_some_and(|d| d.as_array().unwrap().is_empty())
        );
    }
}

#[tokio::test]
async fn acc_sec_03_type_incorrect_400() {
    let (status, _, json) = send(
        json_router(),
        post_json(r#"{"label":"Marcher","targetValue":"abc"}"#),
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert_eq!(json["details"][0]["field"], "targetValue");
    assert_eq!(json["details"][0]["message"], "Valeur invalide.");
}

#[tokio::test]
async fn acc_sec_03_champ_absent_400() {
    let (status, _, json) = send(json_router(), post_json(r#"{"targetValue":8000}"#)).await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert_eq!(json["details"][0]["field"], "label");
    assert_eq!(json["details"][0]["message"], "Champ obligatoire.");
}

#[tokio::test]
async fn acc_sec_03_cle_inconnue_400() {
    let (status, _, json) = send(
        json_router(),
        post_json(r#"{"label":"Marcher","targetValue":1,"userId":"usr-10028"}"#),
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert_eq!(json["details"][0]["field"], "userId");
}

#[tokio::test]
async fn acc_sec_03_content_type_415() {
    let request = Request::post("/t")
        .header(header::CONTENT_TYPE, "text/plain")
        .body(Body::from("{}"))
        .unwrap();
    let (status, _, json) = send(json_router(), request).await;
    assert_eq!(status, StatusCode::UNSUPPORTED_MEDIA_TYPE);
    assert_eq!(json["code"], "UNSUPPORTED_MEDIA_TYPE");
}

#[tokio::test]
async fn acc_sec_03_corps_trop_gros_413() {
    let big = format!(
        r#"{{"label":"{}","targetValue":1}}"#,
        "a".repeat(BODY_LIMIT)
    );
    let (status, _, json) = send(json_router(), post_json(big)).await;
    assert_eq!(status, StatusCode::PAYLOAD_TOO_LARGE);
    assert_eq!(json["code"], "PAYLOAD_TOO_LARGE");
}
