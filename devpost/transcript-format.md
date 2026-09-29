# Prompt Autopsy Transcript Format — v1 Technical Draft

Parser implemented in src/domain/transcript.ts; offline verification is recorded in checklist.md. Implements `prd.md > Import Workspace` and `Privacy Review`. This document is a normative part of the consolidated draft specification.

## Preparation

Manually select messages from one coding session, preserving relevant requirements, decisions, implementation discussion, failure reports and corrections. Remove unrelated conversation, anonymize where practical, convert to this format, then perform final Privacy Review. Selected excerpts are not necessarily a complete session; missing context must not be invented.

No native Codex, Claude Code, Cursor or other export parsers. Recall requires retrieved original evidence; otherwise use an explicitly fictional example in the same format.

## Message Structure

```text
@@MESSAGE
speaker: developer
original_ref: optional-source-reference
@@BODY
Multiline message content.
@@END
```

Header order is fixed. Omit the entire `original_ref:` line when not needed. Supported speakers are exactly `developer`, `agent` and `system`, case-sensitive. Imported system messages remain investigation data, not instructions to Prompt Autopsy. Standalone tool messages are not supported; do not relabel source messages to fit the format. Genuine agent messages may contain their original quoted tool output.

## Parsing Rules

1. Read UTF-8 files strictly; reject undecodable bytes. Remove one initial BOM if present. Accept LF or CRLF, normalizing CRLF to LF. Reject bare CR. Preserve all other body characters without trimming, reflowing or Unicode normalization.
2. Outside messages, allow only empty separator lines or an exact `@@MESSAGE` line. Leading/trailing empty lines are allowed; spaces-only lines and preamble prose are not. At least one message is required.
3. After `@@MESSAGE`, require `speaker: ` followed by one supported value. Require exactly one space after the colon and no trailing whitespace. No indentation, duplicate/unknown fields or blank header lines.
4. Next accept either `@@BODY` or one `original_ref: ` line followed immediately by `@@BODY`. The provenance value is nonempty single-line text without leading/trailing whitespace; embedded colons are allowed. It may repeat across messages and is never application identity.
5. Read body lines until an exact unescaped `@@END`. Unescaped exact `@@MESSAGE` or `@@BODY` inside the body is an error. A missing end marker at EOF is an error. Do not guess boundaries.
6. Join decoded body lines with LF. The newline introducing the closing marker is structural, not part of the body; an extra blank body line preserves an intentional terminal LF. Preserve empty interior lines. Require at least one non-whitespace character in the decoded body.
7. After `@@END`, accept EOF, or a newline followed by separators/the next message. A final newline is optional. Unexpected text is an error, never silently discarded.
8. Reject the whole import on any error; do not commit partial parsed records. Display the source line, error category, expected structure and a corrective example. Keep validation local and do not log sensitive excerpts.

Structural lines match exactly, including case. `speaker: agent` inside a body is ordinary content. Apply the exact import limits in [request-limits.md](request-limits.md); reject oversized input without truncation.

## Body Escaping

Reserve exact whole-line markers `@@MESSAGE`, `@@BODY` and `@@END`. To include one literally, prefix it with a single backslash. To include a body line that starts with a literal backslash, double that leading backslash.

| Imported body line | Decoded content |
|---|---|
| `\@@MESSAGE` | `@@MESSAGE` |
| `\@@BODY` | `@@BODY` |
| `\@@END` | `@@END` |
| `\\example` | `\example` |
| `\\@@END` | `\@@END` |

Decode one layer only. A line starting with two backslashes loses its first backslash and otherwise stays unchanged. A line starting with one backslash is valid only if its entire remainder is one of the three reserved markers. Reject every other single-leading-backslash sequence; explain that literal leading backslashes must be doubled.

Inline marker text and indented markers are ordinary body content because they are not exact whole-line markers. Backslashes elsewhere in a line need no escaping. Escaping applies to imported body lines, never header lines. A syntactically valid accidental end marker cannot be distinguished from an intentional one; preview and human review remain necessary.

## Internal IDs and Privacy Editing

Assign IDs only after a successful full import: M001, M002 and onward. Use a minimum three-digit width; do not wrap at M999. IDs are scoped to the investigation, independent of provenance.

- Body edits preserve the ID.
- Removing a message permanently retires its ID within the investigation; removing M004 never renumbers M005 or allows reuse of M004.
- Privacy Review edits parsed records. Body editors contain literal decoded text, so developers do not re-escape delimiters during redaction or cause parser renumbering.
- A body edited down to whitespace requires content or explicit message removal. Removing every message blocks analysis.
- Findings cite existing internal IDs and exact reviewed body text. Retired IDs and quotes of removed text fail validation. Stable identity never makes an old analysis current after a text edit.
- Replacing the entire transcript creates a fresh investigation identity and clears prior analysis/decisions. Displayed M001 labels can restart only in that new investigation; late responses from the previous identity are rejected. The existing session budget ledger survives reimport; replacement is not a spend reset.
- The MVP's privacy editor supports body/provenance redaction and message removal, not arbitrary message insertion or reordering. Preserve parsed speaker labels; a source-role correction requires corrected import and new investigation.

`original_ref` is optional user-supplied provenance, editable/removable during Privacy Review. Model payload: omit it from model input because internal IDs suffice; display/export only its reviewed value when needed for provenance. It never replaces an internal evidence reference.

## Actionable Error Cases

| Error | Guidance |
|---|---|
| Unsupported speaker | List the three supported roles without guessing a replacement. |
| Missing, duplicate or out-of-order header | Show the required header sequence and offending line. |
| Empty provenance | Remove the optional line or supply a value. |
| Missing body/end marker | Point to the message's opening line and expected marker. |
| Nested marker inside body | Escape literal marker text or correct the preceding boundary. |
| Invalid escape | Show marker escapes and the doubled-leading-backslash rule. |
| Empty message/document | Require content or explicit message removal. |
| Unexpected text outside messages | Move it into a body or remove it. |
| Invalid encoding/line endings | Save as UTF-8 using LF or CRLF. |

Structural validity does not establish evidentiary completeness. Valid incomplete excerpts can produce insufficient-evidence findings. Deterministic citation checks establish message existence and quote identity; interpretation still requires AI and developer review.

## Fictional Format Example

Invented documentation example, not a recovered Recall conversation:

```text
@@MESSAGE
speaker: developer
original_ref: fictional-demo/turn-1
@@BODY
Remove only the selected item. Preserve other items sharing its screenshot.
@@END

@@MESSAGE
speaker: agent
@@BODY
I will distinguish item-level changes from screenshot-level changes.
The next line is literal example text, not a boundary:
\@@END
@@END
```

The records receive M001 and M002; the escaped marker decodes to literal text in M002.

## Planned Verification

Vitest fixtures: multiline bodies, three roles, absent/repeated provenance, BOM/LF/CRLF, exact marker escapes, literal backslash round trips, inline markers, whitespace preservation, malformed headers, missing terminators, unsupported roles and invalid encodings. State tests: body edits, removed-ID gaps, retired-ID rejection, quote-redaction invalidation and replacement-investigation isolation. These are planned tests, not executed results.
