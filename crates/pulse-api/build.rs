// `sqlx::migrate!` intègre les migrations à la compilation : sans cette ligne, une nouvelle
// migration ne recompile pas pulse-api, et `pulse-api migrate` l'ignorerait.
fn main() {
    println!("cargo:rerun-if-changed=../../migrations");
}
