//! Synthèse de progression : les indicateurs affichés (spec/features/F5-progression.md).

/// Les 4 indicateurs, dans l'ordre d'affichage : type, libellé et unité (F5-R03).
const INDICATORS: [(&str, &str, &str); 4] = [
    (
        "WEEKLY_ACTIVE_DAYS",
        "Jours avec activité enregistrée",
        "jours",
    ),
    ("STREAK_DAYS", "Série de suivi en cours", "jours"),
    (
        "WELLBEING_CHECKINS",
        "Check-ins bien-être complétés",
        "check-ins",
    ),
    (
        "HYDRATION_DAYS",
        "Jours ayant atteint l'objectif hydratation",
        "jours",
    ),
];

/// Un indicateur de la synthèse.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct Indicator<V> {
    pub metric_type: &'static str,
    pub label: &'static str,
    pub unit: &'static str,
    /// `None` sans donnée sur la période : ce n'est jamais une erreur (F5-R07).
    pub value: Option<V>,
}

/// Construit les 4 indicateurs à partir des mesures `(type, valeur)` d'un seul utilisateur sur
/// la période retenue.
///
/// Les autres types, dont `CHALLENGES_ACTIVE` et `GOALS_CLOSED`, sont ignorés (F5-R04).
pub fn indicators<V: Copy>(measures: &[(&str, V)]) -> [Indicator<V>; 4] {
    INDICATORS.map(|(metric_type, label, unit)| Indicator {
        metric_type,
        label,
        unit,
        value: measures
            .iter()
            .find(|(measured, _)| *measured == metric_type)
            .map(|&(_, value)| value),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn f5_r03_quatre_indicateurs_dans_l_ordre() {
        let types = indicators::<u32>(&[]).map(|i| (i.metric_type, i.unit));
        assert_eq!(
            types,
            [
                ("WEEKLY_ACTIVE_DAYS", "jours"),
                ("STREAK_DAYS", "jours"),
                ("WELLBEING_CHECKINS", "check-ins"),
                ("HYDRATION_DAYS", "jours"),
            ]
        );
    }

    #[test]
    fn acc_prog_02_valeurs_data_alex() {
        let values = indicators(&[("STREAK_DAYS", 4), ("WEEKLY_ACTIVE_DAYS", 5)]).map(|i| i.value);
        assert_eq!(values, [Some(5), Some(4), None, None]);
    }

    #[test]
    fn acc_prog_05_sans_donnee_valeur_absente() {
        let empty = indicators::<u32>(&[]);
        assert!(empty.iter().all(|i| i.value.is_none()));
        assert_eq!(empty[0].label, "Jours avec activité enregistrée");
    }

    #[test]
    fn f5_r04_compteurs_de_data_ignores() {
        let values = indicators(&[("CHALLENGES_ACTIVE", 2), ("GOALS_CLOSED", 1)]).map(|i| i.value);
        assert_eq!(values, [None; 4]);
    }
}
