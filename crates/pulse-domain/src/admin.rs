//! Administration des défis par le FUNCTIONAL_ADMIN (spec/features/F6-administration.md).
//!
//! Les champs absents, les clés inconnues et les valeurs hors énumération sont refusés au
//! décodage JSON (`ApiJson`, F6-R04). Ce module vérifie le reste : longueurs, cible, dates,
//! et la règle « un défi terminé est en lecture seule » (F6-R06).

use chrono::NaiveDate;
use rust_decimal::Decimal;
use serde::Deserialize;

use crate::category::Category;
use crate::challenge::ChallengeStatus;
use crate::unit::Unit;

/// Cible maximale, la même que pour les objectifs (F3-R02).
const MAX_TARGET: Decimal = Decimal::from_parts(1_000_000, 0, 0, false, 0);

/// Corps de `POST /admin/challenges` et `PUT /admin/challenges/{id}` (F6-R03, F6-R05).
#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct ChallengeInput {
    pub title: String,
    pub category: Category,
    pub description: String,
    pub start_date: NaiveDate,
    pub end_date: NaiveDate,
    pub target_value: Decimal,
    pub unit: Unit,
    pub status: ChallengeStatus,
}

/// Défi prêt à être enregistré : titre et description déjà sans espaces superflus.
#[derive(Debug, Clone, PartialEq)]
pub struct ValidChallenge {
    pub title: String,
    pub category: Category,
    pub description: String,
    pub start_date: NaiveDate,
    pub end_date: NaiveDate,
    pub target_value: Decimal,
    pub unit: Unit,
    pub status: ChallengeStatus,
}

/// Champ refusé, avec le message affiché sous le champ (camelCase, comme le JSON).
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct FieldIssue {
    pub field: &'static str,
    pub message: &'static str,
}

/// Message de F6-R06, renvoyé en 409 `INVALID_STATE`.
pub const CLOSED_READ_ONLY: &str = "Un défi terminé ne peut plus être modifié.";

/// Vérifie un défi à créer ou à modifier (F6-R03 à F6-R05). Renvoie tous les champs fautifs
/// d'un coup, pour que le formulaire les affiche ensemble.
pub fn validate_challenge(input: ChallengeInput) -> Result<ValidChallenge, Vec<FieldIssue>> {
    let title = input.title.trim().to_string();
    let description = input.description.trim().to_string();
    let mut issues = Vec::new();

    if !(1..=120).contains(&title.chars().count()) {
        issues.push(FieldIssue {
            field: "title",
            message: "Le titre doit contenir entre 1 et 120 caractères.",
        });
    }
    if !(1..=1000).contains(&description.chars().count()) {
        issues.push(FieldIssue {
            field: "description",
            message: "La description doit contenir entre 1 et 1 000 caractères.",
        });
    }
    if input.end_date < input.start_date {
        issues.push(FieldIssue {
            field: "endDate",
            message: "La date de fin doit suivre la date de début.",
        });
    }
    if input.target_value <= Decimal::ZERO || input.target_value > MAX_TARGET {
        issues.push(FieldIssue {
            field: "targetValue",
            message: "La cible doit être un nombre supérieur à 0 et au plus 1 000 000.",
        });
    }

    if !issues.is_empty() {
        return Err(issues);
    }
    Ok(ValidChallenge {
        title,
        category: input.category,
        description,
        start_date: input.start_date,
        end_date: input.end_date,
        target_value: input.target_value,
        unit: input.unit,
        status: input.status,
    })
}

/// Un défi CLOSED est en lecture seule (F6-R06). Le passer à CLOSED reste possible ;
/// les participations existantes ne sont pas touchées.
pub fn check_update(current: ChallengeStatus) -> Result<(), &'static str> {
    match current {
        ChallengeStatus::Closed => Err(CLOSED_READ_ONLY),
        ChallengeStatus::Open | ChallengeStatus::Upcoming => Ok(()),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn input() -> ChallengeInput {
        serde_json::from_str(
            r#"{
                "title": "  Hydratation de printemps  ",
                "category": "HYDRATATION",
                "description": "Boire 1,5 L d'eau par jour",
                "startDate": "2026-03-01",
                "endDate": "2026-03-31",
                "targetValue": 1.5,
                "unit": "L/jour",
                "status": "UPCOMING"
            }"#,
        )
        .unwrap()
    }

    fn fields(result: Result<ValidChallenge, Vec<FieldIssue>>) -> Vec<&'static str> {
        result
            .unwrap_err()
            .iter()
            .map(|issue| issue.field)
            .collect()
    }

    #[test]
    fn acc_adm_04_defi_valide_et_texte_nettoye() {
        let valid = validate_challenge(input()).unwrap();
        assert_eq!(valid.title, "Hydratation de printemps");
        assert_eq!(valid.unit, Unit::LitresParJour);
        assert_eq!(valid.status, ChallengeStatus::Upcoming);
        assert_eq!(valid.target_value, Decimal::new(15, 1));
    }

    #[test]
    fn acc_adm_05_dates_inversees() {
        let mut bad = input();
        bad.end_date = NaiveDate::from_ymd_opt(2026, 2, 28).unwrap();
        let issues = validate_challenge(bad).unwrap_err();
        assert_eq!(
            issues,
            [FieldIssue {
                field: "endDate",
                message: "La date de fin doit suivre la date de début."
            }]
        );
        // Un défi d'un seul jour est accepté.
        let mut one_day = input();
        one_day.end_date = one_day.start_date;
        assert!(validate_challenge(one_day).is_ok());
    }

    #[test]
    fn acc_adm_05_cible_non_positive_ou_trop_grande() {
        for value in [
            Decimal::ZERO,
            Decimal::new(-5, 0),
            Decimal::new(1_000_001, 0),
        ] {
            let mut bad = input();
            bad.target_value = value;
            assert_eq!(fields(validate_challenge(bad)), ["targetValue"], "{value}");
        }
    }

    #[test]
    fn acc_adm_05_titre_et_description_vides_ou_trop_longs() {
        let mut blank = input();
        blank.title = "   ".into();
        blank.description = String::new();
        assert_eq!(fields(validate_challenge(blank)), ["title", "description"]);

        // Les longueurs se comptent en caractères, pas en octets (spec/api/endpoints.md).
        let mut accents = input();
        accents.title = "é".repeat(120);
        assert!(validate_challenge(accents.clone()).is_ok());
        accents.title.push('é');
        assert_eq!(fields(validate_challenge(accents)), ["title"]);
    }

    #[test]
    fn acc_adm_05_statut_unite_et_cle_inconnus_refuses_au_decodage() {
        let base = r#""title":"T","category":"STRESS","description":"D","startDate":"2026-03-01","endDate":"2026-03-02","targetValue":1,"unit":"min/jour""#;
        let decode =
            |extra: &str| serde_json::from_str::<ChallengeInput>(&format!("{{{base},{extra}}}"));
        assert!(decode(r#""status":"OPEN""#).is_ok());
        assert!(decode(r#""status":"ARCHIVED""#).is_err());
        assert!(decode(r#""status":"OPEN","createdBy":"adm-10001""#).is_err());
        assert!(decode(r#""status":"OPEN","targetValue":"12""#).is_err());
    }

    #[test]
    fn f6_r06_defi_closed_lecture_seule() {
        assert_eq!(check_update(ChallengeStatus::Closed), Err(CLOSED_READ_ONLY));
        assert_eq!(check_update(ChallengeStatus::Open), Ok(()));
        assert_eq!(check_update(ChallengeStatus::Upcoming), Ok(()));
    }
}
