use std::error::Error;
use std::fmt;
use std::str::FromStr;

use chrono::NaiveDate;
use rust_decimal::prelude::ToPrimitive;
use rust_decimal::{Decimal, RoundingStrategy};
use serde::{Deserialize, Serialize};

pub const LABEL_MAX_CHARS: usize = 120;
pub const TARGET_MAX: Decimal = Decimal::from_parts(1_000_000, 0, 0, false, 0);
/// Plus grande valeur d'une colonne `numeric(12,2)` (data-model.md).
pub const PROGRESS_MAX: Decimal = Decimal::from_parts(999_999_999, 2, 0, false, 2);
pub const MAX_DECIMALS: u32 = 2;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum GoalStatus {
    Active,
    Suspended,
    Closed,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum Category {
    Activite,
    Sommeil,
    Hydratation,
    Stress,
    Nutrition,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum Unit {
    #[serde(rename = "pas/jour")]
    PasJour,
    #[serde(rename = "min/jour")]
    MinJour,
    #[serde(rename = "min/semaine")]
    MinSemaine,
    #[serde(rename = "h/nuit")]
    HNuit,
    #[serde(rename = "L/jour")]
    LJour,
    #[serde(rename = "séances/jour")]
    SeancesJour,
    #[serde(rename = "séances/semaine")]
    SeancesSemaine,
    #[serde(rename = "jours/semaine")]
    JoursSemaine,
    #[serde(rename = "portions/jour")]
    PortionsJour,
}

impl Unit {
    pub const ALL: [Unit; 9] = [
        Unit::PasJour,
        Unit::MinJour,
        Unit::MinSemaine,
        Unit::HNuit,
        Unit::LJour,
        Unit::SeancesJour,
        Unit::SeancesSemaine,
        Unit::JoursSemaine,
        Unit::PortionsJour,
    ];

    pub fn as_str(self) -> &'static str {
        match self {
            Unit::PasJour => "pas/jour",
            Unit::MinJour => "min/jour",
            Unit::MinSemaine => "min/semaine",
            Unit::HNuit => "h/nuit",
            Unit::LJour => "L/jour",
            Unit::SeancesJour => "séances/jour",
            Unit::SeancesSemaine => "séances/semaine",
            Unit::JoursSemaine => "jours/semaine",
            Unit::PortionsJour => "portions/jour",
        }
    }
}

impl FromStr for Unit {
    type Err = FieldError;

    fn from_str(value: &str) -> Result<Self, Self::Err> {
        Unit::ALL
            .into_iter()
            .find(|unit| unit.as_str() == value)
            .ok_or(FieldError::UnknownUnit)
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FieldError {
    EmptyLabel,
    LabelTooLong,
    TargetNotPositive,
    TargetTooLarge,
    TargetTooPrecise,
    UnknownUnit,
    EndDateInPast,
    NegativeProgress,
    ProgressTooLarge,
    ProgressTooPrecise,
}

impl FieldError {
    pub fn field(self) -> &'static str {
        match self {
            Self::EmptyLabel | Self::LabelTooLong => "label",
            Self::TargetNotPositive | Self::TargetTooLarge | Self::TargetTooPrecise => {
                "targetValue"
            }
            Self::UnknownUnit => "unit",
            Self::EndDateInPast => "endDate",
            Self::NegativeProgress | Self::ProgressTooLarge | Self::ProgressTooPrecise => {
                "currentValue"
            }
        }
    }
}

impl fmt::Display for FieldError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let message = match self {
            Self::EmptyLabel => "Le libellé est obligatoire.",
            Self::LabelTooLong => "Le libellé ne doit pas dépasser 120 caractères.",
            Self::TargetNotPositive => "La valeur cible doit être un nombre supérieur à 0.",
            Self::TargetTooLarge => "La valeur cible ne doit pas dépasser 1 000 000.",
            Self::TargetTooPrecise => "La valeur cible accepte au plus 2 décimales.",
            Self::UnknownUnit => "Choisissez une unité dans la liste.",
            Self::EndDateInPast => "La date de fin ne peut pas être antérieure à aujourd'hui.",
            Self::NegativeProgress => "La progression ne peut pas être négative.",
            Self::ProgressTooLarge => "La progression ne doit pas dépasser 9 999 999 999,99.",
            Self::ProgressTooPrecise => "La progression accepte au plus 2 décimales.",
        };
        f.write_str(message)
    }
}

