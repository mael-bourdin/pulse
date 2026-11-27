//! Jetons opaques gardés en mémoire (F1-R08, ADR-14) : 256 bits aléatoires, liés à un `userId`
//! et à une expiration. Aucune révocation : un jeton expire de lui-même.

use std::collections::HashMap;
use std::sync::Mutex;
use std::time::{Duration, Instant};

struct Entry {
    user_id: String,
    expires_at: Instant,
}

pub struct TokenStore {
    ttl: Duration,
    tokens: Mutex<HashMap<String, Entry>>,
}

impl TokenStore {
    pub fn new(ttl: Duration) -> Self {
        Self {
            ttl,
            tokens: Mutex::new(HashMap::new()),
        }
    }

    pub fn ttl(&self) -> Duration {
        self.ttl
    }

    /// Crée un jeton pour `user_id`. Les jetons expirés sont oubliés au passage.
    pub fn issue(&self, user_id: &str) -> Result<String, getrandom::Error> {
        let mut bytes = [0u8; 32];
        getrandom::fill(&mut bytes)?;
        let token: String = bytes.iter().map(|b| format!("{b:02x}")).collect();
        let now = Instant::now();
        let mut tokens = self.tokens.lock().unwrap_or_else(|e| e.into_inner());
        tokens.retain(|_, entry| entry.expires_at > now);
        tokens.insert(
            token.clone(),
            Entry {
                user_id: user_id.to_owned(),
                expires_at: now + self.ttl,
            },
        );
        Ok(token)
    }

    /// `userId` du jeton, s'il est connu et pas encore expiré.
    pub fn user_id(&self, token: &str) -> Option<String> {
        let tokens = self.tokens.lock().unwrap_or_else(|e| e.into_inner());
        tokens
            .get(token)
            .filter(|entry| entry.expires_at > Instant::now())
            .map(|entry| entry.user_id.clone())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn acc_auth_08_jeton_lie_a_son_utilisateur() {
        let store = TokenStore::new(Duration::from_secs(3600));
        let token = store.issue("usr-10027").unwrap();
        assert_eq!(token.len(), 64);
        assert_eq!(store.user_id(&token).as_deref(), Some("usr-10027"));
        assert_eq!(store.user_id("inconnu"), None);
    }

    #[test]
    fn acc_auth_08_jeton_expire() {
        let store = TokenStore::new(Duration::ZERO);
        let token = store.issue("usr-10027").unwrap();
        assert_eq!(store.user_id(&token), None);
    }
}
