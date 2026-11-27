//! « Date du jour » de PULSE : celle de Paris, jamais celle du serveur (spec/architecture.md → Dates).
//!
//! Le serveur tourne en UTC sur Railway : sans cette règle, un objectif créé à 0 h 30
//! à Paris porterait la date de la veille.

use chrono::{DateTime, NaiveDate, Utc};
use chrono_tz::Europe::Paris;

/// Date du jour à Paris, rangée dans `AppState::today` en production.
pub fn paris_today() -> NaiveDate {
    paris_date(Utc::now())
}

/// Date à Paris d'un instant UTC ; `chrono-tz` gère les heures d'été et d'hiver.
pub fn paris_date(instant: DateTime<Utc>) -> NaiveDate {
    instant.with_timezone(&Paris).date_naive()
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::TimeZone;

    fn utc(y: i32, m: u32, d: u32, h: u32, min: u32) -> DateTime<Utc> {
        Utc.with_ymd_and_hms(y, m, d, h, min, 0).unwrap()
    }

    fn date(y: i32, m: u32, d: u32) -> NaiveDate {
        NaiveDate::from_ymd_opt(y, m, d).unwrap()
    }

    #[test]
    fn tech_07_minuit_trente_a_paris_en_hiver() {
        // 23 h 30 UTC le 14 février = 0 h 30 le 15 à Paris (UTC+1).
        assert_eq!(paris_date(utc(2026, 2, 14, 23, 30)), date(2026, 2, 15));
        assert_eq!(paris_date(utc(2026, 2, 14, 22, 30)), date(2026, 2, 14));
    }

    #[test]
    fn tech_07_minuit_trente_a_paris_en_ete() {
        // 22 h 30 UTC le 14 juillet = 0 h 30 le 15 à Paris (UTC+2).
        assert_eq!(paris_date(utc(2026, 7, 14, 22, 30)), date(2026, 7, 15));
        assert_eq!(paris_date(utc(2026, 7, 14, 21, 30)), date(2026, 7, 14));
    }
}