impl Error for FieldError {}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum StateError {
    NotEditable,
    ProgressLocked,
    AlreadySuspended,
    NotSuspended,
    AlreadyClosed,
}

impl fmt::Display for StateError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let message = match self {
            Self::NotEditable => "Seul un objectif actif peut être modifié.",
            Self::ProgressLocked => {
                "La progression d'un objectif suspendu ou clôturé ne peut pas être modifiée."
            }
            Self::AlreadySuspended => "Seul un objectif actif peut être suspendu.",
            Self::NotSuspended => "Seul un objectif suspendu peut être réactivé.",
            Self::AlreadyClosed => "Cet objectif est déjà clôturé.",
        };
        f.write_str(message)
    }
}

impl Error for StateError {}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum Transition {
    Suspend,
    Reactivate,
    Close,
}

pub fn validate_label(label: &str) -> Result<String, FieldError> {
    let label = label.trim();
    match label.chars().count() {
        0 => Err(FieldError::EmptyLabel),
        n if n > LABEL_MAX_CHARS => Err(FieldError::LabelTooLong),
        _ => Ok(label.to_owned()),
    }
}

pub fn validate_target(target: Decimal) -> Result<Decimal, FieldError> {
    if target <= Decimal::ZERO {
        Err(FieldError::TargetNotPositive)
    } else if target > TARGET_MAX {
        Err(FieldError::TargetTooLarge)
    } else if decimals(target) > MAX_DECIMALS {
        Err(FieldError::TargetTooPrecise)
    } else {
        Ok(target)
    }
}

pub fn validate_new_end_date(
    end_date: Option<NaiveDate>,
    today: NaiveDate,
) -> Result<Option<NaiveDate>, FieldError> {
    match end_date {
        Some(date) if date < today => Err(FieldError::EndDateInPast),
        _ => Ok(end_date),
    }
}

/// À n'appeler que si `endDate` figure dans la requête : un champ absent garde la date enregistrée (F3-R10).
pub fn validate_end_date_change(
    current: Option<NaiveDate>,
    requested: Option<NaiveDate>,
    today: NaiveDate,
) -> Result<Option<NaiveDate>, FieldError> {
    if requested == current {
        return Ok(requested);
    }
    validate_new_end_date(requested, today)
}

pub fn check_editable(status: GoalStatus) -> Result<(), StateError> {
    match status {
        GoalStatus::Active => Ok(()),
        GoalStatus::Suspended | GoalStatus::Closed => Err(StateError::NotEditable),
    }
}

pub fn validate_progress(value: Decimal) -> Result<Decimal, FieldError> {
    if value < Decimal::ZERO {
        Err(FieldError::NegativeProgress)
    } else if value > PROGRESS_MAX {
        Err(FieldError::ProgressTooLarge)
    } else if decimals(value) > MAX_DECIMALS {
        Err(FieldError::ProgressTooPrecise)
    } else {
        Ok(value)
    }
}

pub fn check_progress_allowed(status: GoalStatus) -> Result<(), StateError> {
    match status {
        GoalStatus::Active => Ok(()),
        GoalStatus::Suspended | GoalStatus::Closed => Err(StateError::ProgressLocked),
    }
}

pub fn apply_transition(
    status: GoalStatus,
    transition: Transition,
    end_date: Option<NaiveDate>,
    today: NaiveDate,
) -> Result<(GoalStatus, Option<NaiveDate>), StateError> {
    use GoalStatus::{Active, Closed, Suspended};
    match (status, transition) {
        (Closed, _) => Err(StateError::AlreadyClosed),
        (Active, Transition::Suspend) => Ok((Suspended, end_date)),
        (Suspended, Transition::Suspend) => Err(StateError::AlreadySuspended),
        (Suspended, Transition::Reactivate) => Ok((Active, end_date)),
        (Active, Transition::Reactivate) => Err(StateError::NotSuspended),
        (Active | Suspended, Transition::Close) => Ok((Closed, end_date.or(Some(today)))),
    }
}

