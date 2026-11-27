//! Tests de contrat HAC-API-001 du simulateur (spec/testing.md, spec/features/F1-authentification.md).

use std::time::{Duration, Instant};

use auth_simulator::{AppState, Config, app, load_users};
use axum::Router;
use axum::body::Body;
use axum::http::{Request, StatusCode, header};
use http_body_util::BodyExt;
use serde_json::{Value, json};
use tower::ServiceExt;

const ALEX: (&str, &str) = ("alex.martin@demo.healthaicoach.fr", "DemoPassword!");
const LEA: (&str, &str) = ("lea.bernard@demo.healthaicoach.fr", "AdminDemo!");
const THOMAS: (&str, &str) = ("thomas.roy@demo.healthaicoach.fr", "DemoPassword!");
const CONTROL_TOKEN: &str = "jeton-de-pilotage-de-test";

fn config() -> Config {
    Config {
        port: 0,
        token_ttl: Duration::from_secs(3600),
        unavailable: false,
        control_token: Some(CONTROL_TOKEN.to_owned()),
    }
}

fn simulator_with(config: Config) -> Router {
    app(AppState::new(load_users().unwrap(), &config).unwrap())
}

fn simulator() -> Router {
    simulator_with(config())
}

async fn login(app: &Router, body: Value) -> (StatusCode, Option<String>, String) {
    let request = Request::post("/api/v1/auth/login")
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(body.to_string()))
        .unwrap();
    send(app, request).await
}

async fn access_token(app: &Router, (email, password): (&str, &str)) -> String {
    let (status, _, body) = login(app, json!({ "email": email, "password": password })).await;
    assert_eq!(status, StatusCode::OK);
    let body: Value = serde_json::from_str(&body).unwrap();
    body["accessToken"].as_str().unwrap().to_owned()
}

async fn me(app: &Router, authorization: Option<&str>) -> (StatusCode, Option<String>, String) {
    let mut request = Request::get("/api/v1/auth/me");
    if let Some(value) = authorization {
        request = request.header(header::AUTHORIZATION, value);
    }
    send(app, request.body(Body::empty()).unwrap()).await
}

async fn control(app: &Router, token: Option<&str>, available: bool) -> StatusCode {
    let mut request =
        Request::post("/__control/availability").header(header::CONTENT_TYPE, "application/json");
    if let Some(token) = token {
        request = request.header("x-control-token", token);
    }
    let body = Body::from(json!({ "available": available }).to_string());
    send(app, request.body(body).unwrap()).await.0
}

/// Vérifie une erreur au format du contrat : statut, JSON `{ code, message }`, rien d'autre.
fn assert_error(reply: (StatusCode, Option<String>, String), status: StatusCode, code: &str) {
    let (actual, content_type, body) = reply;
    assert_eq!(actual, status, "{body}");
    assert_eq!(content_type.as_deref(), Some("application/json"));
    let body: Value = serde_json::from_str(&body).unwrap();
    assert_eq!(body["code"], code);
    assert!(body["message"].is_string());
    assert_eq!(body.as_object().unwrap().len(), 2);
}

async fn send(app: &Router, request: Request<Body>) -> (StatusCode, Option<String>, String) {
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

#[tokio::test]
async fn acc_auth_02_me_expose() {
    let app = simulator();
    let token = access_token(&app, ALEX).await;
    let (status, content_type, _) = me(&app, Some(&format!("Bearer {token}"))).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(content_type.as_deref(), Some("application/json"));
}

#[tokio::test]
async fn acc_auth_04_requete_invalide_400() {
    let app = simulator();
    let cases = [
        json!([ALEX.0, ALEX.1]),
        json!({ "password": ALEX.1 }),
        json!({ "email": "", "password": ALEX.1 }),
        json!({ "email": "   ", "password": ALEX.1 }),
        json!({ "email": ALEX.0, "password": "  " }),
        json!({ "email": ALEX.0, "password": 12 }),
        json!(null),
    ];
    for body in cases {
        assert_error(
            login(&app, body).await,
            StatusCode::BAD_REQUEST,
            "AUTH_BAD_REQUEST",
        );
    }
    // JSON illisible : Axum répondrait 400 en texte.
    let request = Request::post("/api/v1/auth/login")
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from("{ pas du json"))
        .unwrap();
    assert_error(
        send(&app, request).await,
        StatusCode::BAD_REQUEST,
        "AUTH_BAD_REQUEST",
    );
}

