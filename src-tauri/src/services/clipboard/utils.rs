use base64::{engine::general_purpose, Engine as _};
use regex::Regex;
use reqwest::header::CONTENT_TYPE;
use serde::Deserialize;
use std::io::Read;
use std::path::Path;
use std::sync::OnceLock;
use std::time::Duration;
use urlencoding::decode;

const TEXT_PREVIEW_MAX_CHARS: usize = 500;
const TEXT_PREVIEW_TRUNCATED_CHARS: usize = TEXT_PREVIEW_MAX_CHARS - 3;
const REMOTE_IMAGE_MAX_BYTES: usize = 8 * 1024 * 1024;
const REMOTE_IMAGE_TIMEOUT_SECS: u64 = 4;

fn normalize_image_ext(ext: &str) -> Option<&'static str> {
    match ext.to_ascii_lowercase().as_str() {
        "png" => Some("png"),
        "jpg" | "jpeg" => Some("jpg"),
        "gif" => Some("gif"),
        "webp" => Some("webp"),
        "bmp" => Some("bmp"),
        _ => None,
    }
}

fn image_ext_from_mime(mime: &str) -> Option<&'static str> {
    match mime {
        "image/png" => Some("png"),
        "image/jpeg" => Some("jpg"),
        "image/gif" => Some("gif"),
        "image/webp" => Some("webp"),
        "image/bmp" => Some("bmp"),
        _ => None,
    }
}

fn image_ext_from_url(url: &str) -> Option<&'static str> {
    let parsed = reqwest::Url::parse(url).ok()?;
    let ext = Path::new(parsed.path())
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("");
    normalize_image_ext(ext)
}

fn image_ext_from_bytes(bytes: &[u8]) -> Option<&'static str> {
    let format = image::guess_format(bytes).ok()?;
    match format {
        image::ImageFormat::Png => Some("png"),
        image::ImageFormat::Jpeg => Some("jpg"),
        image::ImageFormat::Gif => Some("gif"),
        image::ImageFormat::WebP => Some("webp"),
        image::ImageFormat::Bmp => Some("bmp"),
        _ => None,
    }
}

fn image_mime_by_ext(ext: &str) -> &'static str {
    match ext {
        "jpg" => "image/jpeg",
        "gif" => "image/gif",
        "webp" => "image/webp",
        "bmp" => "image/bmp",
        _ => "image/png",
    }
}

fn normalize_remote_img_url(src: &str) -> Option<String> {
    let trimmed = src.trim();
    if trimmed.starts_with("http://") || trimmed.starts_with("https://") {
        return Some(trimmed.to_string());
    }
    if trimmed.starts_with("//") {
        return Some(format!("https:{}", trimmed));
    }
    None
}

