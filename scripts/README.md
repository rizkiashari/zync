# Scripts (local only)

All `*.sh` files in this directory are **gitignored**. Add them on your machine, for example:

- `deploy-server-to-vps.sh` — sync `server-chat/` to a VPS and run Docker Compose  
- `deploy-web-to-vps.sh` — build the client locally, rsync `dist/`, PM2 + `serve`  
- `deploy-vps-build-all.sh` — rsync monorepo, build API + web on the VPS  
- `vps-remote-build.sh` — helper invoked on the VPS by `deploy-vps-build-all.sh`  

Root `package.json` and `server-chat/package.json` expect these paths. Recover content from a teammate or an old commit if needed.
