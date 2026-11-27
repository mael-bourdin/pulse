//! Tests de contrat HAC-API-001 du simulateur (spec/testing.md, spec/features/F1-authentification.md).

use std::time::Duration;

use auth_simulator::{AppState, app, load_users};
use axum::Router;
use axum::body::Body;
use axum::http::{Request, StatusCode, header};
use http_body_util::BodyExt;
use serde_json::{Value, json};
use tower::ServiceExt;

const ALEX: (&str, &str) = ("alex.martin@demo.healthaicoach.fr", "DemoPassword!");
const LEA: (&str, &str) = ("lea.bernard@demo.healthaicoach.fr", "AdminDemo!");

fn simulator() -> Router {
    app(AppState::new(load_users().unwrap(), Duration::from_secs(3600)).unwrap())
}

async fn login(app: &Router, body: Value) -> (StatusCode, Option<String>, String) {
    let request = Request::post("/api/v1/auth/login")
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(body.to_string()))
        .unwrap();
    let response = app.clone().oneshot(request).await.unwrap();
    let status = response.status();
    let content_type = response
        .headers()
        .get(header::CONTENT_TYPE)
        .map(|v| v.to_str().unwrap().to_owned());
    let bytes = response.into_body().collect().await.unwrap().to_bytes();
    (
        status,
        content_type,
        String::from_utf8(bytes.to_vec()).unwrap(),
    )
}

#[tokio::test]
async fn acc_auth_02_endpoints_exposes() {
    let app = simulator();
    let (status, content_type, body) =
        login(&app, json!({ "email": ALEX.0, "password": ALEX.1 })).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(content_type.as_deref(), Some("application/json"));
    // Clés en camelCase, exactement celles du contrat.
    let body: Value = serde_json::from_str(&body).unwrap();
    let mut keys: Vec<&str> = body
        .as_object()
        .unwrap()
        .keys()
        .map(String::as_str)
        .collect();
    keys.sort_unstable();
    assert_eq!(
        keys,
        [
            "accessToken",
            "accountStatus",
            "displayName",
            "email",
            "expiresIn",
            "role",
            "tokenType",
            "userId"
        ]
    );
}

#[tokio::test]
async fn acc_auth_03_login_200_structure_contrat() {
    let app = simulator();
    let (status, _, body) = login(&app, json!({ "email": ALEX.0, "password": ALEX.1 })).await;
    assert_eq!(status, StatusCode::OK);
    let body: Value = serde_json::from_str(&body).unwrap();
    assert_eq!(body["userId"], "usr-10027");
    assert_eq!(body["email"], ALEX.0);
    assert_eq!(body["displayName"], "Alex Martin");
    assert_eq!(body["role"], "USER");
    assert_eq!(body["accountStatus"], "ACTIVE");
    assert_eq!(body["tokenType"], "Bearer");
    assert_eq!(body["expiresIn"], 3600);
    assert!(body["accessToken"].as_str().unwrap().len() >= 32);

    let (status, _, body) = login(&app, json!({ "email": LEA.0, "password": LEA.1 })).await;
    assert_eq!(status, StatusCode::OK);
    let body: Value = serde_json::from_str(&body).unwrap();
    assert_eq!(body["userId"], "adm-10001");
    assert_eq!(body["role"], "FUNCTIONAL_ADMIN");
}

#[tokio::test]
async fn acc_auth_03_cles_supplementaires_ignorees() {
    let app = simulator();
    let (status, _, _) = login(
        &app,
        json!({ "email": ALEX.0, "password": ALEX.1, "remember": true }),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
}

#[tokio::test]
async fn acc_auth_08_jeton_opaque_unique() {
    let app = simulator();
    let credentials = json!({ "email": ALEX.0, "password": ALEX.1 });
    let (_, _, first) = login(&app, credentials.clone()).await;
    let (_, _, second) = login(&app, credentials).await;
    let first: Value = serde_json::from_str(&first).unwrap();
    let second: Value = serde_json::from_str(&second).unwrap();
    let first = first["accessToken"].as_str().unwrap();
    // 256 bits aléatoires en hexadécimal (≥ 128 bits exigés), différents à chaque connexion.
    assert_eq!(first.len(), 64);
    assert!(first.chars().all(|c| c.is_ascii_hexdigit()));
    assert_ne!(first, second["accessToken"].as_str().unwrap());
}

#[tokio::test]
async fn acc_auth_09_jamais_de_mot_de_passe() {
    // Le fichier versionné ne contient que des hachés Argon2id.
    let stored = include_str!("../data/users.json");
    assert!(!stored.contains(ALEX.1));
    assert!(!stored.contains(LEA.1));
    let users = load_users().unwrap();
    assert_eq!(users.len(), 6);
    assert!(
        users
            .iter()
            .all(|u| u.password_hash.starts_with("$argon2id$"))
    );

    // La source de DATA ne contient aucun haché.
    assert!(!include_str!("../../../data/hac-data-001/users.json").contains("passwordHash"));

    // La réponse ne renvoie ni mot de passe ni haché.
    let app = simulator();
    let (_, _, body) = login(&app, json!({ "email": ALEX.0, "password": ALEX.1 })).await;
    assert!(!body.contains(ALEX.1));
    assert!(!body.contains("argon2"));
    assert!(!body.contains("password"));
}
