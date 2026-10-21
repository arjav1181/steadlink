#!/usr/bin/env python3
"""One-off codemod: wrap the given functions in `withOrg(ctx.orgId, ...)`.

Used while adding the organization scope to the data layer. Not part of the
build; kept so the change can be re-run or reviewed.
"""

import re
import sys

PATH = "packages/data/src/api.ts"

# The functions that read or write a table the row level security policies
# protect. Each one takes the context as its first argument, under one of
# these names.
FUNCTIONS = [
    "logActivity",
    "bumpCounter",
    "listQrTemplates",
    "createQrTemplate",
    "deleteQrTemplate",
    "getChannelMetrics",
    "listCampaigns",
    "createCampaign",
    "updateCampaign",
    "deleteCampaign",
    "listChannels",
    "listUtmPresets",
    "saveUtmPreset",
    "updateProfile",
    "getUsage",
    "listWebhooks",
    "createWebhook",
    "updateWebhook",
    "deleteWebhook",
    "verifyWebhook",
    "listWebhookDeliveries",
    "listActivity",
    "listBulkUploads",
    "getBulkUpload",
    "createBulkUpload",
    "getAiSettings",
    "saveAiSettings",
    "addDeeplink",
    "removeDeeplink",
    "replaceRoutingRules",
]


def find_body(text: str, name: str):
    """The (start, end) of the function body, and the name of the context argument."""
    match = re.search(rf"^(?:export )?async function {name}\(", text, re.M)
    if not match:
        raise SystemExit(f"not found: {name}")
    start = match.start()

    # The parameter list ends at the first ")" at depth zero.
    index = text.index("(", match.start())
    depth = 0
    while True:
        char = text[index]
        if char == "(":
            depth += 1
        elif char == ")":
            depth -= 1
            if depth == 0:
                break
        index += 1
    params = text[text.index("(", match.start()) + 1 : index]

    context = None
    for candidate in ("ctx", "scope"):
        if re.search(rf"\b{candidate}\s*:\s*Ctx\b", params):
            context = candidate
            break
    if context is None:
        raise SystemExit(f"{name}: no Ctx parameter")

    # The body starts at the first "{" after the parameters.
    brace = text.index("{", index)
    depth = 0
    cursor = brace
    while True:
        char = text[cursor]
        if char == "{":
            depth += 1
        elif char == "}":
            depth -= 1
            if depth == 0:
                break
        cursor += 1
    return start, brace, cursor, context


def main():
    with open(PATH, encoding="utf-8") as handle:
        text = handle.read()

    # Rewrite from the bottom up, so the offsets of the earlier functions
    # stay valid.
    for name in reversed(FUNCTIONS):
        start, brace, end, context = find_body(text, name)
        if "withOrg(" in text[start:end]:
            continue
        body = text[brace + 1 : end]
        indented = "\n".join(
            ("  " + line) if line.strip() else line for line in body.split("\n")
        )
        replacement = (
            "{\n  return withOrg("
            + context
            + ".orgId, async () => {"
            + indented.rstrip()
            + "\n  });\n}"
        )
        text = text[:brace] + replacement + text[end + 1 :]

    with open(PATH, "w", encoding="utf-8") as handle:
        handle.write(text)
    print(f"wrapped {len(FUNCTIONS)} functions")


if __name__ == "__main__":
    sys.exit(main())
