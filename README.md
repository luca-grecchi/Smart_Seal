# Smart Seal

PoC tecnico hackathon per disambiguare quattro scenari di consegna tramite device fisico o simulatore:

- `VERDICT_A` - consegna pulita
- `VERDICT_B` - sospetto furto corriere
- `VERDICT_C` - sospetto porch piracy
- `VERDICT_D` - empty box fraud cliente

## Avvio rapido

```bash
cd backend
npm install
npm start
```

Dashboard:

```txt
http://localhost:3000
```

## Struttura

```txt
backend/    API, session store in memoria, OTP, verdict engine
dashboard/  dashboard e simulatore senza build step
demo/       runner CLI per scenari A/B/C/D
docs/       contratto API, state machine, checklist QA
firmware/   sketch Arduino e header di integrazione
```

## Workflow team

- P1 lavora in `firmware/`.
- P2 lavora in `backend/`.
- P3 lavora in `dashboard/`, `demo/` e `docs/test_checklist.md`.
- Il contratto API vive in `docs/api_contract.md`: evitare rename di endpoint, eventi e payload senza allineamento del team.

