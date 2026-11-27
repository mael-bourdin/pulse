//! Défis collectifs : qui peut rejoindre ou quitter un défi (spec/features/F4-defis.md).
//!
//! `participations` désigne toujours les participations d'un seul utilisateur à un seul défi.
//! Aucune fonction ne reçoit de date : le statut d'un défi n'est jamais calculé (F4-R11, ADR-19).

use std::error::Error;
use std::fmt;

/// Statut d'un défi, choisi par l'administration.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ChallengeStatus {
    Open,
    Upcoming,
    Closed,
}

/// État d'une participation.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ParticipationStatus {
    Active,
    Left,
    Completed,
}

/// Refus d'une action sur un défi. Le texte affiché est celui de la spec.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ChallengeError {
    /// Rejoindre un défi à venir (F4-R05).
    NotYetStarted,
    /// Rejoindre un défi terminé (F4-R05).
    Finished,
    /// Rejoindre un défi auquel on participe déjà (F4-R06).
    AlreadyJoined,
    /// Quitter un défi sans participation active (F4-R08).
    NotJoined,
}

impl fmt::Display for ChallengeError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        let message = match self {
            Self::NotYetStarted => "Ce défi n'a pas encore commencé.",
            Self::Finished => "Ce défi est terminé : il n'est plus possible de le rejoindre.",
            Self::AlreadyJoined => "Vous participez déjà à ce défi.",
            Self::NotJoined => "Vous ne participez pas à ce défi.",
        };
        f.write_str(message)
    }
}

impl Error for ChallengeError {}

/// Vérifie que l'utilisateur peut rejoindre le défi (F4-R05 à R07).
///
/// L'état du défi passe avant celui de la participation (spec/api/endpoints.md).
/// Des participations `Left` ou `Completed` n'empêchent pas de rejoindre : l'appelant crée
/// alors une nouvelle participation sans modifier les anciennes (ADR-20).
pub fn check_join(
    status: ChallengeStatus,
    participations: &[ParticipationStatus],
) -> Result<(), ChallengeError> {
    match status {
        ChallengeStatus::Upcoming => Err(ChallengeError::NotYetStarted),
        ChallengeStatus::Closed => Err(ChallengeError::Finished),
        ChallengeStatus::Open if has_active(participations) => Err(ChallengeError::AlreadyJoined),
        ChallengeStatus::Open => Ok(()),
    }
}

/// Valeur `canJoin` exposée par l'API : défi ouvert et aucune participation active (F4-R03).
pub fn can_join(status: ChallengeStatus, participations: &[ParticipationStatus]) -> bool {
    check_join(status, participations).is_ok()
}

/// Vérifie qu'il y a une participation active à quitter (F4-R08).
///
/// Le statut du défi n'intervient pas. L'appelant passe la participation active à `Left`.
pub fn check_leave(participations: &[ParticipationStatus]) -> Result<(), ChallengeError> {
    if has_active(participations) {
        Ok(())
    } else {
        Err(ChallengeError::NotJoined)
    }
}

/// Choisit la participation à exposer dans `myParticipation` (F4-R02) : l'active, sinon la
/// plus récente selon la date d'inscription, sinon aucune.
///
/// Chaque élément donne l'état et la date d'inscription. Le résultat est la position de la
/// participation retenue dans la liste reçue.
pub fn my_participation<D: Ord>(participations: &[(ParticipationStatus, D)]) -> Option<usize> {
    participations
        .iter()
        .enumerate()
        .max_by_key(|(_, (status, joined_at))| (*status == ParticipationStatus::Active, joined_at))
        .map(|(position, _)| position)
}

fn has_active(participations: &[ParticipationStatus]) -> bool {
    participations.contains(&ParticipationStatus::Active)
}

#[cfg(test)]
mod tests {
    use super::ChallengeStatus::{Closed, Open, Upcoming};
    use super::ParticipationStatus::{Active, Completed, Left};
    use super::*;

    #[test]
    fn f4_r03_can_join_seulement_si_open_et_sans_participation_active() {
        assert!(can_join(Open, &[]));
        assert!(can_join(Open, &[Left]));
        assert!(can_join(Open, &[Completed]));
        assert!(!can_join(Open, &[Active]));
        assert!(!can_join(Upcoming, &[]));
        assert!(!can_join(Closed, &[]));
    }

    #[test]
    fn f4_r02_participation_active_avant_la_plus_recente() {
        let participations = [(Left, "2026-02-10"), (Active, "2026-02-01")];
        assert_eq!(my_participation(&participations), Some(1));
    }

    #[test]
    fn f4_r02_sans_active_la_plus_recente() {
        let participations = [
            (Left, "2026-01-05"),
            (Completed, "2026-02-01"),
            (Left, "2026-01-20"),
        ];
        assert_eq!(my_participation(&participations), Some(1));
    }

    #[test]
    fn f4_r02_aucune_participation() {
        assert_eq!(my_participation::<&str>(&[]), None);
    }

    #[test]
    fn acc_chal_05_pas_de_doublon_actif() {
        assert_eq!(
            check_join(Open, &[Active]),
            Err(ChallengeError::AlreadyJoined)
        );
        assert_eq!(
            check_join(Open, &[Left, Active]),
            Err(ChallengeError::AlreadyJoined)
        );
    }

    #[test]
    fn acc_chal_06_closed_refuse() {
        let refus = check_join(Closed, &[]).unwrap_err();
        assert_eq!(refus, ChallengeError::Finished);
        assert_eq!(
            refus.to_string(),
            "Ce défi est terminé : il n'est plus possible de le rejoindre."
        );
    }

    #[test]
    fn acc_chal_06_upcoming_refuse() {
        let refus = check_join(Upcoming, &[]).unwrap_err();
        assert_eq!(refus, ChallengeError::NotYetStarted);
        assert_eq!(refus.to_string(), "Ce défi n'a pas encore commencé.");
    }

    #[test]
    fn acc_chal_06_etat_du_defi_avant_participation() {
        assert_eq!(check_join(Closed, &[Active]), Err(ChallengeError::Finished));
        assert_eq!(
            check_join(Upcoming, &[Active]),
            Err(ChallengeError::NotYetStarted)
        );
    }

    #[test]
    fn f4_r07_rejoindre_apres_left() {
        assert_eq!(check_join(Open, &[Left]), Ok(()));
        assert_eq!(check_join(Open, &[Left, Left]), Ok(()));
    }

    #[test]
    fn acc_chal_07_quitter() {
        assert_eq!(check_leave(&[Active]), Ok(()));
        assert_eq!(check_leave(&[Left, Active]), Ok(()));
    }

    #[test]
    fn acc_chal_07_quitter_sans_participation_active_refuse() {
        for participations in [&[][..], &[Left], &[Completed]] {
            assert_eq!(
                check_leave(participations),
                Err(ChallengeError::NotJoined),
                "{participations:?}"
            );
        }
    }
}