#[tokio::test]
async fn acc_auth_04_type_incorrect_400() {
    let reply = login(&simulator(), json!({ "email": 42, "password": ALEX.1 })).await;
    assert_error(reply, StatusCode::BAD_REQUEST, "AUTH_BAD_REQUEST");
}

#[tokio::test]
async fn acc_auth_04_champ_manquant_400() {
    let reply = login(&simulator(), json!({ "email": ALEX.0 })).await;
    assert_error(reply, StatusCode::BAD_REQUEST, "AUTH_BAD_REQUEST");
}

#[tokio::test]
async fn acc_auth_04_sans_content_type_400() {
    // Axum répondrait 415.
    let body = json!({ "email": ALEX.0, "password": ALEX.1 }).to_string();
    let request = Request::post("/api/v1/auth/login")
        .body(Body::from(body))
        .unwrap();
    let reply = send(&simulator(), request).await;
    assert_error(reply, StatusCode::BAD_REQUEST, "AUTH_BAD_REQUEST");
}

#[tokio::test]
async fn acc_auth_04_corps_trop_gros_400() {
    // Axum répondrait 413 au-delà de 2 Mo.
    let padding = "a".repeat(3 * 1024 * 1024);
    let body = json!({ "email": ALEX.0, "password": ALEX.1, "padding": padding }).to_string();
    let request = Request::post("/api/v1/auth/login")
        .header(header::CONTENT_TYPE, "application/json")
        .body(Body::from(body))
        .unwrap();
    let reply = send(&simulator(), request).await;
    assert_error(reply, StatusCode::BAD_REQUEST, "AUTH_BAD_REQUEST");
}

#[tokio::test]
async fn acc_auth_05_401_identique_adresse_connue_ou_non() {
    let app = simulator();
    let start = Instant::now();
    let known = login(&app, json!({ "email": ALEX.0, "password": "Mauvais!" })).await;
    let known_duration = start.elapsed();
    let start = Instant::now();
    let unknown = login(
        &app,
        json!({ "email": "inconnu@demo.healthaicoach.fr", "password": "Mauvais!" }),
    )
    .await;
    let unknown_duration = start.elapsed();

    assert_eq!(known.0, StatusCode::UNAUTHORIZED);
    assert_eq!(known, unknown, "corps et statut identiques");
    let body: Value = serde_json::from_str(&known.2).unwrap();
    assert_eq!(body["code"], "AUTH_INVALID_CREDENTIALS");
    // Le haché factice fait le même travail : un écart d'un facteur 4 trahirait l'adresse.
    assert!(
        unknown_duration * 4 > known_duration,
        "{unknown_duration:?} / {known_duration:?}"
    );
}

#[tokio::test]
async fn acc_auth_06_compte_desactive_403() {
    let app = simulator();
    let reply = login(&app, json!({ "email": THOMAS.0, "password": THOMAS.1 })).await;
    assert_error(reply, StatusCode::FORBIDDEN, "AUTH_ACCOUNT_DISABLED");
    // Mauvais mot de passe : 401, l'état du compte n'est pas révélé.
    let reply = login(&app, json!({ "email": THOMAS.0, "password": "Mauvais!" })).await;
    assert_error(reply, StatusCode::UNAUTHORIZED, "AUTH_INVALID_CREDENTIALS");
}

