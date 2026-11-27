//! Thèmes communs aux préférences, objectifs, défis et contenus (spec/data-model.md).

use serde::{Deserialize, Serialize};

/// Type SQL `category`. En JSON : `"ACTIVITE"`, `"SOMMEIL"`…
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum Category {
    Activite,
    Sommeil,
    Hydratation,
    Stress,
    Nutrition,
}
