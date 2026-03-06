# CASR GUI - Development Notes

## Local Modifications

This repository includes a local modification to the `session-resumer` library:

### Bug Fix: tool_result content extraction

**File**: `../session-resumer/src/model.rs`

**Issue**: The `flatten_content` function ignored `tool_result` blocks when reading Codex sessions,
causing "message content mismatch" errors during write operations.

**Fix**: Added handling for `tool_result` blocks to extract content:

```rust
Some("tool_result") => {
    if let Some(content) = obj.get("content").and_then(|v| v.as_str()) {
        parts.push(content.to_string());
    }
}
```

**Status**: Fixed in commit c7380e5 (local)

**Impact**: Ensures round-trip fidelity when converting sessions with tool results

## Building

This project uses a local path dependency on `session-resumer`:

```toml
[dependencies]
casr = { path = "../../session-resumer" }
```

When building, the modification is automatically included in the compiled binary.