pub fn progress_percent(current: Decimal, target: Decimal) -> u8 {
    if target <= Decimal::ZERO || current <= Decimal::ZERO {
        return 0;
    }
    (current * Decimal::ONE_HUNDRED / target)
        .round_dp_with_strategy(0, RoundingStrategy::MidpointAwayFromZero)
        .min(Decimal::ONE_HUNDRED)
        .to_u8()
        .unwrap_or(100)
}

fn decimals(value: Decimal) -> u32 {
    value.normalize().scale()
}

#[cfg(test)]
mod tests {
    use super::GoalStatus::{Active, Closed, Suspended};
    use super::*;
    use rust_decimal_macros::dec;

    fn date(value: &str) -> NaiveDate {
        NaiveDate::parse_from_str(value, "%Y-%m-%d").unwrap()
    }

    const TODAY: &str = "2026-02-15";

    #[test]
    fn f3_r02_libelle_sans_espaces_et_borne() {
        assert_eq!(validate_label("  Marcher  "), Ok("Marcher".to_owned()));
        assert_eq!(validate_label("   "), Err(FieldError::EmptyLabel));
        assert_eq!(validate_label(&"é".repeat(120)), Ok("é".repeat(120)));
        assert_eq!(
            validate_label(&"é".repeat(121)),
            Err(FieldError::LabelTooLong)
        );
    }

    #[test]
    fn acc_goal_02_unite_hors_liste_refusee() {
        assert_eq!("pas/jour".parse::<Unit>(), Ok(Unit::PasJour));
        assert_eq!("séances/semaine".parse::<Unit>(), Ok(Unit::SeancesSemaine));
        for refusee in ["km", "PAS/JOUR", "", " pas/jour"] {
            assert_eq!(
                refusee.parse::<Unit>(),
                Err(FieldError::UnknownUnit),
                "{refusee:?}"
            );
        }
        assert_eq!(FieldError::UnknownUnit.field(), "unit");
    }

    #[test]
    fn f3_r11_neuf_unites_dans_l_ordre_de_la_spec() {
        let noms: Vec<_> = Unit::ALL.iter().map(|unit| unit.as_str()).collect();
        assert_eq!(
            noms,
            [
                "pas/jour",
                "min/jour",
                "min/semaine",
                "h/nuit",
                "L/jour",
                "séances/jour",
                "séances/semaine",
                "jours/semaine",
                "portions/jour"
            ]
        );
        for unit in Unit::ALL {
            let json = serde_json::to_string(&unit).unwrap();
            assert_eq!(json, format!("\"{}\"", unit.as_str()));
            assert_eq!(serde_json::from_str::<Unit>(&json).unwrap(), unit);
        }
        assert!(serde_json::from_str::<Unit>("\"km\"").is_err());
    }

    #[test]
    fn acc_goal_04_cible_non_positive_refusee() {
        assert_eq!(validate_target(dec!(0)), Err(FieldError::TargetNotPositive));
        assert_eq!(
            validate_target(dec!(-5)),
            Err(FieldError::TargetNotPositive)
        );
        assert_eq!(validate_target(dec!(0.01)), Ok(dec!(0.01)));
        assert_eq!(validate_target(dec!(1000000)), Ok(dec!(1000000)));
        assert_eq!(
            validate_target(dec!(1000000.01)),
            Err(FieldError::TargetTooLarge)
        );
        assert_eq!(FieldError::TargetNotPositive.field(), "targetValue");
    }

    #[test]
    fn acc_goal_04_cible_au_plus_deux_decimales() {
        assert_eq!(validate_target(dec!(7.5)), Ok(dec!(7.5)));
        assert_eq!(validate_target(dec!(7.10)), Ok(dec!(7.10)));
        assert_eq!(
            validate_target(dec!(7.125)),
            Err(FieldError::TargetTooPrecise)
        );
        assert_eq!(
            validate_target(dec!(0.001)),
            Err(FieldError::TargetTooPrecise)
        );
    }

    #[test]
    fn f3_r02_date_de_fin_a_la_creation() {
        let today = date(TODAY);
        assert_eq!(validate_new_end_date(None, today), Ok(None));
        assert_eq!(validate_new_end_date(Some(today), today), Ok(Some(today)));
        assert_eq!(
            validate_new_end_date(Some(date("2026-02-14")), today),
            Err(FieldError::EndDateInPast)
        );
    }

