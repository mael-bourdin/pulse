//! Comptes du simulateur (F1-R02) : chargés au démarrage depuis `data/users.json`,
//! produit par `auth-simulator hash-users` avec des hachés Argon2id.

use argon2::password_hash::{PasswordHash, PasswordHasher, PasswordVerifier, SaltString};
use argon2::{Algorithm, Argon2};
use serde::{Deserialize, Serialize};

/// Fichier versionné, embarqué dans le binaire : le simulateur n'a besoin d'aucun chemin à l'exécution.
const USERS_JSON: &str = include_str!("../data/users.json");

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum Role {
    User,
    FunctionalAdmin,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum AccountStatus {
    Active,
    Disabled,
}

/// Compte tel que décrit par HAC-DATA-001, sans mot de passe.
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Account {
    pub user_id: String,
    pub email: String,
    pub display_name: String,
    pub role: Role,
    pub account_status: AccountStatus,
}

/// Compte du simulateur : le compte de DATA et son haché Argon2id.
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct User {
    #[serde(flatten)]
    pub account: Account,
    pub password_hash: String,
}

/// Lit les comptes embarqués et vérifie que chaque haché est bien un Argon2id.
pub fn load_users() -> Result<Vec<User>, String> {
    let users: Vec<User> =
        serde_json::from_str(USERS_JSON).map_err(|e| format!("data/users.json illisible : {e}"))?;
    for user in &users {
        let hash = PasswordHash::new(&user.password_hash)
            .map_err(|_| format!("haché illisible pour {}", user.account.user_id))?;
        if hash.algorithm != Algorithm::Argon2id.ident() {
            return Err(format!("haché non Argon2id pour {}", user.account.user_id));
        }
    }
    Ok(users)
}

/// Haché Argon2id d'un mot de passe, avec un sel aléatoire.
pub fn hash_password(password: &str) -> Result<String, String> {
    let mut salt = [0u8; 16];
    getrandom::fill(&mut salt).map_err(|e| format!("aléa indisponible : {e}"))?;
    let salt = SaltString::encode_b64(&salt).map_err(|e| e.to_string())?;
    Argon2::default()
        .hash_password(password.as_bytes(), &salt)
        .map(|hash| hash.to_string())
        .map_err(|e| e.to_string())
}

/// Vrai si le mot de passe correspond au haché. Un haché illisible ne correspond à rien.
pub fn verify_password(hash: &str, password: &str) -> bool {
    PasswordHash::new(hash).is_ok_and(|hash| {
        Argon2::default()
            .verify_password(password.as_bytes(), &hash)
            .is_ok()
    })
}

/// Produit le contenu de `data/users.json` à partir des comptes de DATA (`source`, sans haché).
/// `read_password` fournit le mot de passe de démo de chaque adresse.
pub fn hash_users(
    source: &str,
    mut read_password: impl FnMut(&str) -> Result<String, String>,
) -> Result<String, String> {
    let accounts: Vec<Account> =
        serde_json::from_str(source).map_err(|e| format!("comptes de DATA illisibles : {e}"))?;
    let mut users = Vec::with_capacity(accounts.len());
    for account in accounts {
        let password = read_password(&account.email)?;
        if password.is_empty() {
            return Err(format!("mot de passe vide pour {}", account.email));
        }
        users.push(User {
            password_hash: hash_password(&password)?,
            account,
        });
    }
    let mut json = serde_json::to_string_pretty(&users).map_err(|e| e.to_string())?;
    json.push('\n');
    Ok(json)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn acc_auth_09_hash_users_ne_garde_que_des_haches() {
        let source = include_str!("../../../data/hac-data-001/users.json");
        let json = hash_users(source, |_| Ok("MotDePasseDeTest!".to_owned())).unwrap();
        let users: Vec<User> = serde_json::from_str(&json).unwrap();
        assert_eq!(users.len(), 6);
        assert!(!json.contains("MotDePasseDeTest!"));
        for user in &users {
            assert!(user.password_hash.starts_with("$argon2id$"));
            assert!(verify_password(&user.password_hash, "MotDePasseDeTest!"));
            assert!(!verify_password(&user.password_hash, "autre"));
        }
    }

    #[test]
    fn acc_auth_09_hash_users_refuse_un_mot_de_passe_vide() {
        let source = include_str!("../../../data/hac-data-001/users.json");
        assert!(hash_users(source, |_| Ok(String::new())).is_err());
    }
}
