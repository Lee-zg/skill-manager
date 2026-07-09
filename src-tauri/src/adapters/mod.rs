pub mod tools;

use anyhow::Result;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SkillMeta {
    pub id: String,
    pub name: String,
    pub original_name: String,
    pub description: Option<String>,
    pub source: Option<String>,
    pub version: Option<String>,
    pub install_path: String,
    pub tool_id: String,
    pub enabled: bool,
}

pub trait ToolAdapter: Send + Sync {
    fn id(&self) -> &str;
    fn name(&self) -> &str;
    fn skills_path(&self) -> Option<std::path::PathBuf>;
    fn is_available(&self) -> bool {
        self.skills_path().map(|p| p.exists()).unwrap_or(false)
    }
    fn scan(&self) -> Result<Vec<SkillMeta>>;
    fn disable_skill(&self, skill_path: &str) -> Result<()>;
    fn enable_skill(&self, skill_path: &str) -> Result<()>;
    fn uninstall_skill(&self, skill_path: &str) -> Result<()>;
}
