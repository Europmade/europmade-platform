# EuropMade — lokale Windows startup & healthcheck

Voorkomt dat `localhost:9000` / `:3000` / `:3001` na een Windows-herstart handmatig opnieuw moeten worden opgestart.

## Vereisten

- Node.js ≥ 20, pnpm ≥ 9
- Docker Desktop (PostgreSQL via `docker-compose.yml`, container `europmade-postgres`)
- Bestaande env-bestanden (`apps/backend/.env`, `apps/web/.env.local`, `apps/admin/.env.local`)

## Handmatig starten

Vanuit de repository-root:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\dev-local\Start-EuropMade.ps1
```

Gedrag:

1. Wacht tot Docker Desktop klaar is
2. `docker compose up -d` indien PostgreSQL niet healthy is
3. Start alleen ontbrekende/ongezonde apps:
   - `pnpm --filter @europmade/backend dev` → `:9000`
   - `pnpm --filter @europmade/web dev` → `:3000`
   - `pnpm --filter @europmade/admin dev` → `:3001`
4. Wacht op HTTP-healthchecks (niet alleen open poorten)
5. Processen blijven draaien nadat het script eindigt (detached)

Gezonde processen worden hergebruikt. Vastgelopen EuropMade-processen op dezelfde poort kunnen herstart worden met:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\dev-local\Start-EuropMade.ps1 -Repair
```

## Healthcheck

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\dev-local\Test-EuropMadeHealth.ps1
```

Exitcode `0` = alles PASS, `1` = één of meer FAIL.

Veilig herstel van ongezonde services:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\dev-local\Test-EuropMadeHealth.ps1 -Repair
```

**Let op:** een HTTP 200 op `/login` is geen bewijs dat authenticatie werkt. Dit script rapporteert geen Seller-/Admin-loginresultaat.

## Logs

`logs/dev-local/` (lokaal, niet committen):

- `startup-YYYYMMDD.log` — start-/herstelacties
- `backend-*.out.log`, `web-*.out.log`, `admin-*.out.log` — app-output
- `pids.json` — laatste starter-PIDs

## Task Scheduler (optioneel, na toestemming)

1. **Preview (geen wijziging):**

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\dev-local\Install-EuropMadeStartupTask.ps1
```

2. Controleer de getoonde taaknaam, delay (standaard **5** minuten na logon voor Docker Desktop), gebruiker en scriptpad.
   De taak gebruikt `-FromScheduledTask`: een korte bootstrap start een **detached** worker, zodat Task Scheduler
   het proces niet afbreekt met `0xC000013A` (STATUS_CONTROL_C_EXIT) terwijl er op Docker wordt gewacht.

3. **Alleen na expliciete toestemming** installeren:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\dev-local\Install-EuropMadeStartupTask.ps1 -Install
```

4. Verwijderen:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\dev-local\Uninstall-EuropMadeStartupTask.ps1 -ConfirmRemove
```

Taaknaam: `EuropMade Local Dev Startup` — huidige gebruiker, least privilege, geen opgeslagen wachtwoorden.

## Na een Windows-herstart

| Situatie | Wat gebeurt er |
|---|---|
| Scheduled task geïnstalleerd | Na logon + delay (5 min) start de bootstrap; de worker verrijkt PATH, start Docker Desktop indien nodig (ook user-install onder `Local\\Programs\\DockerDesktop`), wacht tot 15 min, start apps |
| Taakresultaat `0xC000013A` | Console van de taak werd afgebroken — gebruik `-FromScheduledTask` |
| `worker-status.json` phase `docker-timeout` | Docker CLI/Desktop niet bereikbaar in de worker — zie `startup-*.log` |
| Task niet geïnstalleerd | Postgres kan via Docker `restart: unless-stopped` terugkomen; apps niet — voer `Start-EuropMade.ps1` handmatig uit |
| Docker Desktop nog niet klaar | Script wacht (timeout) en logt een duidelijke fout |

Handmatige actie die soms nodig blijft: Docker Desktop één keer starten/inloggen na een verse installatie of update.

## Controleren na een Windows-herstart

```powershell
# Taakstatus
Get-ScheduledTask -TaskName 'EuropMade Local Dev Startup' | Get-ScheduledTaskInfo |
  Select-Object LastRunTime, LastTaskResult, NextRunTime

# Hosts
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\dev-local\Test-EuropMadeHealth.ps1

# Logs
Get-Content .\logs\dev-local\startup-$(Get-Date -Format yyyyMMdd).log -Tail 40
```

Verwacht: `LastTaskResult = 0`, en healthcheck alle PASS. Cursor start **niet** via deze taak.