fn fetch_remote_image(url: &str) -> Option<(Vec<u8>, &'static str)> {
    static REMOTE_IMG_CLIENT: OnceLock<reqwest::blocking::Client> = OnceLock::new();

    let client = REMOTE_IMG_CLIENT.get_or_init(|| {
        reqwest::blocking::Client::builder()
            .timeout(Duration::from_secs(REMOTE_IMAGE_TIMEOUT_SECS))
            .redirect(reqwest::redirect::Policy::limited(8))
            .build()
            .unwrap_or_else(|_| reqwest::blocking::Client::new())
    });

    let resp = client.get(url).header("Accept", "image/*").send().ok()?;

    if !resp.status().is_success() {
        return None;
    }

    let content_len = resp.content_length().unwrap_or(0);
    if content_len > REMOTE_IMAGE_MAX_BYTES as u64 {
        return None;
    }

    let mime = resp
        .headers()
        .get(CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("")
        .split(';')
        .next()
        .unwrap_or("")
        .trim()
        .to_string();

    let mut limited = resp.take((REMOTE_IMAGE_MAX_BYTES as u64) + 1);
    let mut bytes = Vec::new();
    if limited.read_to_end(&mut bytes).is_err() {
        return None;
    }
    if bytes.is_empty() || bytes.len() > REMOTE_IMAGE_MAX_BYTES {
        return None;
    }

    let ext = image_ext_from_mime(&mime)
        .or_else(|| image_ext_from_url(url))
        .or_else(|| image_ext_from_bytes(&bytes))?;

    Some((bytes, ext))
}

fn normalize_html_image_src_candidate(src: &str) -> Option<String> {
    let trimmed = src.trim();
    if trimmed.is_empty() {
        return None;
    }

    let normalized = if trimmed.starts_with("data:") {
        trimmed.to_string()
    } else {
        let first_candidate = trimmed
            .split(',')
            .next()
            .unwrap_or(trimmed)
            .split_whitespace()
            .next()
            .unwrap_or(trimmed)
            .trim();
        first_candidate.replace("&amp;", "&")
    };

    if normalized.is_empty()
        || normalized.starts_with("blob:")
        || normalized.starts_with("javascript:")
    {
        return None;
    }

    Some(normalized)
}

fn looks_like_gif_image_src(src: &str) -> bool {
    let lower = src.trim().to_ascii_lowercase();
    if lower.is_empty() {
        return false;
    }

    lower.starts_with("data:image/gif")
        || lower.contains(".gif")
        || lower.contains("format=gif")
        || lower.contains("fm=gif")
        || lower.contains("mime=image/gif")
        || lower.contains("image/gif")
}

fn resolve_local_image_src_path(src: &str) -> Option<std::path::PathBuf> {
    let is_local = src.starts_with("file://")
        || (src.len() > 2
            && src.chars().nth(1) == Some(':')
            && (src.chars().nth(2) == Some('\\') || src.chars().nth(2) == Some('/')));
    if !is_local {
        return None;
    }

    let path_str = if src.starts_with("file://") {
        let raw_path = src.trim_start_matches("file://");
        if raw_path.starts_with('/') && raw_path.chars().nth(2) == Some(':') {
            &raw_path[1..]
        } else {
            raw_path
        }
    } else {
        src
    };

    let decoded_path = decode(path_str)
        .map(|p| p.into_owned())
        .unwrap_or(path_str.to_string());
    let clean_path = decoded_path
        .split('?')
        .next()
        .unwrap_or(&decoded_path)
        .split('#')
        .next()
        .unwrap_or(&decoded_path);
    let path = std::path::Path::new(clean_path);
    if !path.exists() {
        return None;
    }

    Some(path.to_path_buf())
}

fn gif_data_url_from_bytes(bytes: &[u8]) -> Option<String> {
    let ext = image_ext_from_bytes(bytes).or_else(|| {
        if bytes.starts_with(b"GIF87a") || bytes.starts_with(b"GIF89a") {
            Some("gif")
        } else {
            None
        }
    })?;
    if ext != "gif" {
        return None;
    }

    let b64 = general_purpose::STANDARD.encode(bytes);
    Some(format!("data:{};base64,{}", image_mime_by_ext(ext), b64))
}

fn resolve_animated_image_src_to_data_url(src: &str) -> Option<String> {
    let value = src.trim();
    if value.starts_with("data:image/gif") {
        return Some(value.to_string());
    }

    if !looks_like_gif_image_src(value) {
        return None;
    }

    if let Some(path) = resolve_local_image_src_path(value) {
        let bytes = std::fs::read(&path).ok()?;
        return gif_data_url_from_bytes(&bytes);
    }

    if let Some(remote_url) = normalize_remote_img_url(value) {
        let (bytes, ext) = fetch_remote_image(&remote_url)?;
        if ext == "gif" {
            return gif_data_url_from_bytes(&bytes);
        }
    }

    None
}

pub fn extract_animated_image_data_url_from_text(text: &str) -> Option<String> {
    let candidate = normalize_html_image_src_candidate(text)?;
    resolve_animated_image_src_to_data_url(&candidate)
}

fn collapse_preview_whitespace(text: &str) -> String {
    static WHITESPACE_RE: OnceLock<Regex> = OnceLock::new();

    let normalized = text
        .replace("\r\n", "\n")
        .replace('\r', "\n")
        .replace('\n', " ");
    WHITESPACE_RE
        .get_or_init(|| Regex::new(r"\s+").unwrap())
        .replace_all(&normalized, " ")
        .trim()
        .to_string()
}

pub fn build_clipboard_text_fingerprint(
    content_type: &str,
    content: &str,
    _metadata: Option<&str>,
) -> String {
    match content_type {
        "text" | "code" | "url" => {
            collapse_preview_whitespace(&normalize_clipboard_plain_text(content))
        }
        _ => String::new(),
    }
}

fn collapse_line_whitespace(text: &str) -> String {
    static WHITESPACE_RE: OnceLock<Regex> = OnceLock::new();

    WHITESPACE_RE
        .get_or_init(|| Regex::new(r"[^\S\r\n]+").unwrap())
        .replace_all(text.trim(), " ")
        .trim()
        .to_string()
}

fn normalize_plain_text_layout(text: &str) -> String {
    let normalized = text.replace("\r\n", "\n").replace('\r', "\n");
    let mut lines = Vec::new();

    for raw_line in normalized.lines() {
        let line = collapse_line_whitespace(raw_line);
        if line.is_empty() {
            if !lines
                .last()
                .map(|last: &String| last.is_empty())
                .unwrap_or(false)
            {
                lines.push(String::new());
            }
        } else {
            lines.push(line);
        }
    }

    let start = lines
        .iter()
        .position(|line| !line.is_empty())
        .unwrap_or(lines.len());
    let end = lines
        .iter()
        .rposition(|line| !line.is_empty())
        .map(|idx| idx + 1)
        .unwrap_or(start);

    lines[start..end].join("\n")
}

pub fn looks_like_cf_html_header_text(text: &str) -> bool {
    let lower = text.to_ascii_lowercase();
    lower.contains("version:0.9")
        || (lower.contains("starthtml:") && lower.contains("startfragment:"))
}

pub fn normalize_clipboard_plain_text(text: &str) -> String {
    static INLINE_CF_HTML_HEADER_RE: OnceLock<Regex> = OnceLock::new();

    let normalized = text.replace("\r\n", "\n").replace('\r', "\n");
    if !looks_like_cf_html_header_text(&normalized) {
        return normalized;
    }

    // Aggressively strip header metadata lines if present
    let mut lines = normalized.lines();
    let mut cleaned_lines = Vec::new();
    let mut in_header = true;

    while let Some(line) = lines.next() {
        let trimmed = line.trim();
        if in_header {
            let lower = trimmed.to_lowercase();
            let is_header_key = lower.starts_with("version:")
                || lower.starts_with("starthtml:")
                || lower.starts_with("endhtml:")
                || lower.starts_with("startfragment:")
                || lower.starts_with("endfragment:")
                || lower.starts_with("sourceurl:");

            if is_header_key || trimmed.is_empty() {
                continue;
            }
            // First line that doesn't look like a header key ends the header
            in_header = false;
        }
        cleaned_lines.push(line);
    }

    let result = cleaned_lines.join("\n").trim().to_string();
    if !result.is_empty() && result != normalized {
        return result;
    }

    let stripped_inline = INLINE_CF_HTML_HEADER_RE
        .get_or_init(|| {
            Regex::new(
                r"(?is)\b(?:version:\s*[^\s]+|starthtml:\s*\d+|endhtml:\s*\d+|startfragment:\s*\d+|endfragment:\s*\d+|sourceurl:\s*\S+)",
            )
            .unwrap()
        })
        .replace_all(&normalized, " ");
    let inline_result = normalize_plain_text_layout(stripped_inline.as_ref())
        .trim()
        .to_string();

    if inline_result.is_empty() {
        return normalized;
    }

    inline_result
}

pub fn build_entry_preview(content_type: &str, content: &str, _metadata: Option<&str>) -> String {
    if content_type == "image" {
        return "[Image Content]".to_string();
    }

    let preview_text = normalize_plain_text_layout(&normalize_clipboard_plain_text(content));

    if preview_text.chars().count() > TEXT_PREVIEW_MAX_CHARS {
        let preview_text: String = preview_text
            .chars()
            .take(TEXT_PREVIEW_TRUNCATED_CHARS)
            .collect();
        format!("{}...", preview_text)
    } else {
        preview_text
    }
}

#[cfg(test)]
mod tests {
    use super::{
        app_cleanup_policy_matches, apply_cleanup_rules, build_entry_preview,
        extract_animated_image_data_url_from_text, normalize_clipboard_plain_text,
        parse_app_cleanup_policies, parse_cleanup_rules, AppCleanupPolicy,
    };
    #[test]
    fn extract_animated_image_data_url_from_text_accepts_direct_gif_data_url() {
        let gif_data_url =
            "data:image/gif;base64,R0lGODlhAQABAPAAAP///wAAACH5BAAAAAAALAAAAAABAAEAAAICRAEAOw==";

        let extracted = extract_animated_image_data_url_from_text(gif_data_url);

        assert_eq!(extracted.as_deref(), Some(gif_data_url));
    }

    #[test]
    fn normalize_clipboard_plain_text_strips_cf_html_header_prefix() {
        let text = "Version:0.9 StartHTML:0000000105 EndHTML:0000000829 StartFragment:0000000141 EndFragment:0000000793 ddd";

        let normalized = normalize_clipboard_plain_text(text);

        assert_eq!(normalized, "ddd");
    }

    #[test]
    fn text_preview_drops_cf_html_header_noise_for_plain_text_items() {
        let text = "Version:0.9 StartHTML:0000000105 EndHTML:0000000829 StartFragment:0000000141 EndFragment:0000000793 ddd";

        let preview = build_entry_preview("text", text, None);

        assert_eq!(preview, "ddd");
    }

    #[test]
    fn plain_text_preview_preserves_normalized_line_breaks() {
        let preview = build_entry_preview("text", "first  line\r\nsecond\tline\rthird", None);

        assert_eq!(preview, "first line\nsecond line\nthird");
    }

    #[test]
    fn code_and_url_previews_preserve_line_breaks() {
        assert_eq!(
            build_entry_preview("code", "const a = 1;\nconst b = 2;", None),
            "const a = 1;\nconst b = 2;"
        );
        assert_eq!(
            build_entry_preview("url", "https://example.com/a\nhttps://example.com/b", None),
            "https://example.com/a\nhttps://example.com/b"
        );
    }

    #[test]
    fn cleanup_rules_parse_and_apply_replacements() {
        let rules = parse_cleanup_rules(
            r"(?i)token\s*:\s*\S+ => token: [REDACTED]
\b1[3-9]\d{9}\b => [PHONE]",
        );

        let cleaned = apply_cleanup_rules("token: abc123 13812345678", &rules);

        assert_eq!(cleaned, "token: [REDACTED] [PHONE]");
    }

    #[test]
    fn app_cleanup_policy_parse_filters_disabled_or_unbound_items() {
        let policies = parse_app_cleanup_policies(
            r#"[
                {"id":"1","enabled":true,"appName":"WeChat","contentTypes":["text"]},
                {"id":"2","enabled":false,"appName":"Slack","contentTypes":["text"]},
                {"id":"3","enabled":true,"contentTypes":["text"]}
            ]"#,
        );

        assert_eq!(policies.len(), 1);
        assert_eq!(policies[0].id, "1");
    }

    #[test]
    fn app_cleanup_policy_match_prefers_path_and_respects_content_type() {
        let policy = AppCleanupPolicy {
            id: "1".to_string(),
            enabled: true,
            app_name: "WeChat".to_string(),
            app_path: "C:\\Program Files\\Tencent\\WeChat.exe".to_string(),
            action: "ignore".to_string(),
            content_types: vec!["text".to_string(), "url".to_string()],
            cleanup_rules: String::new(),
        };

        assert!(app_cleanup_policy_matches(
            &policy,
            "Different Name",
            Some("C:\\Program Files\\Tencent\\WeChat.exe"),
            "text",
        ));
        assert!(!app_cleanup_policy_matches(
            &policy,
            "WeChat",
            Some("C:\\Program Files\\Tencent\\WeChat.exe"),
            "image",
        ));
    }

    #[test]
    fn app_cleanup_policy_match_accepts_executable_name_variant() {
        let policy = AppCleanupPolicy {
            id: "1".to_string(),
            enabled: true,
            app_name: "Codex".to_string(),
            app_path: String::new(),
            action: "clean".to_string(),
            content_types: vec!["text".to_string()],
            cleanup_rules: String::new(),
        };

        assert!(app_cleanup_policy_matches(
            &policy,
            "Codex.exe",
            Some(
                "C:\\Program Files\\WindowsApps\\OpenAI.Codex_26.305.950.0_x64__2p2nqsd0c76g0\\app\\Codex.exe",
            ),
            "text",
        ));
    }

    #[test]
    fn app_cleanup_policy_match_accepts_windows_app_id_variant() {
        let policy = AppCleanupPolicy {
            id: "1".to_string(),
            enabled: true,
            app_name: "Codex".to_string(),
            app_path: "OpenAI.Codex_2p2nqsd0c76g0!App".to_string(),
            action: "clean".to_string(),
            content_types: vec!["text".to_string()],
            cleanup_rules: String::new(),
        };

        assert!(app_cleanup_policy_matches(
            &policy,
            "Codex.exe",
            Some(
                "C:\\Program Files\\WindowsApps\\OpenAI.Codex_26.305.950.0_x64__2p2nqsd0c76g0\\app\\Codex.exe",
            ),
            "text",
        ));
    }
}

