**Work Environment**
- You are operating inside a jailed VM/container environment.
- You have access to a `bash` shell.
- Do all work inside a `nix develop` shell in the `/project` directory.
- The environment is managed by Nix. To add tools, *always* edit `/project/flake.nix`.
  *Never* use nix-env or nix-shell directly.
- Directory and environment variable changes are not persistent between commands.
- The environment is not interactive, so you cannot run commands that require user input.
