//! Le schéma de spec/data-model.md applique lui-même les règles qu'il porte.

use sqlx::PgPool;

/// Nom de la contrainte qui a refusé l'écriture : un refus pour une autre raison
/// (colonne absente, type invalide…) ferait échouer le test au lieu de le faire passer.
fn violated<T: std::fmt::Debug>(result: Result<T, sqlx::Error>) -> String {
    match result {
        Err(sqlx::Error::Database(error)) => error
            .constraint()
            .expect("erreur de base sans contrainte")
            .to_string(),
        other => panic!("refus attendu par une contrainte, obtenu : {other:?}"),
    }
}

async fn insert_challenge(pool: &PgPool, id: &str) {
    sqlx::query(
        "INSERT INTO challenges VALUES ($1, 'Défi', 'ACTIVITE', 'Description', '2026-02-01', '2026-02-28', 10, 'pas/jour', 'OPEN', 'adm-10001')",
    )
    .bind(id)
    .execute(pool)
    .await
    .unwrap();
}

async fn insert_participation(pool: &PgPool, id: &str, status: &str) -> Result<(), sqlx::Error> {
    sqlx::query("INSERT INTO participations VALUES ($1, 'chl-900', 'usr-10027', '2026-02-02', 0, $2::participation_status)")
        .bind(id)
        .bind(status)
        .execute(pool)
        .await
        .map(|_| ())
}

#[sqlx::test(migrations = "../../migrations")]
async fn acc_chal_05_une_seule_participation_active_en_base(pool: PgPool) {
    insert_challenge(&pool, "chl-900").await;
    insert_participation(&pool, "part-900", "ACTIVE")
        .await
        .unwrap();
    // Une ancienne participation LEFT ne gêne pas (ADR-20)…
    insert_participation(&pool, "part-901", "LEFT")
        .await
        .unwrap();
    // … mais une seconde ACTIVE est refusée par l'index unique partiel.
    assert!(
        insert_participation(&pool, "part-902", "ACTIVE")
            .await
            .is_err()
    );
}

#[sqlx::test(migrations = "../../migrations")]
async fn f3_r11_unite_hors_liste_refusee_par_la_base(pool: PgPool) {
    let insert = |unit: &'static str| {
        sqlx::query("INSERT INTO goals (goal_id, user_id, category, label, target_value, unit, start_date) VALUES ($1, 'usr-10027', 'ACTIVITE', 'Marcher', 8000, $1, '2026-02-01')")
            .bind(unit)
            .execute(&pool)
    };
    assert!(insert("pas/jour").await.is_ok());
    assert_eq!(violated(insert("km").await), "goals_unit_check");
}

#[sqlx::test(migrations = "../../migrations")]
async fn rg_adm_05_contenu_publie_a_une_date(pool: PgPool) {
    let insert = |id: &'static str, status: &'static str, published: Option<&'static str>| {
        sqlx::query("INSERT INTO contents VALUES ($1, 'Titre', 'ARTICLE', 'SOMMEIL', $2::content_status, $3::date, '2026-01-05', 'adm-10001')")
            .bind(id)
            .bind(status)
            .bind(published)
            .execute(&pool)
    };
    assert!(
        insert("cnt-900", "PUBLISHED", Some("2026-01-05"))
            .await
            .is_ok()
    );
    assert!(insert("cnt-901", "DRAFT", None).await.is_ok());
    assert!(
        insert("cnt-902", "DRAFT", Some("2026-01-05"))
            .await
            .is_err()
    );
    assert!(insert("cnt-903", "PUBLISHED", None).await.is_err());
}