pub fn detect_content_type(text: &str) -> String {
    let trimmed = text.trim();
    if trimmed.starts_with("www.")
        || trimmed.contains("://")
            && trimmed.split("://").next().map_or(false, |s| {
                !s.is_empty()
                    && s.chars()
                        .all(|c| c.is_ascii_alphanumeric() || c == '+' || c == '-' || c == '.')
            })
    {
        return "url".to_string();
    }

    let mut score = 0;
    let keywords = [
        "import ",
        "const ",
        "let ",
        "var ",
        "function ",
        "class ",
        "pub fn ",
        "impl ",
        "#include",
        "package ",
        "interface ",
        "namespace ",
        "void ",
        "return ",
        "if (",
        "for (",
        "while (",
        "=>",
    ];

    for k in keywords {
        if text.contains(k) {
            score += 1;
        }
    }

    if text.contains(";") {
        score += 1;
    }
    if text.contains("{") && text.contains("}") {
        score += 1;
    }
    if text.contains("</") && text.contains(">") {
        score += 2;
    }

    if score >= 2 {
        return "code".to_string();
    }

    if trimmed.starts_with("{")
        && trimmed.ends_with("}")
        && text.contains(":")
        && text.contains("\"")
    {
        return "code".to_string();
    }

    "text".to_string()
}

