//! Liste fermée des unités, la même pour les objectifs et les défis (F3-R11).
//!
//! En base, une colonne `text` avec un `CHECK (unit IN (…))` ; ici un `enum`, dont chaque
//! variante porte le libellé exact de HAC-DATA-001.

use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum Unit {
    #[serde(rename = "pas/jour")]
    PasParJour,
    #[serde(rename = "min/jour")]
    MinParJour,
    #[serde(rename = "min/semaine")]
    MinParSemaine,
    #[serde(rename = "h/nuit")]
    HeuresParNuit,
    #[serde(rename = "L/jour")]
    LitresParJour,
    #[serde(rename = "séances/jour")]
    SeancesParJour,
    #[serde(rename = "séances/semaine")]
    SeancesParSemaine,
    #[serde(rename = "jours/semaine")]
    JoursParSemaine,
    #[serde(rename = "portions/jour")]
    PortionsParJour,
}

impl Unit {
    /// Libellé stocké en base et affiché, ex. `"pas/jour"`.
    pub fn label(self) -> &'static str {
        match self {
            Self::PasParJour => "pas/jour",
            Self::MinParJour => "min/jour",
            Self::MinParSemaine => "min/semaine",
            Self::HeuresParNuit => "h/nuit",
            Self::LitresParJour => "L/jour",
            Self::SeancesParJour => "séances/jour",
            Self::SeancesParSemaine => "séances/semaine",
            Self::JoursParSemaine => "jours/semaine",
            Self::PortionsParJour => "portions/jour",
        }
    }
}

#[cfg(test)]
mod tests {
    use super::Unit;

    #[test]
    fn f3_r11_libelles_de_hac_data_001() {
        let unit: Unit = serde_json::from_str(r#""séances/semaine""#).unwrap();
        assert_eq!(unit, Unit::SeancesParSemaine);
        assert_eq!(unit.label(), "séances/semaine");
        assert!(serde_json::from_str::<Unit>(r#""km""#).is_err());
        assert!(serde_json::from_str::<Unit>(r#""PAS/JOUR""#).is_err());
    }
}