#[tokio::test]
async fn acc_auth_07_indisponibilite_503() {
    // Au démarrage, avec AUTH_SIM_UNAVAILABLE=true.
    let app = simulator_with(Config {
        unavailable: true,
        ..config()
    });
    let reply = login(&app, json!({ "email": ALEX.0, "password": ALEX.1 })).await;
    assert_error(
        reply,
        StatusCode::SERVICE_UNAVAILABLE,
        "AUTH_SERVICE_UNAVAILABLE",
    );
    assert_error(
        me(&app, Some("Bearer x")).await,
        StatusCode::SERVICE_UNAVAILABLE,
        "AUTH_SERVICE_UNAVAILABLE",
    );

    // Sans redémarrage, par la route de pilotage.
    let app = simulator();
    let token = access_token(&app, ALEX).await;
    let bearer = format!("Bearer {token}");
    assert_eq!(
        control(&app, Some(CONTROL_TOKEN), false).await,
        StatusCode::OK
    );
    let reply = login(&app, json!({ "email": ALEX.0, "password": ALEX.1 })).await;
    assert_error(
        reply,
        StatusCode::SERVICE_UNAVAILABLE,
        "AUTH_SERVICE_UNAVAILABLE",
    );
    assert_error(
        me(&app, Some(&bearer)).await,
        StatusCode::SERVICE_UNAVAILABLE,
        "AUTH_SERVICE_UNAVAILABLE",
    );
    assert_eq!(
        control(&app, Some(CONTROL_TOKEN), true).await,
        StatusCode::OK
    );
    assert_eq!(me(&app, Some(&bearer)).await.0, StatusCode::OK);
}

#[tokio::test]
async fn acc_auth_07_pilotage_protege() {
    let app = simulator();
    assert_eq!(control(&app, None, false).await, StatusCode::UNAUTHORIZED);
    assert_eq!(
        control(&app, Some("mauvais"), false).await,
        StatusCode::UNAUTHORIZED
    );
    // Toujours disponible après ces tentatives.
    let reply = login(&app, json!({ "email": ALEX.0, "password": ALEX.1 })).await;
    assert_eq!(reply.0, StatusCode::OK);

    // Sans AUTH_SIM_CONTROL_TOKEN, la route n'existe pas.
    let app = simulator_with(Config {
        control_token: None,
        ..config()
    });
    assert_eq!(
        control(&app, Some(CONTROL_TOKEN), false).await,
        StatusCode::NOT_FOUND
    );
}

#[tokio::test]
async fn acc_auth_08_jeton_me() {
    let app = simulator();
    let token = access_token(&app, ALEX).await;
    let (status, _, body) = me(&app, Some(&format!("Bearer {token}"))).await;
    assert_eq!(status, StatusCode::OK);
    let body: Value = serde_json::from_str(&body).unwrap();
    assert_eq!(
        body,
        json!({
            "userId": "usr-10027",
            "email": ALEX.0,
            "displayName": "Alex Martin",
            "role": "USER",
            "accountStatus": "ACTIVE"
        })
    );

    for authorization in [
        None,
        Some("Bearer"),
        Some("Bearer "),
        Some("Bearer inconnu"),
    ] {
        assert_error(
            me(&app, authorization).await,
            StatusCode::UNAUTHORIZED,
            "AUTH_INVALID_TOKEN",
        );
    }

    // Jeton expiré.
    let app = simulator_with(Config {
        token_ttl: Duration::ZERO,
        ..config()
    });
    let token = access_token(&app, ALEX).await;
    assert_error(
        me(&app, Some(&format!("Bearer {token}"))).await,
        StatusCode::UNAUTHORIZED,
        "AUTH_INVALID_TOKEN",
    );
}

#[tokio::test]
async fn acc_auth_08_en_tete_non_bearer_401() {
    let app = simulator();
    let token = access_token(&app, ALEX).await;
    assert_error(
        me(&app, Some(&format!("Basic {token}"))).await,
        StatusCode::UNAUTHORIZED,
        "AUTH_INVALID_TOKEN",
    );
    assert_error(
        me(&app, Some(&token)).await,
        StatusCode::UNAUTHORIZED,
        "AUTH_INVALID_TOKEN",
    );
}

#[tokio::test]
async fn acc_sec_07_route_inconnue_404() {
    let app = simulator();
    let request = Request::get("/api/v1/auth/inconnue")
        .body(Body::empty())
        .unwrap();
    assert_error(
        send(&app, request).await,
        StatusCode::NOT_FOUND,
        "NOT_FOUND",
    );
    let request = Request::get("/api/v1/auth/login")
        .body(Body::empty())
        .unwrap();
    assert_error(
        send(&app, request).await,
        StatusCode::METHOD_NOT_ALLOWED,
        "METHOD_NOT_ALLOWED",
    );
}