    #[test]
    fn acc_goal_05_modifier_si_actif() {
        assert_eq!(check_editable(Active), Ok(()));
        for status in [Suspended, Closed] {
            let refus = check_editable(status).unwrap_err();
            assert_eq!(
                refus.to_string(),
                "Seul un objectif actif peut être modifié."
            );
        }
    }

    #[test]
    fn acc_goal_05_date_de_fin_passee_inchangee() {
        let today = date(TODAY);
        let goal_001 = Some(date("2026-03-31"));
        let passee = Some(date("2026-01-31"));
        assert_eq!(validate_end_date_change(passee, passee, today), Ok(passee));
        assert_eq!(validate_end_date_change(goal_001, None, today), Ok(None));
        assert_eq!(
            validate_end_date_change(goal_001, Some(date("2026-02-01")), today),
            Err(FieldError::EndDateInPast)
        );
        assert_eq!(
            validate_end_date_change(goal_001, Some(date("2026-04-30")), today),
            Ok(Some(date("2026-04-30")))
        );
    }

    #[test]
    fn acc_goal_06_suspendre() {
        let today = date(TODAY);
        let fin = Some(date("2026-03-31"));
        assert_eq!(
            apply_transition(Active, Transition::Suspend, fin, today),
            Ok((Suspended, fin))
        );
        assert_eq!(
            apply_transition(Suspended, Transition::Reactivate, None, today),
            Ok((Active, None))
        );
        assert_eq!(
            apply_transition(Closed, Transition::Suspend, fin, today),
            Err(StateError::AlreadyClosed)
        );
        assert_eq!(
            apply_transition(Suspended, Transition::Suspend, fin, today),
            Err(StateError::AlreadySuspended)
        );
        assert_eq!(
            apply_transition(Active, Transition::Reactivate, fin, today),
            Err(StateError::NotSuspended)
        );
        assert_eq!(
            apply_transition(Closed, Transition::Reactivate, fin, today),
            Err(StateError::AlreadyClosed)
        );
    }

    #[test]
    fn acc_goal_07_cloturer() {
        let today = date(TODAY);
        let fin = Some(date("2026-03-31"));
        assert_eq!(
            apply_transition(Suspended, Transition::Close, None, today),
            Ok((Closed, Some(today)))
        );
        assert_eq!(
            apply_transition(Active, Transition::Close, fin, today),
            Ok((Closed, fin))
        );
        assert_eq!(
            apply_transition(Closed, Transition::Close, fin, today),
            Err(StateError::AlreadyClosed)
        );
    }

    #[test]
    fn acc_goal_08_progression() {
        assert_eq!(validate_progress(dec!(0)), Ok(dec!(0)));
        assert_eq!(validate_progress(dec!(6500)), Ok(dec!(6500)));
        assert_eq!(
            validate_progress(dec!(-1)),
            Err(FieldError::NegativeProgress)
        );
        assert_eq!(validate_progress(PROGRESS_MAX), Ok(PROGRESS_MAX));
        assert_eq!(
            validate_progress(dec!(10000000000)),
            Err(FieldError::ProgressTooLarge)
        );
        assert_eq!(
            validate_progress(dec!(7.125)),
            Err(FieldError::ProgressTooPrecise)
        );
        assert_eq!(check_progress_allowed(Active), Ok(()));
        for status in [Suspended, Closed] {
            let refus = check_progress_allowed(status).unwrap_err();
            assert_eq!(
                refus.to_string(),
                "La progression d'un objectif suspendu ou clôturé ne peut pas être modifiée."
            );
        }
    }

    #[test]
    fn f3_r09_pourcentage_plafonne() {
        assert_eq!(progress_percent(dec!(6250), dec!(8000)), 78);
        assert_eq!(progress_percent(dec!(7.1), dec!(7.5)), 95);
        assert_eq!(progress_percent(dec!(165), dec!(150)), 100);
        assert_eq!(progress_percent(dec!(0), dec!(150)), 0);
    }

    #[test]
    fn f3_r09_arrondi_demi_vers_le_haut() {
        assert_eq!(progress_percent(dec!(1), dec!(8)), 13);
        assert_eq!(progress_percent(dec!(1), dec!(200)), 1);
    }
}
