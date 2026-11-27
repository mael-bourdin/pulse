//! Erreurs de l'API : toujours `{ code, message, details? }` (ADR-08, spec/api/endpoints.md → Erreurs).

use axum::extract::rejection::BytesRejection;
use axum::extract::{FromRequest, Request};
use axum::http::{StatusCode, header};
use axum::response::{IntoResponse, Response};
use axum::{Json, body::Bytes};
use serde::Serialize;
use serde::de::DeserializeOwned;

/// Champ fautif d'une erreur `VALIDATION_ERROR`.
#[derive(Debug, Clone, PartialEq, Serialize)]
pub struct FieldError {
    pub field: String,
    pub message: String,
}

impl FieldError {
    pub fn new(field: impl Into<String>, message: &str) -> Self {
        Self {
            field: field.into(),
            message: message.to_string(),
        }
    }
}

/// Catalogue des erreurs de spec/api/endpoints.md.
#[derive(Debug)]
pub enum AppError {
    Validation(Vec<FieldError>),
    LoginInvalidRequest,
    LoginInvalidCredentials,
    SessionExpired,
    Unauthenticated,
    /// Refus à la connexion (message de la page de connexion).
    AccountDisabledAtLogin,
    /// Compte désactivé en cours de session.
    AccountDisabled,
    Forbidden,
    OriginRejected,
    NotFound,
    MethodNotAllowed,
    PayloadTooLarge,
    UnsupportedMediaType,
    /// Message précis selon la transition refusée.
    InvalidState(&'static str),
    /// « Ce défi n'a pas encore commencé. » ou « Ce défi est terminé. » (F4-R05).
    ChallengeNotJoinable(&'static str),
    AlreadyJoined,
    NotJoined,
    TooManyAttempts,
    AuthUnavailable,
    /// Le détail est journalisé côté serveur, jamais renvoyé (ACC-SEC-07).
    Internal(String),
}

/// Code d'erreur rangé dans les extensions de la réponse, pour les journaux.
#[derive(Debug, Clone, Copy)]
pub struct ErrorCode(pub &'static str);

impl AppError {
    pub fn status(&self) -> StatusCode {
        match self {
            Self::Validation(_) | Self::LoginInvalidRequest => StatusCode::BAD_REQUEST,
            Self::LoginInvalidCredentials | Self::SessionExpired | Self::Unauthenticated => {
                StatusCode::UNAUTHORIZED
            }
            Self::AccountDisabledAtLogin
            | Self::AccountDisabled
            | Self::Forbidden
            | Self::OriginRejected => StatusCode::FORBIDDEN,
            Self::NotFound => StatusCode::NOT_FOUND,
            Self::MethodNotAllowed => StatusCode::METHOD_NOT_ALLOWED,
            Self::PayloadTooLarge => StatusCode::PAYLOAD_TOO_LARGE,
            Self::UnsupportedMediaType => StatusCode::UNSUPPORTED_MEDIA_TYPE,
            Self::InvalidState(_)
            | Self::ChallengeNotJoinable(_)
            | Self::AlreadyJoined
            | Self::NotJoined => StatusCode::CONFLICT,
            Self::TooManyAttempts => StatusCode::TOO_MANY_REQUESTS,
            Self::AuthUnavailable => StatusCode::SERVICE_UNAVAILABLE,
            Self::Internal(_) => StatusCode::INTERNAL_SERVER_ERROR,
        }
    }

    pub fn code(&self) -> &'static str {
        match self {
            Self::Validation(_) => "VALIDATION_ERROR",
            Self::LoginInvalidRequest => "LOGIN_INVALID_REQUEST",
            Self::LoginInvalidCredentials => "LOGIN_INVALID_CREDENTIALS",
            Self::SessionExpired => "SESSION_EXPIRED",
            Self::Unauthenticated => "UNAUTHENTICATED",
            Self::AccountDisabledAtLogin | Self::AccountDisabled => "ACCOUNT_DISABLED",
            Self::Forbidden => "FORBIDDEN",
            Self::OriginRejected => "ORIGIN_REJECTED",
            Self::NotFound => "NOT_FOUND",
            Self::MethodNotAllowed => "METHOD_NOT_ALLOWED",
            Self::PayloadTooLarge => "PAYLOAD_TOO_LARGE",
            Self::UnsupportedMediaType => "UNSUPPORTED_MEDIA_TYPE",
            Self::InvalidState(_) => "INVALID_STATE",
            Self::ChallengeNotJoinable(_) => "CHALLENGE_NOT_JOINABLE",
            Self::AlreadyJoined => "ALREADY_JOINED",
            Self::NotJoined => "NOT_JOINED",
            Self::TooManyAttempts => "TOO_MANY_ATTEMPTS",
            Self::AuthUnavailable => "AUTH_UNAVAILABLE",
            Self::Internal(_) => "INTERNAL_ERROR",
        }
    }

    pub fn message(&self) -> &'static str {
        match self {
            Self::Validation(_) => "Certaines informations sont invalides.",
            Self::LoginInvalidRequest => {
                "Veuillez renseigner votre adresse e-mail et votre mot de passe."
            }
            Self::LoginInvalidCredentials => "Adresse e-mail ou mot de passe incorrect.",
            Self::SessionExpired => "Votre session a expiré. Merci de vous reconnecter.",
            Self::Unauthenticated => "Connexion requise.",
            Self::AccountDisabledAtLogin => {
                "Ce compte n'est pas autorisé à accéder à PULSE. Contactez votre référent HealthAI Coach."
            }
            Self::AccountDisabled => "Votre compte n'est plus autorisé à accéder à PULSE.",
            Self::Forbidden => "Vous n'avez pas les droits nécessaires.",
            Self::OriginRejected
            | Self::MethodNotAllowed
            | Self::PayloadTooLarge
            | Self::UnsupportedMediaType => "Requête refusée.",
            Self::NotFound => "Élément introuvable.",
            Self::InvalidState(message) | Self::ChallengeNotJoinable(message) => message,
            Self::AlreadyJoined => "Vous participez déjà à ce défi.",
            Self::NotJoined => "Vous ne participez pas à ce défi.",
            Self::TooManyAttempts => "Trop de tentatives. Réessayez dans une minute.",
            Self::AuthUnavailable => "Le service de connexion est momentanément indisponible.",
            Self::Internal(_) => "Une erreur inattendue est survenue.",
        }
    }
}

#[derive(Serialize)]
struct ErrorBody<'a> {
    code: &'static str,
    message: &'static str,
    #[serde(skip_serializing_if = "Option::is_none")]
    details: Option<&'a [FieldError]>,
}

