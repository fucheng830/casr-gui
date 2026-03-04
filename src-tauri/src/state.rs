use casr::discovery::ProviderRegistry;
use std::sync::Mutex;

pub struct AppState {
    pub registry: Mutex<ProviderRegistry>,
}

impl AppState {
    pub fn new() -> Self {
        Self {
            registry: Mutex::new(ProviderRegistry::default_registry()),
        }
    }
}
