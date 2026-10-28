# REA findings — 2026-10-29

Investigated official [repository](https://github.com/morluto/rea) and [installation guide](https://github.com/morluto/rea/blob/main/docs/installation.md) using web read tools. They describe local JavaScript/Electron module/import/source-map/route analysis; authorized browser page, script, network and screenshot inspection; native binary analysis using optional providers. Static analysis is distinct from runtime capture, which interacts with the target under the user's permissions.

Environment inventory: no REA-named MCP tools exposed in this session, no REA skill in the supplied catalog, and no `rea` command resolved on PATH. This does not prove there is no installation elsewhere. Current Node is 24.21.0; official repository currently requires at least 24.22.1 on the Node 24 line. No provider or REA installation was attempted.

REA adds little evidence for source we already own or screenshots. We used normal source inspection and PDF rendering. No Brilliant implementation was reverse-engineered. REA could later inspect our authorized built app or a user-supplied owned binary; it cannot infer private server logic from screenshots or authorize access to paid services.

## Read-only setup preview for a later approved installation
This is a proposed plan, not output from a setup run:
1. Use a compatible Node runtime and acquire the official pinned `rea-agents` package from a trusted directory outside the target repository. Review the resolved version and package integrity first.
2. Run `rea setup --client codex --skill=false --dry-run --json`. Official guide documents dry-run as read-only, status planned.
3. Review the reported Codex configuration destination, launcher path, environment, timeouts and backup paths. Anticipated registration is a `[mcp_servers.rea]` entry pointing to the resolved Node executable and REA entry script; exact paths must come from that future dry run. No invented paths should be applied.
4. Optional workflow instructions require their own reviewed destination. No Hopper/Ghidra/IDA installation is needed for static JavaScript or browser investigation.
5. Obtain approval before actual global configuration writes, apply only reviewed scope, and restart Codex as instructed by setup. MCP tools will not become available in this already-running session automatically.

Implementation proceeds independently. No global configuration, native engine, authentication bypass or third-party capture was used.