impl IntoResponse for AppError {
    fn into_response(self) -> Response {
        if let Self::Internal(cause) = &self {
            tracing::error!(cause = %cause, "erreur interne");
        }
        let details = match &self {
            Self::Validation(details) => Some(details.as_slice()),
            _ => None,
        };
        let body = ErrorBody {
            code: self.code(),
            message: self.message(),
            details,
        };
        let mut response = (self.status(), Json(body)).into_response();
        response.extensions_mut().insert(ErrorCode(self.code()));
        response
    }
}

impl From<sqlx::Error> for AppError {
    fn from(error: sqlx::Error) -> Self {
        Self::Internal(format!("base de données : {error}"))
    }
}

/// Seul extracteur de corps JSON des routes (spec/api/endpoints.md → Rejets techniques).
///
/// Il remplace `Json<T>`, qui répond en texte : ici, chaque refus suit le format commun
/// et nomme le champ fautif.
pub struct ApiJson<T>(pub T);

impl<S, T> FromRequest<S> for ApiJson<T>
where
    S: Send + Sync,
    T: DeserializeOwned,
{
    type Rejection = AppError;

    async fn from_request(request: Request, state: &S) -> Result<Self, Self::Rejection> {
        let is_json = request
            .headers()
            .get(header::CONTENT_TYPE)
            .and_then(|value| value.to_str().ok())
            .and_then(|value| value.split(';').next())
            .is_some_and(|mime| mime.trim().eq_ignore_ascii_case("application/json"));
        if !is_json {
            return Err(AppError::UnsupportedMediaType);
        }
        let bytes =
            Bytes::from_request(request, state)
                .await
                .map_err(|rejection: BytesRejection| {
                    if rejection.status() == StatusCode::PAYLOAD_TOO_LARGE {
                        AppError::PayloadTooLarge
                    } else {
                        AppError::Validation(Vec::new())
                    }
                })?;
        decode(&bytes).map(ApiJson).map_err(AppError::Validation)
    }
}

/// Décode un corps JSON ; en cas d'erreur, renvoie les champs fautifs
/// (liste vide si le JSON est illisible ou n'est pas un objet).
pub fn decode<T: DeserializeOwned>(bytes: &[u8]) -> Result<T, Vec<FieldError>> {
    let value: serde_json::Value = serde_json::from_slice(bytes).map_err(|_| Vec::new())?;
    if !value.is_object() {
        return Err(Vec::new());
    }
    serde_path_to_error::deserialize(value).map_err(|error| {
        let path = error.path().to_string();
        let inner = error.inner().to_string();
        let field_error = if let Some(name) = quoted_after(&inner, "missing field `") {
            FieldError::new(join(&path, name), "Champ obligatoire.")
        } else if let Some(name) = quoted_after(&inner, "unknown field `") {
            // Pour une clé inconnue, le chemin désigne déjà la clé.
            let field = if path.ends_with(name) {
                path
            } else {
                join(&path, name)
            };
            FieldError::new(field, "Champ inconnu.")
        } else {
            FieldError::new(path, "Valeur invalide.")
        };
        vec![field_error]
    })
}

/// Serde signale un champ absent au niveau de l'objet parent :
/// on reconstruit le chemin complet du champ.
fn join(parent: &str, name: &str) -> String {
    if parent.is_empty() || parent == "." {
        name.to_string()
    } else {
        format!("{parent}.{name}")
    }
}

fn quoted_after<'a>(text: &'a str, prefix: &str) -> Option<&'a str> {
    let start = text.find(prefix)? + prefix.len();
    let end = text[start..].find('`')? + start;
    Some(&text[start..end])
}