pub fn contains_sensitive_info(text: &str, kinds: &[String], custom_rules: &[String]) -> bool {
    static PHONE_RE: OnceLock<Regex> = OnceLock::new();
    static IDCARD_RE: OnceLock<Regex> = OnceLock::new();
    static EMAIL_RE: OnceLock<Regex> = OnceLock::new();
    static SECRET_RE: OnceLock<Regex> = OnceLock::new();

    static URL_RE: OnceLock<Regex> = OnceLock::new();

    if text.len() > 5000 || text.starts_with("data:") {
        return false;
    }

    let has_kind = |k: &str| kinds.iter().any(|t| t == k);

    if has_kind("url") {
        let re = URL_RE
            .get_or_init(|| Regex::new(r"(?i)(?:[a-zA-Z][a-zA-Z0-9+\-.]*://|www\.)\S+").unwrap());
        if re.is_match(text) {
            return true;
        }
    }
    if has_kind("phone") {
        let re = PHONE_RE.get_or_init(|| {
            Regex::new(r"(?:\+?86)?[-\s\(]*1[3-9]\d{1}[-\s\)]*\d{4}[-\s]*\d{4}").unwrap()
        });
        if re.is_match(text) {
            return true;
        }
    }
    if has_kind("idcard") {
        let re = IDCARD_RE.get_or_init(|| {
            Regex::new(
                r"\b[1-9]\d{5}[1-9]\d{3}((0\d)|(1[0-2]))(([0|1|2]\d)|3[0-1])\d{3}([0-9Xx])\b",
            )
            .unwrap()
        });
        if re.is_match(text) {
            return true;
        }
    }
    if has_kind("email") {
        let re = EMAIL_RE
            .get_or_init(|| Regex::new(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}").unwrap());
        if re.is_match(text) {
            return true;
        }
    }
    if has_kind("secret") {
        let re = SECRET_RE.get_or_init(|| Regex::new(r"(?ix)((?:sk|pk|ghp|gho|github_pat|AIza|AKIA|ya29)[-_][\w\-]{20,}|(?:password|secret|api[_-]?key|access[_-]?key|token|bearer)[\s:=]+[\w\-]{16,})").unwrap());
        if re.is_match(text) {
            return true;
        }
    }
    if has_kind("password") {
        if text.len() >= 8 && text.len() <= 64 && !text.contains(' ') && !text.contains('\n') {
            let has_upper = text.chars().any(|c| c.is_uppercase());
            let has_lower = text.chars().any(|c| c.is_lowercase());
            let has_digit = text.chars().any(|c| c.is_numeric());
            let has_special = text.chars().any(|c| !c.is_alphanumeric());
            if has_upper && has_lower && has_digit && has_special {
                return true;
            }
        }
    }

    for rule in custom_rules {
        if let Ok(re) = Regex::new(rule) {
            if re.is_match(text) {
                return true;
            }
        }
    }
    false
}

pub fn parse_cleanup_rules(raw_rules: &str) -> Vec<(Regex, String)> {
    raw_rules
        .lines()
        .map(str::trim)
        .filter(|line| !line.is_empty() && !line.starts_with('#'))
        .filter_map(|line| {
            let (pattern, replacement) = line.split_once("=>")?;
            let pattern = pattern.trim();
            if pattern.is_empty() {
                return None;
            }

            let replacement = replacement
                .trim()
                .replace(r"\n", "\n")
                .replace(r"\r", "\r")
                .replace(r"\t", "\t");

            Regex::new(pattern).ok().map(|regex| (regex, replacement))
        })
        .collect()
}

pub fn apply_cleanup_rules(text: &str, rules: &[(Regex, String)]) -> String {
    rules
        .iter()
        .fold(text.to_string(), |acc, (regex, replacement)| {
            regex.replace_all(&acc, replacement.as_str()).into_owned()
        })
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppCleanupPolicy {
    #[cfg_attr(not(test), allow(dead_code))]
    #[serde(default)]
    pub id: String,
    #[serde(default = "default_policy_enabled")]
    pub enabled: bool,
    #[serde(default)]
    pub app_name: String,
    #[serde(default)]
    pub app_path: String,
    #[serde(default = "default_policy_action")]
    pub action: String,
    #[serde(default = "default_policy_content_types")]
    pub content_types: Vec<String>,
    #[serde(default)]
    pub cleanup_rules: String,
}

fn default_policy_enabled() -> bool {
    true
}

fn default_policy_action() -> String {
    "clean".to_string()
}

fn default_policy_content_types() -> Vec<String> {
    vec![
        "text".to_string(),
        "code".to_string(),
        "url".to_string(),
        "image".to_string(),
        "file".to_string(),
        "video".to_string(),
    ]
}

fn normalize_executable_name(value: &str) -> Option<String> {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        return None;
    }

    let segment = trimmed.rsplit(['\\', '/']).next().unwrap_or(trimmed).trim();
    if segment.is_empty() {
        return None;
    }

    let lower = segment.to_ascii_lowercase();
    let normalized = lower.strip_suffix(".exe").unwrap_or(&lower).trim();
    if normalized.is_empty() {
        None
    } else {
        Some(normalized.to_string())
    }
}

fn executable_name_matches(left: &str, right: &str) -> bool {
    match (
        normalize_executable_name(left),
        normalize_executable_name(right),
    ) {
        (Some(left), Some(right)) => left == right,
        _ => false,
    }
}

fn app_id_matches_process_path(app_id: &str, process_path: &str) -> bool {
    let trimmed_app_id = app_id.trim();
    let trimmed_process_path = process_path.trim();
    if trimmed_app_id.is_empty() || trimmed_process_path.is_empty() || !trimmed_app_id.contains('!')
    {
        return false;
    }

    let package_family = trimmed_app_id.split('!').next().unwrap_or("").trim();
    let Some((package_name, publisher_id)) = package_family.rsplit_once('_') else {
        return false;
    };

    let normalized_path = trimmed_process_path.replace('/', "\\").to_ascii_lowercase();
    let package_name = package_name.trim().to_ascii_lowercase();
    let publisher_id = publisher_id.trim().to_ascii_lowercase();

    !package_name.is_empty()
        && !publisher_id.is_empty()
        && normalized_path.contains(&package_name)
        && normalized_path.contains(&publisher_id)
}

pub fn parse_app_cleanup_policies(raw_policies: &str) -> Vec<AppCleanupPolicy> {
    serde_json::from_str::<Vec<AppCleanupPolicy>>(raw_policies)
        .unwrap_or_default()
        .into_iter()
        .filter(|policy| {
            policy.enabled
                && (!policy.app_path.trim().is_empty() || !policy.app_name.trim().is_empty())
        })
        .collect()
}

pub fn app_cleanup_policy_matches(
    policy: &AppCleanupPolicy,
    source_app: &str,
    source_app_path: Option<&str>,
    content_type: &str,
) -> bool {
    let allowed = if policy.action.eq_ignore_ascii_case("ignore") {
        // If we are ignoring an app, we should be aggressive in matching unless types are specifically filtered
        policy.content_types.is_empty()
            || policy
                .content_types
                .iter()
                .any(|kind| kind.eq_ignore_ascii_case(content_type))
    } else {
        !policy.content_types.is_empty()
            && policy
                .content_types
                .iter()
                .any(|kind| kind.eq_ignore_ascii_case(content_type))
    };
    if !allowed {
        return false;
    }

    let source_app = source_app.trim();
    let source_app_path = source_app_path.unwrap_or("").trim();
    let policy_path = policy.app_path.trim();
    if !policy_path.is_empty() && !source_app_path.is_empty() {
        if policy_path.len() >= 2 && policy_path.starts_with('/') && policy_path.ends_with('/') {
            let re_str = &policy_path[1..policy_path.len() - 1];
            if let Ok(re) = Regex::new(re_str) {
                if re.is_match(source_app_path) {
                    return true;
                }
            }
        }
        if policy_path.eq_ignore_ascii_case(source_app_path) {
            return true;
        }
        if executable_name_matches(policy_path, source_app_path)
            || app_id_matches_process_path(policy_path, source_app_path)
        {
            return true;
        }
    }

    let policy_name = policy.app_name.trim();
    if !policy_name.is_empty() {
        if policy_name.len() >= 2 && policy_name.starts_with('/') && policy_name.ends_with('/') {
            let re_str = &policy_name[1..policy_name.len() - 1];
            if let Ok(re) = Regex::new(re_str) {
                if re.is_match(source_app) {
                    return true;
                }
            }
        }
        if policy_name.eq_ignore_ascii_case(source_app) {
            return true;
        }
        if executable_name_matches(policy_name, source_app)
            || executable_name_matches(policy_name, source_app_path)
        {
            return true;
        }
    }

    if !policy_path.is_empty()
        && !source_app.is_empty()
        && executable_name_matches(policy_path, source_app)
    {
        return true;
    }
    false
}

#[cfg(test)]
mod content_detection_tests {
    use super::*;

    mod detect_content_type_tests {
        use super::*;

        #[test]
        fn http_url() {
            assert_eq!(detect_content_type("http://example.com"), "url");
        }

        #[test]
        fn https_url() {
            assert_eq!(detect_content_type("https://example.com/path?q=1"), "url");
        }

        #[test]
        fn ftp_url() {
            assert_eq!(
                detect_content_type("ftp://files.example.com/doc.pdf"),
                "url"
            );
        }

        #[test]
        fn custom_protocol_url() {
            assert_eq!(detect_content_type("myapp+custom://open/page"), "url");
        }

        #[test]
        fn www_url() {
            assert_eq!(detect_content_type("www.example.com"), "url");
        }

        #[test]
        fn url_with_whitespace() {
            assert_eq!(detect_content_type("  https://example.com  "), "url");
        }

        #[test]
        fn plain_text_not_url() {
            assert_eq!(detect_content_type("hello world"), "text");
        }

        #[test]
        fn colon_slash_slash_in_plain_text_no_valid_scheme() {
            // "://foo" alone — the part before :// is empty
            assert_eq!(detect_content_type("://foo"), "text");
        }

        #[test]
        fn code_snippet() {
            assert_eq!(
                detect_content_type("const x = 1; function foo() {}"),
                "code"
            );
        }
    }

    mod contains_sensitive_info_tests {
        use super::*;

        fn kinds(list: &[&str]) -> Vec<String> {
            list.iter().map(|s| s.to_string()).collect()
        }

        #[test]
        fn detects_url() {
            assert!(contains_sensitive_info(
                "visit https://secret.internal/admin",
                &kinds(&["url"]),
                &[],
            ));
        }

        #[test]
        fn detects_ftp_url() {
            assert!(contains_sensitive_info(
                "ftp://files.company.com/secret.zip",
                &kinds(&["url"]),
                &[],
            ));
        }

        #[test]
        fn detects_www_url() {
            assert!(contains_sensitive_info(
                "visit www.example.com/admin",
                &kinds(&["url"]),
                &[],
            ));
        }

        #[test]
        fn no_url_kind_skips_url_check() {
            assert!(!contains_sensitive_info(
                "https://example.com",
                &kinds(&["phone"]),
                &[],
            ));
        }

        #[test]
        fn detects_phone() {
            assert!(contains_sensitive_info(
                "call me 13812345678",
                &kinds(&["phone"]),
                &[],
            ));
        }

        #[test]
        fn detects_email() {
            assert!(contains_sensitive_info(
                "send to user@example.com",
                &kinds(&["email"]),
                &[],
            ));
        }

        #[test]
        fn skips_data_uri() {
            assert!(!contains_sensitive_info(
                "data:image/png;base64,iVBOR...",
                &kinds(&["url", "phone", "email"]),
                &[],
            ));
        }

        #[test]
        fn skips_oversized_text() {
            let big = "a".repeat(5001);
            assert!(!contains_sensitive_info(&big, &kinds(&["phone"]), &[],));
        }

        #[test]
        fn custom_regex_rule() {
            assert!(contains_sensitive_info(
                "order-12345",
                &kinds(&[]),
                &["order-\\d+".to_string()],
            ));
        }
    }
}
